---
"@studnicky/git-flow": minor
"@studnicky/mnemotek": patch
---

Add `commit-check` and `commit-type` to `@studnicky/git-flow`: Conventional Commits validation (`feat, fix, chore, docs, style, refactor, perf, test, ci, build, revert, wip`, with `Merge*`/`Revert*`/`Squashed commit of*` subjects and `chore/backmerge-*` branches exempt) and automatic type derivation from the current branch's prefix (`feature` → `feat`, `bugfix` → `fix`, everything else passes through), so a commit message's type never has to be hand-guessed. `commit-check --strict` throws instead of returning `valid: false`, so it can gate a `commit-msg` hook or CI check with a real non-zero exit code.

Wires this into mnemotek's own `.githooks/commit-msg`, and fixes `.githooks/pre-push`'s branch-naming list, which had drifted from `@studnicky/git-flow`'s actual branch types (`fix` instead of `bugfix`, missing `test`/`refactor`/`perf`/`build`).
