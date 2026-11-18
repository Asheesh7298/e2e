---
"e2e": patch
---

`test.skip()` in an `afterEach` hook or a fixture teardown fails the test with `INVALID_ARGUMENT`, as a late `test.fail()` does, instead of `ERROR: [object Object]`.
