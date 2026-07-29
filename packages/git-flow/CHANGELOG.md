# @studnicky/git-flow

## 0.2.0

### Minor Changes

- [#16](https://github.com/Studnicky/mnemotek/pull/16) [`6b81aba`](https://github.com/Studnicky/mnemotek/commit/6b81aba1943e982d90768afec6c94a65be2465a7) Thanks [@Studnicky](https://github.com/Studnicky)! - Add `commit-check` and `commit-type` to `@studnicky/git-flow`: Conventional Commits validation (`feat, fix, chore, docs, style, refactor, perf, test, ci, build, revert, wip`, with `Merge*`/`Revert*`/`Squashed commit of*` subjects and `chore/backmerge-*` branches exempt) and automatic type derivation from the current branch's prefix (`feature` → `feat`, `bugfix` → `fix`, everything else passes through), so a commit message's type never has to be hand-guessed. `commit-check --strict` throws instead of returning `valid: false`, so it can gate a `commit-msg` hook or CI check with a real non-zero exit code.

  Wires this into mnemotek's own `.githooks/commit-msg`, and fixes `.githooks/pre-push`'s branch-naming list, which had drifted from `@studnicky/git-flow`'s actual branch types (`fix` instead of `bugfix`, missing `test`/`refactor`/`perf`/`build`).

- [#16](https://github.com/Studnicky/mnemotek/pull/16) [`6b81aba`](https://github.com/Studnicky/mnemotek/commit/6b81aba1943e982d90768afec6c94a65be2465a7) Thanks [@Studnicky](https://github.com/Studnicky)! - Rebuild `@studnicky/git-flow` as an actual git-flow driver: `feature` (create/push/status), `release` (develop → release branch → PR → CI wait → merge → tag → back-merge), `hotfix` (same shape from main, patch bump default), and `sync` (fetch/prune/fast-forward main+develop). Replaces the previous branch-validate/hooks-install/changelog-check/pr-status commands, which weren't a git-flow driver at all.

- [#16](https://github.com/Studnicky/mnemotek/pull/16) [`6b81aba`](https://github.com/Studnicky/mnemotek/commit/6b81aba1943e982d90768afec6c94a65be2465a7) Thanks [@Studnicky](https://github.com/Studnicky)! - Remove `updateChangelog`/CHANGELOG.md editing from `release`/`hotfix`. Changelog generation is not this tool's concern — it belongs to a dedicated changelog tool (mnemotek's own release process uses Changesets, for example), not a git-flow branch/PR orchestrator. `release`/`hotfix` still bump the version in `package.json`, open/merge the PR, tag, and back-merge; they no longer touch `CHANGELOG.md` at all.

### Patch Changes

- [#16](https://github.com/Studnicky/mnemotek/pull/16) [`6b81aba`](https://github.com/Studnicky/mnemotek/commit/6b81aba1943e982d90768afec6c94a65be2465a7) Thanks [@Studnicky](https://github.com/Studnicky)! - `feature` command now accepts `--type fix|chore|ci|docs` (in addition to the default `feature`) so it can create/push branches matching all the prefixes the project's own naming convention and pre-push hook already accept, instead of only ever creating `feature/*` branches. Confirmed via a cross-project audit (dollarwise-prototype's real branch history, archivum's `gitFlowSpec.ts`, enginseer/HammerTime's git-flow docs) that this 5-prefix set matches real-world usage better than a feature/release/hotfix-only model.

- [#16](https://github.com/Studnicky/mnemotek/pull/16) [`6b81aba`](https://github.com/Studnicky/mnemotek/commit/6b81aba1943e982d90768afec6c94a65be2465a7) Thanks [@Studnicky](https://github.com/Studnicky)! - Fix `feature`'s branch type set to match real git-flow naming conventions: `bugfix` (not `fix`, which isn't a real type anywhere), plus `test`, `refactor`, `perf`, `ci`, `build`. `bugfix/*` branches still produce `fix:` commit-style PR titles (Conventional Commits has no `bugfix` type). `detectBranchStructure` now recognizes `development` as well as `develop` for the integration branch. `release`/`hotfix` now merge into `main` via merge-commit instead of squash — squashing the promotion into `main` collapses the release branch's own history, which the back-merge into the development branch then depends on.

- [#16](https://github.com/Studnicky/mnemotek/pull/16) [`6b81aba`](https://github.com/Studnicky/mnemotek/commit/6b81aba1943e982d90768afec6c94a65be2465a7) Thanks [@Studnicky](https://github.com/Studnicky)! - `commit-check` now throws on an invalid message by default (a guardrail should fail closed), instead of requiring an opt-in `--strict` flag. Pass `--lenient` to get the old `valid: false` return behavior back, for introspection. `.githooks/commit-msg` updated accordingly.

- [#16](https://github.com/Studnicky/mnemotek/pull/16) [`6b81aba`](https://github.com/Studnicky/mnemotek/commit/6b81aba1943e982d90768afec6c94a65be2465a7) Thanks [@Studnicky](https://github.com/Studnicky)! - `ConventionalCommits.branchPrefixToConventionalType` now validates a branch prefix against `ConventionalCommitTypeEntity.validate` instead of hand-scanning `ConventionalCommitTypeEntity.Schema.enum` with `.find()` — same behavior, one fewer reimplementation of the entity's own membership check.

- [#16](https://github.com/Studnicky/mnemotek/pull/16) [`6b81aba`](https://github.com/Studnicky/mnemotek/commit/6b81aba1943e982d90768afec6c94a65be2465a7) Thanks [@Studnicky](https://github.com/Studnicky)! - Remove the leftover `changelog` keyword from `package.json` — the last remaining trace of changelog handling in this package.

- [#16](https://github.com/Studnicky/mnemotek/pull/16) [`6b81aba`](https://github.com/Studnicky/mnemotek/commit/6b81aba1943e982d90768afec6c94a65be2465a7) Thanks [@Studnicky](https://github.com/Studnicky)! - Unify strict TypeScript/ESLint configuration across every package in the workspace: extract `eslint.config.shared.mjs` behind a new `@studnicky/mnemotek/eslint-config` export (`createMnemotekEslintConfig`), and adopt it in all five leaf packages instead of each maintaining its own copy.

  Add `MnemotekAppFactory.registerCommands(app, ...commands)` (new public export from `@studnicky/mnemotek`) and switch every `create*App()` factory to it, replacing near-identical command-registration boilerplate. Also adds `PayloadOptions.resolveRoot`, `RecordGuard.isRecord`, and `CamelCaseJoiner.join` as shared utilities, replacing several duplicated private implementations across `MnemotekConfiguration`, `MnemotekMcp`, and `MnemotekCli`.

  Roll out the Entity (JSON-schema `Schema`/`Type`/`validate`) pattern for every closed value-set across all packages, replacing hand-rolled string unions and, where found, hand-rolled enum-membership guards that duplicated an entity's own `validate` function.

  Add `prebuild`/`pretest`/`pretypecheck`/`pretypecheck:test` lifecycle hooks to every leaf package so `@studnicky/mnemotek` is always rebuilt before a dependent package's own checks run, closing a stale-dist bug class.

  Remove ~60 redundant ESLint-related `devDependencies` from the five leaf packages' `package.json` files — they were never the actual resolution source (the shared config file lives at the workspace root and resolves its plugin imports from root's own `devDependencies` regardless of which package invoked it); removing the duplicates changes nothing about which rules are enforced.

- [#16](https://github.com/Studnicky/mnemotek/pull/16) [`6b81aba`](https://github.com/Studnicky/mnemotek/commit/6b81aba1943e982d90768afec6c94a65be2465a7) Thanks [@Studnicky](https://github.com/Studnicky)! - Add five standalone CLI/MCP/skill packages built on Mnemotek: `git-flow` (branch validation, hook install, changelog gating, PR status), `redactor` (ANSI/spinner stripping and token-savings tracking), `config-standards` (`.gitignore`/`package.json` check and fix), `deps-audit` (circular imports, orphan modules, unused dependencies), and `inspect` (project's own tsc/eslint runner). None depend on a graph database, agent-orchestration proxy, or live external API.

  Also fixes `MnemotekCli`: command runners now have their result printed to stdout (previously only `skill-manifest` printed anything, so every other CLI command silently discarded its output).

- Updated dependencies [[`6b81aba`](https://github.com/Studnicky/mnemotek/commit/6b81aba1943e982d90768afec6c94a65be2465a7), [`6b81aba`](https://github.com/Studnicky/mnemotek/commit/6b81aba1943e982d90768afec6c94a65be2465a7), [`6b81aba`](https://github.com/Studnicky/mnemotek/commit/6b81aba1943e982d90768afec6c94a65be2465a7)]:
  - @studnicky/mnemotek@0.2.0
