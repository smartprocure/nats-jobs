/*
 * Demonstrates a job that continually fails, retries, and eventually
 * reaches the max_deliver count (5 by default).
 *
 * Requires NATS to be running.
 */
import ms from 'ms'
import { JsMsg } from 'nats'
import jobProcessor from '../src/jobProcessor'
import { expBackoff } from '../src/util'

const def = {
  // Stream
  stream: 'ORDERS',
  streamConfig: {
    subjects: ['ORDERS.*'],
  },
  // Consumer
  filterSubject: 'ORDERS.US',
  consumerConfig: {
    durable_name: 'usOrders',
  },
  // Retry delays
  backoff: expBackoff(ms('1s')),
  // Process message
  async perform(msg: JsMsg) {
    console.log(msg.info)
    throw 'fail'
  },
}

const run = async () => {
  const processor = await jobProcessor()
  processor.start(def)
}

run()
