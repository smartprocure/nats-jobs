import ms from 'ms'
import { Deferred } from './types'
import { JsMsg, Nanos } from 'nats'

export const nanos = (x: string) => ms(x) * 1e6
export const nanosToMs = (x: Nanos | number | undefined) => (x ? x / 1e6 : 0)

export const expBackoff = (
  startMs: number,
  { repeatAfter = 5, numEntries = 5 } = {}
) => {
  const vals = []
  let val = startMs
  for (let i = 0; i < numEntries; i++) {
    vals.push(val)
    val = i === repeatAfter ? val : val * 2
  }
  return vals
}

export function defer<A>(): Deferred<A> {
  // eslint-disable-next-line
  let done = (value: A) => {}
  const promise = new Promise<A>((res) => {
    done = res
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

