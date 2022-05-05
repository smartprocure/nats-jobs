/*
 * Demonstrates how to schedule a job for later processing.
 *
 * Requires NATS and Redis to be running.
 */
import { JsMsg, StringCodec } from 'nats'
import { setTimeout } from 'node:timers/promises'
import ms from 'ms'
import jobProcessor from '../src/jobProcessor'
import jobScheduler from '../src/jobScheduler'

const def = {
  stream: 'ORDERS',
  async perform(msg: JsMsg) {
    console.log('Processing: %s', new Date())
  },
}
const run = async () => {
  const sc = StringCodec()
  const scheduler = await jobScheduler()
  // Publish delayed messages
  scheduler.publishDelayed('ORDERS')
  console.log('Scheduling: %s', new Date())
  // Schedule for the future
  await scheduler.scheduleDelayed({
    scheduleFor: ms('10s'),
    subject: 'ORDERS',
    data: sc.encode('some data'),
  })
  const processor = await jobProcessor()
  // Start processing messages
  processor.start(def)
}

run()
