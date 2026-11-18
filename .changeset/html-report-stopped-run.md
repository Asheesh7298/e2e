---
"@e2e-dev/html-reporter": patch
---

`htmlReporter()` writes no page when the run wrote no report, as when it stops before its tests (`NO_TESTS`, a config error, an app that never starts), so the previous run's `report.html` stays beside the previous run's report, and the `HTML report` row is not printed.
