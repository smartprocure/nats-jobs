import ms from 'ms'
import {
  ConnectionOptions,
  AckPolicy,
  connect,
  DeliverPolicy,
  DiscardPolicy,
  JsMsg,
  NatsConnection,
  ReplayPolicy,
  RetentionPolicy,
  StorageType,
} from 'nats'
import { nanos, defer, getNextBackoff, nanosToMs, repeater } from './util'
import _debug from 'debug'
import { Deferred, JobDef, StopFn, Events } from './types'
import _ from 'lodash/fp'
import EventEmitter from 'eventemitter3'

const debug = _debug('nats-jobs')

const streamDefaults = (def: JobDef) =>
  _.defaults(
    {
      name: def.stream,
      retention: RetentionPolicy.Workqueue,
      storage: StorageType.File,
      max_age: nanos('1w'),
      num_replicas: 1,
      subjects: [def.stream],
      discard: DiscardPolicy.Old,
      deny_delete: false,
      deny_purge: false,
    },
    def.streamConfig
  )

/**
 * Create the stream. By default we create a work queue with
 * file storage. The default subject is the name of the stream.
 */
const createStream = async (conn: NatsConnection, def: JobDef) => {
  const jsm = await conn.jetstreamManager()
  // Stream config
  const config = streamDefaults(def)
  debug('stream config %O', config)
  // Add stream
  return jsm.streams.add(config)
}

const defaultAckWait = nanos('10s')

const consumerDefaults = (def: JobDef) =>
  _.defaults(
    {
      durable_name: `${def.stream}Consumer`,
      max_deliver: def.numAttempts ?? 5,
      ack_policy: AckPolicy.Explicit,
      ack_wait: defaultAckWait,
      deliver_policy: DeliverPolicy.All,
      replay_policy: ReplayPolicy.Instant,
    },
    def.consumerConfig
  )

/**
 * Create a pull consumer on the stream. Require manual acks.
 * By default we don't filter subjects.
 */
const createConsumer = (conn: NatsConnection, def: JobDef) => {
  // Consumer config
  const config = consumerDefaults(def)
  debug('consumer config %O', config)
  const js = conn.jetstream()
  // Create a pull consumer
  return js.pullSubscribe(def.filterSubject || '', {
    stream: def.stream,
    mack: true,
    config,
  })
}

const extendAckTimeoutThresholdFactor = 0.8

const getDuration = (startTime: number) => new Date().getTime() - startTime

/**
 * Call `start` to begin processing jobs based on def. To
 * gracefully shutdown call `stop` method.
 */
export const jobProcessor = async (opts?: ConnectionOptions) => {
  // Connect to NATS
  const conn = await connect(opts)
  const js = conn.jetstream()
  const stopFns: StopFn[] = []
  const emitter = new EventEmitter<Events>()
  const emit = (event: Events, data: object) => {
    emitter.emit(event, { type: event, ...data })
  }

  const start = (def: JobDef) => {
    debug('job def %O', def)
    const abortController = new AbortController()
    let deferred: Deferred<void>
    // How often to pull down messages from the consumer
    const pullInterval = def.pullInterval ?? ms('30s')
    // Retry a failed message after a second by default
    const backoff = def.backoff ?? ms('1s')
    // Pull down 1 message by default
    const batch = def.batch ?? 1
    // Consumer config
    const consumerConfig = consumerDefaults(def)
    // Flag that indicates the stop function was called
    let stopping = false

    /**
     * Automatically extend the ack timeout by periodically telling NATS
     * we're working.
     */
    const extendAckTimeout = (msg: JsMsg) => {
      if (def.autoExtendAckTimeout) {
        const ackWait = consumerConfig.ack_wait
        const intervalMs = nanosToMs(ackWait) * extendAckTimeoutThresholdFactor
        return setInterval(() => {
          debug('working')
          emit('working', { ...getMetadata(msg), intervalMs })
          msg.working()
        }, intervalMs)
      }
    }

    const handleTimeout = (msg: JsMsg) => {
      const timeoutMs = def.timeoutMs
      if (timeoutMs) {
        return setTimeout(() => {
          debug('timeout')
          emit('timeout', { ...getMetadata(msg), timeoutMs })
          // Abort
          abortController.abort('timeout')
        }, timeoutMs)
      }
    }

    const getMetadata = (msg: JsMsg) => ({ msgInfo: msg.info, consumerConfig })

    const run = async () => {
      // Create stream
      // TODO: Maybe handle errors better
      // eslint-disable-next-line
      await createStream(conn, def).catch(() => {})
      // Create pull consumer
      const ps = await createConsumer(conn, def)
      // Pull messages from the consumer
      const puller = repeater(() => {
        ps.pull({ batch, expires: pullInterval - 500 })
      }, pullInterval)
      // Pull the next message(s)
      puller.start()
      // Consume messages
      for await (const msg of ps) {
        // Don't pull messages while processing message(s)
        puller.stop()
        const metadata = getMetadata(msg)
        debug('received %O', metadata)
        const startTime = new Date().getTime()
        deferred = defer()
        // Auto-extend ack timeout
        const extendAckTimer = extendAckTimeout(msg)
        // Handle timeout
        const timeoutTimeout = handleTimeout(msg)

        try {
          emit('start', metadata)
          // Process the message
          await def.perform(msg, { signal: abortController.signal, def, js })
          debug('completed')
          const durationMs = getDuration(startTime)
          emit('complete', { ...metadata, durationMs })
          // Ack message
          await msg.ackAck()
        } catch (e) {
          debug('error %O', e)
          const durationMs = getDuration(startTime)
          const backoffMs = getNextBackoff(backoff, msg)
          const attemptsExhausted =
            msg.info.redeliveryCount === consumerConfig.max_deliver
          emit('error', {
            ...metadata,
            attemptsExhausted,
            durationMs,
            backoffMs,
            error: e,
          })
          debug('next backoff ms %d', backoffMs)
          // Negative ack message with backoff
          msg.nak(backoffMs)
        } finally {
          // Clear timeout
          clearTimeout(timeoutTimeout)
          // Clear ack_wait timeout delay timer
          clearInterval(extendAckTimer)
          deferred.done()
        }
        // Don't process any more messages
        if (stopping) {
          return
        }
        // Pull the next message(s)
        puller.start()
      }
    }

    const stop = () => {
      debug('stop')
      emit('stop', { consumerConfig })
      // Set this to true so we don't process any more messages
      stopping = true
      // Send abort signal to perform
      abortController.abort('stop')
      // Wait for current message to finish processing
      return deferred?.promise
    }
    // Track all stop fns so we can shutdown with one call
    stopFns.push(stop)
    // Start processing messages
    run()

    return {
      /**
       * To be used in conjunction with SIGTERM and SIGINT.
       *
       * ```ts
       * const processor = await jobProcessor()
       * const stop = processor.start({})
       * const shutDown = async () => {
       *   await stop()
       *   process.exit(0)
       * }
       *
       * process.on('SIGTERM', shutDown)
       * process.on('SIGINT', shutDown)
       * ```
       */
      stop,
    }
  }

  const stop = async () => {
    // Call stop on all jobs
    await Promise.all(stopFns.map((stop) => stop()))
    // Close NATS connection
    await conn.close()
  }
  return {
    /**
     * Call perform for each message received on the stream.
     */
    start,
    /**
     * Call stop on all jobs and close the NATS connection.
     */
    stop,
    emitter,
  }
}
