---
"e2e": patch
---

`expect(locator).toHaveRole(role)` waits for the one match to have that role, compared as a string, so a `switch` is not a `checkbox`. It takes the `getByRole` vocabulary, reads `img` as `image`, and answers on a password field, whose role is never withheld.
