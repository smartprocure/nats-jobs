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
import ms from 'ms'
import { JsMsg } from 'nats'
import { setTimeout } from 'node:timers/promises'
import { jobProcessor } from '../src/jobProcessor'
import { JobDef } from '../src/types'
import { expBackoff } from '../src/util'

const def: JobDef = {
  stream: 'ORDERS',
  backoff: expBackoff(1000),
  async perform(msg: JsMsg) {
    console.log(`Started ${msg.info.streamSequence}`)
    console.log(msg.data.toString())
    // Simulate work
    await setTimeout(ms('10s'))
    console.log(`Completed ${msg.info.streamSequence}`)
  },
  expectedMs: ms('12s'),
}
const run = async () => {
  const processor = await jobProcessor()
  processor.emitter.on('start', console.info)
  processor.emitter.on('stop', console.info)
  processor.emitter.on('receive', console.info)
  processor.emitter.on('complete', console.info)
  processor.emitter.on('error', console.error)
  processor.emitter.on('noAck', console.warn)
  // Start processing messages
  processor.start(def)
  // Gracefully handle signals
  const shutDown = async () => {
    await processor.stop()
  }
  process.on('SIGTERM', shutDown)
  process.on('SIGINT', shutDown)
}

run()
