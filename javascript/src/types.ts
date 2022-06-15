import {
  ConsumerConfig,
  JsMsg,
  StreamConfig,
  JetStreamClient,
} from 'nats'

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
  perform(msg: JsMsg, context: PerformOpts): Promise<void>
}

export interface Deferred<A> {
  done: (value: A) => void
  promise: Promise<A>
}

export type StopFn = () => Promise<void>
