/*
 * Demonstrates a successful job and how to gracefully shut down
 * without interrupting a short-lived job.
 *
 * To Test:
 *
 * (1) Run script: npx ts-node examples/successTest.ts
 * (2) Publish multiple messages: nats pub ORDERS someText
 * (3) Crl-C the script in the middle of processing the messages.
 *
 * Requires NATS to be running.
 */
import { JsMsg } from 'nats'
import { setTimeout } from 'node:timers/promises'
import { jobProcessor } from '../src/jobProcessor'
import { expBackoff } from '../src/util'

const def = {
  stream: 'ORDERS',
  backoff: expBackoff(1000),
  async perform(msg: JsMsg) {
    console.log(`Started ${msg.info.streamSequence}`)
    console.log(msg.data.toString())
    // Simulate work
    await setTimeout(5000)
    console.log(`Completed ${msg.info.streamSequence}`)
  },
}
const run = async () => {
  const processor = await jobProcessor()
  processor.emitter.on('start', console.info)
  processor.emitter.on('complete', console.info)
  processor.emitter.on('error', console.error)
  // Start processing messages
  const ordersJob = processor.start(def)
  // Gracefully handle signals
  const shutDown = async () => {
    await ordersJob.stop()
    process.exit(0)
  }
  process.on('SIGTERM', shutDown)
  process.on('SIGINT', shutDown)
}

run()
