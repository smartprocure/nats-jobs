/*
 * Demonstrates how to schedule jobs where multiple schedulers
 * will be attempting to schedule the same thing at the same time.
 *
 * To Test:
 *
 * Run multiple instances of the script:
 * npx ts-node examples/schedulingWithRedis.ts
 * You should only see one pid for a given date.
 *
 * Requires NATS and Redis to be running.
 */
import { StringCodec } from 'nats'
import jobScheduler from '../src/jobScheduler'
const sc = StringCodec()

const run = async () => {
  const scheduler = await jobScheduler()
  scheduler.scheduleRecurring({
    id: 'ordersEvery5s',
    rule: '*/5 * * * * *',
    subject: 'ORDERS.US',
    data: (date: Date) => sc.encode(`${date} : ${process.pid}`),
  })
}

run()
