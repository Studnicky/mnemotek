---
"@studnicky/git-flow": patch
---

`feature` command now accepts `--type fix|chore|ci|docs` (in addition to the default `feature`) so it can create/push branches matching all the prefixes the project's own naming convention and pre-push hook already accept, instead of only ever creating `feature/*` branches. Confirmed via a cross-project audit (dollarwise-prototype's real branch history, archivum's `gitFlowSpec.ts`, enginseer/HammerTime's git-flow docs) that this 5-prefix set matches real-world usage better than a feature/release/hotfix-only model.
