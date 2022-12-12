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
  /** How often to pull down messages from the consumer. */
  pullInterval?: number
  /** How many messages to pull at one time. */
  batch?: number
  /** Time to wait before reprocessing the message if processing fails. */
  backoff?: number | number[]
  /** How many times to attempt to process the message. */
  numAttempts?: number
  /** Automatically delay the ack_wait timeout. */
  autoExtendAckTimeout?: boolean
  perform(msg: JsMsg, context: Context): Promise<void>
  /** Timeout in ms on the perform. Abort signal will trigger if timeout is reached. */
  timeoutMs?: number
  /** Expected time in ms for perform to complete. */
  expectedMs?: number
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
  // Start processing messages
  | 'start'
  // Message received
  | 'receive'
  // Tell NATS we're still working
  | 'working'
  // Message processing complete
  | 'complete'
  // Error processing message
  | 'error'
  // Timeout occurred while processing message
  | 'timeout'
  // Pull the next message(s)
  | 'pull'
  // Stop processing messages
  | 'stop'
  // NATS did not ack the ack
  | 'noAck'
