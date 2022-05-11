# nats-jobs

Background job processing using [NATS](https://nats.io/) JetStream for distributing
work. Scheduling is handled by [node-schedule](https://www.npmjs.com/package/node-schedule)
and [Redis](https://redis.com/).

Written in TypeScript.

See examples directory for more examples.

## Usage

### Processing jobs

```typescript
import { JsMsg } from 'nats'
import { setTimeout } from 'node:timers/promises'
import { expBackoff, jobProcessor } from 'nats-jobs'

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
```

Publish via NATS

```
nats pub ORDERS someText
```

### Scheduling

```typescript
import { StringCodec } from 'nats'
import { jobScheduler } from 'nats-jobs'
const sc = StringCodec()

const run = async () => {
  const scheduler = await jobScheduler()
  scheduler.scheduleRecurring({
    id: 'ordersEvery5s',
    rule: '*/5 * * * * *',
    subject: 'ORDERS',
    data: (date: Date) => sc.encode(`${date} : ${process.pid}`),
  })
}

run()
```
