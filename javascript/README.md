# NATS Jobs

Background job processing using [NATS](https://nats.io/) JetStream for distributing
work.

See examples directory for more examples.

## Companion libraries

* [ha-job-scheduler](https://www.npmjs.com/package/ha-job-scheduler)
* [topology-runner](https://www.npmjs.com/package/topology-runner)
* [nats-topology-runner](https://www.npmjs.com/package/nats-topology-runner)

## Usage

This library uses [debug](https://www.npmjs.com/package/debug). To enable:

```
DEBUG=nats-jobs node myfile.js
```

[msgpackr](https://www.npmjs.com/package/msgpackr) is the recommended way
to encode complex data structures since it's fast, efficient, and can handle
serializing and unserializing dates.

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
  // Gracefully handle shutdown
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

### Testing

Run the following in the `/docker` directory to start up NATS.

```
docker compose up
```
