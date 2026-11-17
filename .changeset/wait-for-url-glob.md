---
"@e2e-dev/core": patch
"@e2e-dev/web": patch
---

`browser.waitForURL` and `expect(browser).toHaveURL` take a URL glob such as `'**/checkout'`. A string with a `*` or a `{` is a glob in Playwright's grammar, with `?` read literally; a string with neither is still an exact match.
