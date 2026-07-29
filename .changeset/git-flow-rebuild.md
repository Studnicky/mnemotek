---
"@studnicky/git-flow": minor
---

Rebuild `@studnicky/git-flow` as an actual git-flow driver: `feature` (create/push/status), `release` (develop → release branch → PR → CI wait → merge → tag → back-merge), `hotfix` (same shape from main, patch bump default), and `sync` (fetch/prune/fast-forward main+develop). Replaces the previous branch-validate/hooks-install/changelog-check/pr-status commands, which weren't a git-flow driver at all.
