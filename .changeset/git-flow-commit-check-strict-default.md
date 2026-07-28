---
"@studnicky/git-flow": patch
---

`commit-check` now throws on an invalid message by default (a guardrail should fail closed), instead of requiring an opt-in `--strict` flag. Pass `--lenient` to get the old `valid: false` return behavior back, for introspection. `.githooks/commit-msg` updated accordingly.
