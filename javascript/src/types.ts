import { ConsumerConfig, JsMsg, StreamConfig, JetStreamClient } from 'nats'

export interface Context {
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
  perform(msg: JsMsg, context: Context): Promise<void>
  performTimeout?: number
}

export interface Deferred<A> {
  done: (value: A) => void
  promise: Promise<A>
}

export type StopFn = () => Promise<void>

export interface BackoffOptions {
  numEntries?: number
  repeatAfter?: number
}

export type Events = 'start' | 'complete' | 'error'

export class TimeoutError extends Error {
  private timeout: number
  private metadata: Record<string, unknown>
  constructor(msg: string, timeout: number, metadata: Record<string, unknown>) {
    super(msg)
    this.timeout = timeout
    this.metadata = metadata
    Object.setPrototypeOf(this, TimeoutError.prototype)
  }
}
