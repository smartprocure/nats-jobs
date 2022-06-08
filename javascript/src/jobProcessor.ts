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
import { nanos, defer } from './util'
import _debug from 'debug'
import { Deferred, JobDef } from './types'

const debug = _debug('nats-jobs')

/**
 * Get the next backoff based on the redelivery count. If given
 * an array and no item exists for the attempt number use the last
 * backoff in the array.
 */
const getNextBackoff = (backoff: number | number[], msg: JsMsg) => {
  if (Array.isArray(backoff)) {
    return backoff[msg.info.redeliveryCount - 1] || backoff.at(-1)
  }
  return backoff
}

const createStream = async (conn: NatsConnection, def: JobDef) => {
  const jsm = await conn.jetstreamManager()
  // Stream config
  const config = {
    name: def.stream,
    retention: RetentionPolicy.Workqueue,
    storage: StorageType.File,
    max_age: nanos('1w'),
    num_replicas: 1,
    subjects: [def.stream],
    discard: DiscardPolicy.Old,
    deny_delete: false,
    deny_purge: false,
    ...def.streamConfig
  }
  debug('stream config %O', config)
  // Add stream
  return jsm.streams.add(config)
}

const createConsumer = (conn: NatsConnection, def: JobDef) => {
  // Consumer config
  const config = {
    durable_name: `${def.stream}Consumer`,
    max_deliver: def.numAttempts ?? 5,
    ack_policy: AckPolicy.Explicit,
    ack_wait: nanos('10s'),
    deliver_policy: DeliverPolicy.All,
    replay_policy: ReplayPolicy.Instant,
    ...def.consumerConfig
  }
  debug('consumer config %O', config)
  const js = conn.jetstream()
  // Create a pull consumer
  return js.pullSubscribe(def.filterSubject || '', {
    stream: def.stream,
    mack: true,
    config,
  })
}

export const jobProcessor = async (opts?: ConnectionOptions) => {
  const conn = await connect(opts)
  const js = conn.jetstream()
  let timer: NodeJS.Timer
  let deferred: Deferred<void>
  const abortController = new AbortController()

  /**
   * Start processing jobs based on def.
   * To gracefully shutdown see stop method.
   */
  const start = async (def: JobDef) => {
    debug('job def %O', def)
    const pullInterval = def.pullInterval ?? ms('1s')
    const backoff = def.backoff ?? ms('1s')
    const batch = def.batch ?? 10
    // Create stream
    // TODO: Maybe handle errors better
    await createStream(conn, def).catch()
    // Create pull consumer
    const ps = await createConsumer(conn, def)
    // Pull messages from the consumer
    const run = () => {
      ps.pull({ batch, expires: pullInterval })
    }
    // Do the initial pull
    run()
    // Pull regularly
    timer = setInterval(run, pullInterval)
    // Consume messages
    for await (const msg of ps) {
      debug('received', msg.info)
      deferred = defer()
      try {
        await def.perform(msg, { signal: abortController.signal, def, js })
        debug('completed')
        // Ack message
        await msg.ackAck()
      } catch (e) {
        debug('failed', e)
        const backoffMs = getNextBackoff(backoff, msg)
        debug('next backoff ms', backoffMs)
        // Negative ack message with backoff
        msg.nak(backoffMs)
      } finally {
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
   * const shutDown = async () => {
   *   await processor.stop()
   *   process.exit(0)
   * }
   * process.on('SIGTERM', shutDown)
   * process.on('SIGINT', shutDown)
   * ```
   */
  const stop = () => {
    abortController.abort()
    clearInterval(timer)
    return deferred?.promise
  }
  return { start, stop, js }
}
