---
"@e2e-dev/web": patch
---

Read ARIA roles and the checked, expanded, pressed, and disabled states without letter-case sensitivity, as Chrome's accessibility tree does, so `aria-checked="True"` reads as checked and `role="Button"` as a button. `getByRole` now finds a `banner`, a `contentinfo`, and a `disabled` state as the matchers read them. A sectioning tag whose `role` Chrome accepts, such as `<nav role="none">`, no longer keeps a header or footer from being `banner` or `contentinfo`.
