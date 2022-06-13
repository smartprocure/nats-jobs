# NATS Jobs

Background job processing using [NATS](https://nats.io/) JetStream for distributing
work.

See examples directory for more examples.

## Companion libraries

- [ha-job-scheduler](https://www.npmjs.com/package/ha-job-scheduler)
- [topology-runner](https://www.npmjs.com/package/topology-runner)
- [nats-topology-runner](https://www.npmjs.com/package/nats-topology-runner)

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

const processor = await jobProcessor()
const myJob = processor.start(jobDef)
// Gracefully handle shutdown
const shutDown = async () => {
  await myJob.stop()
  process.exit(0)
}
process.on('SIGTERM', shutDown)
process.on('SIGINT', shutDown)
```

To gracefully shutdown mutliple jobs and close the NATS connection call
`stop` from the object returned by `jobProcessor`.

```typescript
const processor = await jobProcessor()
const jobs = [
  processor.start(jobDef1),
  processor.start(jobDef2),
  processor.start(jobDef3),
]
const shutDown = async () => {
  // Shuts down jobs 1, 2, and 3 and closes the NATS connection
  await processor.stop()
  process.exit(0)
}

process.on('SIGTERM', shutDown)
process.on('SIGINT', shutDown)
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
