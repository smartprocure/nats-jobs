/*
 * Demonstrates how to stop an iterative job using the abort signal.
 *
 * To Test:
 *
 * (1) Run script: npx ts-node examples/abortSignal.ts
 * (2) Publish a message: nats pub ORDERS someText
 * (3) Crl-C the script in the middle of the 1-5 log messages.
 *
 * Requires NATS to be running.
 */
import { JsMsg } from 'nats'
import { setTimeout } from 'node:timers/promises'
import jobProcessor from '../src/jobProcessor'

const def = {
  stream: 'ORDERS',
  async perform(msg: JsMsg, signal: AbortSignal) {
    console.log(`Started ${msg.info.streamSequence}`)
    for (let i = 0; i < 5; i++) {
      await setTimeout(1000)
      console.log(`Iteration ${i + 1} of 5`)
      if (signal.aborted) {
        return
      }
    }
    console.log(`Completed ${msg.info.streamSequence}`)
  },
}
const run = async () => {
  const processor = await jobProcessor()
  // Gracefully handle signals
  const shutDown = async () => {
    await processor.stop()
    process.exit(0)
  }
  process.on('SIGTERM', shutDown)
  process.on('SIGINT', shutDown)
  // Start processing messages
  processor.start(def)
}

run()
