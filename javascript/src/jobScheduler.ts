import { connect } from 'nats'
import nodeSchedule, { RecurrenceRule } from 'node-schedule'
import Redis from 'ioredis'
import ms from 'ms'
import _debug from 'debug'
import { Recurring, RedisOpts, NatsOpts, Delayed } from './types'

const debug = _debug('nats-jobs')

export const jobScheduler = async (opts?: RedisOpts & NatsOpts) => {
  const { natsOpts, redisOpts } = opts || {}
  const connection = await connect(natsOpts)
  const js = connection.jetstream()
  const redis = redisOpts ? new Redis(redisOpts) : new Redis()

  /**
   * Schedule a recurring job. Data will be published
   * according to the rule.
   *
   * See: https://www.npmjs.com/package/node-schedule
   *
   * If data is a function the scheduled date will be passed to it.
   *
   * Guarantees at most one delivery.
   */
  const scheduleRecurring = ({ id, rule, subject, data }: Recurring) => {
    const isFunction = typeof data === 'function'
    // Schedule job
    return nodeSchedule.scheduleJob(rule, async (date) => {
      const keyPrefix = 'schedulingLock'
      const scheduledTime = date.getTime()
      const key = `${keyPrefix}:${id}:${scheduledTime}`
      const val = process.pid
      // Attempt to get an exclusive lock. Lock expires in 1 minute.
      const lockObtained = await redis.set(key, val, 'PX', ms('1m'), 'NX')
      if (lockObtained) {
        debug('SCHEDULED', date)
        js.publish(subject, isFunction ? data(date) : data)
      }
    })
  }

  /**
   * Schedule a single job to be published at a later date.
   *
   * scheduleFor accepts a number of milliseconds in the future
   * or a date.
   *
   * Returns a boolean indicating if the job was successfully scheduled.
   */
  const scheduleDelayed = async ({ scheduleFor, subject, data }: Delayed) => {
    const key = `delayed:${subject}`
    const score =
      typeof scheduleFor === 'number'
        ? new Date().getTime() + scheduleFor
        : scheduleFor.getTime()
    const res = await redis.zadd(key, score, Buffer.from(data))
    return res === 1
  }

  /**
   * Publish delayed one-time jobs for subject. Check for jobs
   * according to the recurrence rule. Default interval is every 10 seconds.
   *
   * Guarantees at least one delivery.
   */
  const publishDelayed = (subject: string, rule: RecurrenceRule | string = '*/10 * * * * *') => {
    const key = `delayed:${subject}`
    return nodeSchedule.scheduleJob(rule, async (date) => {
      const scheduledTime = date.getTime()
      const lockKey = `${key}:${scheduledTime}`
      const val = process.pid
      // Attempt to get an exclusive lock. Lock expires in 1 minute.
      const lockObtained = await redis.set(lockKey, val, 'PX', ms('1m'), 'NX')
      if (lockObtained) {
        debug('PUBLISH DELAYED', date)
        const upper = new Date().getTime()
        // Get delayed jobs where the delayed timestamp is <= now
        const items = await redis.zrangebyscoreBuffer(key, '-inf', upper)
        if (items.length) {
          // Publish messages
          await Promise.all(items.map((data) => js.publish(subject, data)))
          // Remove delayed jobs
          await redis.zremrangebyscore(key, '-inf', upper)
        }
      }
    })
  }

  return { scheduleRecurring, scheduleDelayed, publishDelayed, js }
}
