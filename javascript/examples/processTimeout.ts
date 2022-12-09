/*
 * Demonstrates perform timeout using the `performTimeout` option on JobDef.
 *
 * To Test:
 *
 * (1) Run script: npx ts-node examples/processTimeout.ts
 * (2) Publish a message: nats pub ORDERS someText
 * (3) Wait one second to see the message be rejected with a timeout error.
 *
 * Requires NATS to be running.
 */
import { JsMsg } from 'nats'
import { setTimeout } from 'node:timers/promises'
import { jobProcessor } from '../src/jobProcessor'

const def = {
  stream: 'ORDERS',
  async perform(msg: JsMsg) {
    console.log(`Started ${msg.info.streamSequence}`)
    await setTimeout(5000)
    console.log(`Completed ${msg.info.streamSequence}`)
  },
  performTimeout: 1000,
  numAttempts: 1,
}
const run = async () => {
  const processor = await jobProcessor()
  // Start processing messages
  const ordersJob = processor.start(def)
  processor.emitter.on('start', console.info)
  processor.emitter.on('complete', console.info)
  processor.emitter.on('error', console.error)

  // Gracefully handle signals
  const shutDown = async () => {
    await ordersJob.stop()
    process.exit(0)
  }
  process.on('SIGTERM', shutDown)
  process.on('SIGINT', shutDown)
}

run()
