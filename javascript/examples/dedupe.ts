/*
 * Demonstrates how to dedupe a stream over a window of time.
 *
 * To Test:
 *
 * (1) Run script: npx ts-node examples/dedupe.ts
 *
 * You should see records 1, 2, 3, 1, 2, 3 processed.
 *
 * Requires NATS to be running.
 */
import { connect, JSONCodec, JsMsg } from 'nats'
import { setTimeout } from 'node:timers/promises'
import ms from 'ms'
import jobProcessor from '../src/jobProcessor'
import { JobDef } from '../src/types'
import { nanos } from '../src/util'

const jc = JSONCodec()

const def: JobDef = {
  stream: 'deduped',
  streamConfig: {
    // Drop duplicates published within window based on Nats-Msg-Id header
    duplicate_window: nanos('20s'),
  },
  async perform(msg: JsMsg) {
    const msgId = msg.headers?.get('Nats-Msg-Id')
    console.log('Started %s', msgId)
    console.log('Data %O', jc.decode(msg.data))
    // Simulate some work
    await setTimeout(ms('1s'))
    console.log('Completed %s', msgId)
  },
}

const publishMessages = async () => {
  const connection = await connect()
  const js = connection.jetstream()
  const records = [
    { id: 1 },
    { id: 1 },
    { id: 2 },
    { id: 3 },
    { id: 2 },
    { id: 3 },
    { id: 1 },
    { id: 2 },
    { id: 3 },
    { id: 2 },
  ]
  for (const record of records) {
    js.publish('deduped', jc.encode(record), {
      msgID: record.id.toString(),
    })
    await setTimeout(ms('5s'))
  }
}

const run = async () => {
  // Wait a second for the stream to be created below, then publish messages
  setTimeout(ms('1s')).then(publishMessages)
  // Process messages
  const processor = await jobProcessor()
  await processor.start(def)
}

run()
