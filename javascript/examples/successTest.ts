/*
 * Demonstrates a successful job and how to gracefully shut down
 * without interrupting a short-lived job.
 *
 * Requires NATS to be running.
 */
import { JsMsg } from 'nats'
import { setTimeout } from 'node:timers/promises'
import jobProcessor from '../src/jobProcessor'

const def = {
  stream: 'ORDERS',
  backoff: [1000, 2000, 4000, 8000],
  async perform(msg: JsMsg, signal: AbortSignal) {
    console.log(`Started ${msg.info.streamSequence}`)
    console.log(msg.data.toString())
    await setTimeout(5000)
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
