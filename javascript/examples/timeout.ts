/*
 * Demonstrates perform timeout using the `timeout` option on JobDef.
 *
 * To Test:
 *
 * (1) Run script: npx ts-node examples/timeout.ts
 * (2) Publish a message: nats pub ORDERS someText
 * (3) Wait eight seconds before the process is exited due to a timeout.
 * Alternatively, send SIGINT and notice how proccessing of the message
 * completes despite the timeout occurring.
 *
 * Requires NATS to be running.
 */
import ms from 'ms'
import { JsMsg } from 'nats'
import { setTimeout } from 'node:timers/promises'
import { jobProcessor } from '../src/jobProcessor'
import { nanos } from '../src/util'
import { Context, JobDef } from '../src/types'

const def: JobDef = {
  stream: 'ORDERS',
  async perform(msg: JsMsg, { signal }: Context) {
    signal.onabort = () => {
      console.log('Aborted:', signal.reason)
      // Exit if a timeout occurred
      if (signal.reason === 'timeout') {
        process.exit(1)
      }
    }
    console.log(`Started ${msg.info.streamSequence}`)
    // Simulate work
    await setTimeout(ms('10s'))
    console.log(`Completed ${msg.info.streamSequence}`)
  },
  timeoutMs: ms('8s'),
  numAttempts: 1,
  autoExtendAckTimeout: true,
  consumerConfig: { ack_wait: nanos('5s') },
}
const run = async () => {
  const processor = await jobProcessor()
  // Start processing messages
  processor.start(def)
  processor.emitter.on('start', console.info)
  processor.emitter.on('receive', console.info)
  processor.emitter.on('complete', console.info)
  processor.emitter.on('timeout', console.info)
  processor.emitter.on('error', console.error)
  processor.emitter.on('stop', console.info)

  // Gracefully handle signals
  const shutDown = async () => {
    await processor.stop()
  }
  process.on('SIGTERM', shutDown)
  process.on('SIGINT', shutDown)
}

run()
