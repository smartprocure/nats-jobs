import {
  ConnectionOptions,
  ConsumerConfig,
  JsMsg,
  StreamConfig,
  JetStreamClient,
} from 'nats'
import { RedisOptions } from 'ioredis'
import {
  RecurrenceRule,
  RecurrenceSpecDateRange,
  RecurrenceSpecObjLit,
} from 'node-schedule'

export interface PerformOpts {
  signal: AbortSignal
  def: JobDef
  js: JetStreamClient
}

export interface JobDef {
  stream: string
  streamConfig?: Partial<StreamConfig>
  consumerConfig?: Partial<ConsumerConfig>
  filterSubject?: string
  pullInterval?: number
  batch?: number
  backoff?: number | number[]
  numAttempts?: number
  autoExtendAckTimeout?: boolean
  perform(msg: JsMsg, opts: PerformOpts): Promise<void>
}

export type Rule =
  | RecurrenceRule
  | RecurrenceSpecDateRange
  | RecurrenceSpecObjLit
  | Date
  | string
  | number

export interface Recurring {
  id: string
  rule: Rule
  subject: string
  data: Uint8Array | ((date: Date) => Uint8Array)
}

export interface Delayed {
  scheduleFor: number | Date
  subject: string
  data: Uint8Array
}

export interface RedisOpts {
  redisOpts: RedisOptions
}

export interface NatsOpts {
  natsOpts: ConnectionOptions
}

export interface Deferred<A> {
  done: (value: A) => void
  promise: Promise<A>
}
