---
"@e2e-dev/core": patch
---

Values the agent types in a row into several fields, with only taps or `Tab` presses between them, are judged joined: when they join into a code the screen showed, the recording becomes a gap from the first piece, so a replay never types the last run's code into boxes that declare no `autocomplete="one-time-code"`, which includes every field on iOS and Android.
