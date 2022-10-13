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
  Nanos,
} from 'nats'
import { nanos, defer, getNextBackoff, nanosToMs } from './util'
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

const extendAckTimeoutThresholdFactor = 0.75
/**
 * Automatically extend the ack timeout by periodically telling NATS
 * we're working.
 */
const extendAckTimeout = (ackWait: Nanos, msg: JsMsg): NodeJS.Timer => {
  const intervalMs = nanosToMs(ackWait) * extendAckTimeoutThresholdFactor
  return setInterval(() => {
    debug('extend ack - wait: %d msg: %O', ackWait, msg.info)
    msg.working()
  }, intervalMs)
}

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
    const abortController = new AbortController()
    let timer: NodeJS.Timer
    let deferred: Deferred<void>

    const run = async () => {
      debug('job def %O', def)
      const pullInterval = def.pullInterval ?? ms('1s')
      // Retry a failed message after a second by default
      const backoff = def.backoff ?? ms('1s')
      // Pull down 10 messages by default
      const batch = def.batch ?? 10
      // Automatically extend the ack timeout by default
      const autoExtendAckTimeout = def.autoExtendAckTimeout ?? true
      // Create stream
      // TODO: Maybe handle errors better
      await createStream(conn, def).catch()
      // Create pull consumer
      const ps = await createConsumer(conn, def)
      // Consumer config
      const consumerConfig = consumerDefaults(def)
      const ackWait = consumerConfig.ack_wait
      // Pull messages from the consumer
      const pull = () => {
        ps.pull({ batch, expires: pullInterval })
      }
      // Do the initial pull
      pull()
      // Pull regularly
      timer = setInterval(pull, pullInterval)
      // Consume messages
      for await (const msg of ps) {
        const metadata = { msgInfo: msg.info, consumerConfig }
        debug('received %O', metadata)
        deferred = defer()
        // Auto-extend ack timeout
        const extendAckTimer =
          autoExtendAckTimeout && extendAckTimeout(ackWait, msg)
        try {
          emit('start', metadata)
          // Process the message
          await def.perform(msg, { signal: abortController.signal, def, js })
          debug('completed')
          emit('complete', metadata)
          // Ack message
          await msg.ackAck()
        } catch (e) {
          debug('error %O', e)
          const backoffMs = getNextBackoff(backoff, msg)
          emit('error', { ...metadata, backoffMs, error: e })
          debug('next backoff ms %d', backoffMs)
          // Negative ack message with backoff
          msg.nak(backoffMs)
        } finally {
          // Clear auto-extend timer
          if (extendAckTimer) {
            clearInterval(extendAckTimer)
          }
          deferred.done()
        }
        // Don't process any more messages if stopping
        if (abortController.signal.aborted) {
          return
        }
      }
    }

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
    const stop = () => {
      // Send abort signal to perform
      abortController.abort()
      // Don't pull any more messages
      clearInterval(timer)
      // Wait for current message to finish processing
      return deferred?.promise
    }
    // Track all stop fns so we can shutdown with one call
    stopFns.push(stop)
    // Start processing messages
    run()

    return { stop }
  }

  const stop = async () => {
    await Promise.all(stopFns.map((stop) => stop()))
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
