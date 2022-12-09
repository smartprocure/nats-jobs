# 0.8.0

* `timeout` option that will call `abort` on the abort signal if `perform` doesn't complete by
`timeout` ms.
* Default `batch` to 1 instead of 10.
* `autoExtendAckTimeout` is disabled by default now.

# 0.7.0

* Added `durationMs` to `complete` and `error` events.

# 0.6.0

* Pass `attemptsExhausted` to `error` emitter indicating when the `redeliveryCount` equals `max_deliver`.

# 0.5.0

* Return an emitter from `jobProcessor` to enable logging of message events: `start`, `complete`, `error`.

# 0.4.0

* `repeatAfter` defaults to `numEntries` for `expBackoff` util fn.

# 0.3.0

* Renamed `PerformOpts` to `Context`.

# 0.2.0

* API changes!
* Starting and stopping should be scoped to a single job def.
* Top-level `stop` fn that stops all started jobs and closes the NATS connection.
* Remove the exported Jetstream reference since we close the NATS connection and wouldn't know if that would break something down stream otherwise.

# 0.1.0

* Moved `jobScheduler` to [ha-job-scheduler](https://www.npmjs.com/package/ha-job-scheduler).
* Add flag `jobDef.autoExtendAckTimeout` (set to true by default) to auto-extend message acknowledgement timeout
  to prevent message from being redelivered while `jobDef.perform` is processing the message.

# 0.0.5

* Gracefully handle shutdown when using `jobScheduler.scheduleRecurring`.

# 0.0.4

* Export types from index.ts.

# 0.0.3

* Expose JetStream client on both processor and scheduler.
* processor `perform` now takes as second argument type `PerformOpts` which exposes the JetStream client in addition to `signal` and `def`

# 0.0.2

* Fixed importing when using type `module`.

# 0.0.1

* Initial Release
