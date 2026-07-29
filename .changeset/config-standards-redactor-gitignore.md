---
"@studnicky/config-standards": patch
---

Add `.redactor/` to the required `.gitignore` lines, so `check`/`fix` catch a project that would otherwise accidentally commit `redactor`'s gain-tracking log.
