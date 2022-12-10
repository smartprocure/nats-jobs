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
  /**
   * Automatically delay the ack_wait timeout.
   */
  autoExtendAckTimeout?: boolean
  perform(msg: JsMsg, context: Context): Promise<void>
  /**
   * Timeout in ms on the perform. Only applies if autoExtendAckTimeout is true.
   */
  timeout?: number
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

export type Events =
  | 'start'
  | 'stop'
  | 'working'
  | 'timeout'
  | 'complete'
  | 'error'
