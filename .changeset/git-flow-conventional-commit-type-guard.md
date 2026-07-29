---
"@studnicky/git-flow": patch
---

`ConventionalCommits.branchPrefixToConventionalType` now validates a branch prefix against `ConventionalCommitTypeEntity.validate` instead of hand-scanning `ConventionalCommitTypeEntity.Schema.enum` with `.find()` — same behavior, one fewer reimplementation of the entity's own membership check.
