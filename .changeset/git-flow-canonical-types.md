---
"@studnicky/git-flow": patch
---

Fix `feature`'s branch type set to match real git-flow naming conventions: `bugfix` (not `fix`, which isn't a real type anywhere), plus `test`, `refactor`, `perf`, `ci`, `build`. `bugfix/*` branches still produce `fix:` commit-style PR titles (Conventional Commits has no `bugfix` type). `detectBranchStructure` now recognizes `development` as well as `develop` for the integration branch. `release`/`hotfix` now merge into `main` via merge-commit instead of squash — squashing the promotion into `main` collapses the release branch's own history, which the back-merge into the development branch then depends on.
