# @studnicky/config-standards

## 0.2.0

### Minor Changes

- [#28](https://github.com/Studnicky/mnemotek/pull/28) [`2b390a9`](https://github.com/Studnicky/mnemotek/commit/2b390a9b6d6c337297d8ff4a8e9561005012d07f) Thanks [@Studnicky](https://github.com/Studnicky)! - Adds five new Mnemotek-based packages: `@studnicky/memoria` (agent-native
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

## 0.1.1

### Patch Changes

- [#16](https://github.com/Studnicky/mnemotek/pull/16) [`6b81aba`](https://github.com/Studnicky/mnemotek/commit/6b81aba1943e982d90768afec6c94a65be2465a7) Thanks [@Studnicky](https://github.com/Studnicky)! - Add `.redactor/` to the required `.gitignore` lines, so `check`/`fix` catch a project that would otherwise accidentally commit `redactor`'s gain-tracking log.

- [#16](https://github.com/Studnicky/mnemotek/pull/16) [`6b81aba`](https://github.com/Studnicky/mnemotek/commit/6b81aba1943e982d90768afec6c94a65be2465a7) Thanks [@Studnicky](https://github.com/Studnicky)! - Unify strict TypeScript/ESLint configuration across every package in the workspace: extract `eslint.config.shared.mjs` behind a new `@studnicky/mnemotek/eslint-config` export (`createMnemotekEslintConfig`), and adopt it in all five leaf packages instead of each maintaining its own copy.

  Add `MnemotekAppFactory.registerCommands(app, ...commands)` (new public export from `@studnicky/mnemotek`) and switch every `create*App()` factory to it, replacing near-identical command-registration boilerplate. Also adds `PayloadOptions.resolveRoot`, `RecordGuard.isRecord`, and `CamelCaseJoiner.join` as shared utilities, replacing several duplicated private implementations across `MnemotekConfiguration`, `MnemotekMcp`, and `MnemotekCli`.

  Roll out the Entity (JSON-schema `Schema`/`Type`/`validate`) pattern for every closed value-set across all packages, replacing hand-rolled string unions and, where found, hand-rolled enum-membership guards that duplicated an entity's own `validate` function.

  Add `prebuild`/`pretest`/`pretypecheck`/`pretypecheck:test` lifecycle hooks to every leaf package so `@studnicky/mnemotek` is always rebuilt before a dependent package's own checks run, closing a stale-dist bug class.

  Remove ~60 redundant ESLint-related `devDependencies` from the five leaf packages' `package.json` files — they were never the actual resolution source (the shared config file lives at the workspace root and resolves its plugin imports from root's own `devDependencies` regardless of which package invoked it); removing the duplicates changes nothing about which rules are enforced.

- [#16](https://github.com/Studnicky/mnemotek/pull/16) [`6b81aba`](https://github.com/Studnicky/mnemotek/commit/6b81aba1943e982d90768afec6c94a65be2465a7) Thanks [@Studnicky](https://github.com/Studnicky)! - Add five standalone CLI/MCP/skill packages built on Mnemotek: `git-flow` (branch validation, hook install, changelog gating, PR status), `redactor` (ANSI/spinner stripping and token-savings tracking), `config-standards` (`.gitignore`/`package.json` check and fix), `deps-audit` (circular imports, orphan modules, unused dependencies), and `inspect` (project's own tsc/eslint runner). None depend on a graph database, agent-orchestration proxy, or live external API.

  Also fixes `MnemotekCli`: command runners now have their result printed to stdout (previously only `skill-manifest` printed anything, so every other CLI command silently discarded its output).

- Updated dependencies [[`6b81aba`](https://github.com/Studnicky/mnemotek/commit/6b81aba1943e982d90768afec6c94a65be2465a7), [`6b81aba`](https://github.com/Studnicky/mnemotek/commit/6b81aba1943e982d90768afec6c94a65be2465a7), [`6b81aba`](https://github.com/Studnicky/mnemotek/commit/6b81aba1943e982d90768afec6c94a65be2465a7)]:
  - @studnicky/mnemotek@0.2.0
