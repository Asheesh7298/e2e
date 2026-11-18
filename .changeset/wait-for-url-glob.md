---
"@e2e-dev/web": patch
---

`browser.waitForURL` takes a URL glob such as `'**/checkout'`, as Playwright's does: a string with a `*` or a `{` is a glob, with `?` read literally, and a string with neither is still an exact match. `expect(browser).toHaveURL` keeps comparing a string exactly, as Playwright's does.
