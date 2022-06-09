import { describe, expect, test } from '@jest/globals'
import { JsMsg } from 'nats'
import { getNextBackoff, expBackoff } from './util'

describe('getNextBackoff', () => {
  test('should always the same value if number is passed', () => {
    const msg = {
      info: {
        redeliveryCount: 2,
      },
    }
    const result = getNextBackoff(1000, msg as JsMsg)
    expect(result).toBe(1000)
  })
  test('should return next value if array is passed', () => {
    const msg = {
      info: {
        redeliveryCount: 2,
      },
    }
    const backoff = [1000, 2000, 3000]
    const result = getNextBackoff(backoff, msg as JsMsg)
    expect(result).toBe(2000)
  })
  test('should return last value if array is passed and end of array reached', () => {
    const msg = {
      info: {
        redeliveryCount: 5,
      },
    }
    const backoff = [1000, 2000, 3000]
    const result = getNextBackoff(backoff, msg as JsMsg)
    expect(result).toBe(3000)
  })
})

describe('expBackoff', () => {
  test('should double values with defaults', () => {
    const result = expBackoff(1000)
    expect(result).toEqual([1000, 2000, 4000, 8000, 16000])
  })
  test('should limit entries according to numEntries', () => {
    const result = expBackoff(1000, { numEntries: 3 })
    expect(result).toEqual([1000, 2000, 4000])
  })
  test('should repeat after n entries according to repeatAfter', () => {
    const result = expBackoff(1000, { repeatAfter: 3 })
    expect(result).toEqual([1000, 2000, 4000, 4000, 4000])
  })
})
