import ms from 'ms'
import type { BackoffOptions, Deferred } from './types'
import type { JsMsg, Nanos } from 'nats'

export const nanos = (x: string) => ms(x) * 1e6
export const nanosToMs = (x: Nanos | undefined) => (x ? x / 1e6 : 0)

/**
 * Given a starting backoff in ms, generate an array of doubling
 * values with at most `numEntries` and repeating after
 * `repeatAfter` entries.
 *
 * Note that `repeatAfter` defaults to `numEntries` and `numEntries`
 * defaults to 5.
 */
export const expBackoff = (startMs: number, options?: BackoffOptions) => {
  const numEntries = options?.numEntries || 5
  const repeatAfter = options?.repeatAfter || numEntries
  const vals = []
  let val = startMs
  for (let i = 0; i < numEntries; i++) {
    vals.push(val)
    val = i + 1 >= repeatAfter ? val : val * 2
  }
  return vals
}

export function defer<A>(): Deferred<A> {
  // eslint-disable-next-line
  let done = (value: A) => {}
  const promise = new Promise<A>((resolve) => {
    // Swap original done fn with promise resolve fn
    done = resolve
  })
  return {
    done,
    promise,
  }
}

/**
 * Get the next backoff based on the redelivery count. If given
 * an array and no item exists for the attempt number use the last
 * backoff in the array.
 */
export const getNextBackoff = (backoff: number | number[], msg: JsMsg) => {
  if (Array.isArray(backoff)) {
    return backoff[msg.info.redeliveryCount - 1] || backoff.at(-1)
  }
  return backoff
}

export const repeater = (fn: () => void, delay: number) => {
  let timer: NodeJS.Timer
  const start = () => {
    timer = setInterval(fn, delay)
  }
  const stop = () => {
    clearInterval(timer)
  }
  return { start, stop }
}
