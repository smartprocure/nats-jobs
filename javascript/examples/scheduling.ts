/*
 * Demonstrates how the dupe window option for streams cannot
 * be counted on if multiple schedulers are attempting to publish
 * the same message at the exact same time in two separate processes.
 * You should see the same date with different pids if run long enough.
 *
 * Requires NATS to be running.
 */
import { connect, StringCodec } from 'nats'
import schedule from 'node-schedule'

const run = async () => {
  const connection = await connect()
  const js = connection.jetstream()
  const sc = StringCodec()
  let counter = 1

  schedule.scheduleJob('*/5 * * * * *', (date) => {
    console.log(`(${counter++}) Scheduling ${date}`)
    const msgID = date.getTime().toString()
    js.publish('ORDERS.job', sc.encode(`${date} ${process.pid}`), { msgID })
  })
}

run()
