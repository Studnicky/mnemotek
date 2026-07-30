---
"@studnicky/git-flow": minor
"@studnicky/config-standards": minor
---

Adds five new Mnemotek-based packages: `@studnicky/memoria` (agent-native
dotfile manager — adopt/apply/diff/status/verify/bootstrap/secrets/catalog/
doctor), `@studnicky/git-hooks` (`core.hooksPath` dispatcher plus bundled
protected-branch, large-file, and secret-scan pre-commit checks),
`@studnicky/git-stack` (thin passthrough to the `gh-stack` CLI extension),
`@studnicky/github-release` (`gh release create` wrapper), and
`@studnicky/labels-sync` (GitHub label pull/push, add-only and dry-run by
default). None depend on a graph server, agent-orchestration proxy, or live
external API beyond the already-authenticated `git`/`gh` CLIs.

`@studnicky/git-flow` gains `cleanup` (merged-branch pruning) and
`milestone` (WIP checkpoint commits, no Jira coupling) commands, and fixes
a real concurrency bug in `GitPrimitives.acquireLock`: the previous
`existsSync`-then-`writeFileSync` check let two concurrent invocations both
believe they held the lock. Lock acquisition is now exclusive-create with
stale-pid reclaim.

`@studnicky/config-standards` gains ten new rules (`editorconfig`,
`vscode`, `prettier`, `style-drift`, `version-pin`, `envcheck`,
`codeowners`, `devcontainer`, `issue-templates`, `template-sync`) alongside
the existing `.gitignore`/`package.json` checks, plus its own corrected
lock file for `fix` and an atomic write helper used across every new and
existing fixer.
