/*
 * Demonstrates how to process only one resource at a time
 * when multiple clients are pulling from the same consumer.
 *
 * To Test:
 *
 * (1) Run two or more instances of the script:
 * npx ts-node examples/exclusiveLock.ts
 * (2) Publish multiple messages with the same value:
 * nats pub ORDERS 10
 * nats pub ORDERS 11
 * nats pub ORDERS 11
 * nats pub ORDERS 10
 *
 * Requires NATS and Redis to be running.
 */
import { JsMsg, StringCodec } from 'nats'
import Redis from 'ioredis'
import Redlock from 'redlock'
import { setTimeout } from 'node:timers/promises'
import ms from 'ms'
import jobProcessor from '../src/jobProcessor'

const sc = StringCodec()
const redis = new Redis()
const redlock = new Redlock([redis])

const def = {
  stream: 'ORDERS',
  numAttempts: 3,
  async perform(msg: JsMsg) {
    const id = msg.data.toString()
    // Lock resource where a stream that could contain duplicates that
    // need to be processed in a serialized manner.
    const resources = [`mySite:${id}`]
    const lockDuration = ms('10s')
    // Attempt to run some code
    await redlock.using(resources, lockDuration, async (signal) => {
      console.log('LOCK OBTAINED')
      const data = sc.decode(msg.data)
      for (let i = 0; i < 5; i++) {
        // Indicate we're still working
        msg.working()
        // Simulate some work
        await setTimeout(ms('1s'))
        console.log(i, data)
        // Make sure any attempted lock extension has not failed
        if (signal.aborted) {
          throw signal.error
        }
      }
    })
  },
}

const run = async () => {
  const processor = await jobProcessor()
  processor.start(def)
}

run()
