---
"@studnicky/git-flow": minor
---

Remove `updateChangelog`/CHANGELOG.md editing from `release`/`hotfix`. Changelog generation is not this tool's concern — it belongs to a dedicated changelog tool (mnemotek's own release process uses Changesets, for example), not a git-flow branch/PR orchestrator. `release`/`hotfix` still bump the version in `package.json`, open/merge the PR, tag, and back-merge; they no longer touch `CHANGELOG.md` at all.
