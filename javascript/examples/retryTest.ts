/*
 * Demonstrates a job that continually fails, retries, and eventually
 * reaches the max_deliver count (5 by default).
 *
 * To Test:
 *
 * (1) Run script: npx ts-node examples/retryTest.ts
 * (2) Publish multiple messages: nats pub ORDERS.US someText
 *
 * Requires NATS to be running.
 */
import ms from 'ms'
import { setTimeout } from 'node:timers/promises'
import { jobProcessor } from '../src/jobProcessor'
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
  async perform() {
    // Simulate work
    await setTimeout(ms('5s'))
    throw 'fail'
  },
}

const run = async () => {
  const processor = await jobProcessor()
  processor.emitter.on('receive', console.info)
  processor.emitter.on('complete', console.info)
  processor.emitter.on('error', console.error)
  processor.start(def)
}

run()
