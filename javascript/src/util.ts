import { setInterval } from 'node:timers/promises'
import ms from 'ms'
import _debug from 'debug'
import { JsMsg } from 'nats'
import { Deferred } from './types'

const debug = _debug('nats')

export const nanos = (x: string) => ms(x) * 1e6

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
  let done = (value: A) => {}
  const promise = new Promise<A>((res) => {
    done = res
  })
  return {
    done,
    promise,
  }
}
