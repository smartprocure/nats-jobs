# 0.2.0

* Starting and stopping are scoped to a single job definition. API change.

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
