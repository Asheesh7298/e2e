---
"e2e": patch
---

`test.skip()` in an `afterEach` hook or a fixture teardown reports an `INVALID_ARGUMENT` cleanup error, as a late `test.fail()` does, instead of `ERROR: [object Object]`.
