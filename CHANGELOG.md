# Changelog

## 0.2.0

### Minor Changes

- [#16](https://github.com/Studnicky/mnemotek/pull/16) [`6b81aba`](https://github.com/Studnicky/mnemotek/commit/6b81aba1943e982d90768afec6c94a65be2465a7) Thanks [@Studnicky](https://github.com/Studnicky)! - Unify strict TypeScript/ESLint configuration across every package in the workspace: extract `eslint.config.shared.mjs` behind a new `@studnicky/mnemotek/eslint-config` export (`createMnemotekEslintConfig`), and adopt it in all five leaf packages instead of each maintaining its own copy.

  Add `MnemotekAppFactory.registerCommands(app, ...commands)` (new public export from `@studnicky/mnemotek`) and switch every `create*App()` factory to it, replacing near-identical command-registration boilerplate. Also adds `PayloadOptions.resolveRoot`, `RecordGuard.isRecord`, and `CamelCaseJoiner.join` as shared utilities, replacing several duplicated private implementations across `MnemotekConfiguration`, `MnemotekMcp`, and `MnemotekCli`.

  Roll out the Entity (JSON-schema `Schema`/`Type`/`validate`) pattern for every closed value-set across all packages, replacing hand-rolled string unions and, where found, hand-rolled enum-membership guards that duplicated an entity's own `validate` function.

  Add `prebuild`/`pretest`/`pretypecheck`/`pretypecheck:test` lifecycle hooks to every leaf package so `@studnicky/mnemotek` is always rebuilt before a dependent package's own checks run, closing a stale-dist bug class.

  Remove ~60 redundant ESLint-related `devDependencies` from the five leaf packages' `package.json` files — they were never the actual resolution source (the shared config file lives at the workspace root and resolves its plugin imports from root's own `devDependencies` regardless of which package invoked it); removing the duplicates changes nothing about which rules are enforced.

### Patch Changes

- [#16](https://github.com/Studnicky/mnemotek/pull/16) [`6b81aba`](https://github.com/Studnicky/mnemotek/commit/6b81aba1943e982d90768afec6c94a65be2465a7) Thanks [@Studnicky](https://github.com/Studnicky)! - Add `commit-check` and `commit-type` to `@studnicky/git-flow`: Conventional Commits validation (`feat, fix, chore, docs, style, refactor, perf, test, ci, build, revert, wip`, with `Merge*`/`Revert*`/`Squashed commit of*` subjects and `chore/backmerge-*` branches exempt) and automatic type derivation from the current branch's prefix (`feature` → `feat`, `bugfix` → `fix`, everything else passes through), so a commit message's type never has to be hand-guessed. `commit-check --strict` throws instead of returning `valid: false`, so it can gate a `commit-msg` hook or CI check with a real non-zero exit code.

  Wires this into mnemotek's own `.githooks/commit-msg`, and fixes `.githooks/pre-push`'s branch-naming list, which had drifted from `@studnicky/git-flow`'s actual branch types (`fix` instead of `bugfix`, missing `test`/`refactor`/`perf`/`build`).

- [#16](https://github.com/Studnicky/mnemotek/pull/16) [`6b81aba`](https://github.com/Studnicky/mnemotek/commit/6b81aba1943e982d90768afec6c94a65be2465a7) Thanks [@Studnicky](https://github.com/Studnicky)! - Add five standalone CLI/MCP/skill packages built on Mnemotek: `git-flow` (branch validation, hook install, changelog gating, PR status), `redactor` (ANSI/spinner stripping and token-savings tracking), `config-standards` (`.gitignore`/`package.json` check and fix), `deps-audit` (circular imports, orphan modules, unused dependencies), and `inspect` (project's own tsc/eslint runner). None depend on a graph database, agent-orchestration proxy, or live external API.

  Also fixes `MnemotekCli`: command runners now have their result printed to stdout (previously only `skill-manifest` printed anything, so every other CLI command silently discarded its output).

## 0.1.2

### Patch Changes

- [#5](https://github.com/Studnicky/mnemotek/pull/5) [`64db262`](https://github.com/Studnicky/mnemotek/commit/64db262a23b779a8c38f9458fdab4b1d5d06a2b7) Thanks [@Studnicky](https://github.com/Studnicky)! - Remove the redundant tag-triggered publish workflow (Release via Changesets is now the single publish path). Add local git hooks (`.githooks/pre-commit`, `.githooks/pre-push`) wired automatically via `pnpm install`'s `prepare` script: pre-commit blocks committing generated/local-only paths and lints staged files; pre-push blocks direct pushes to `main`/`develop`, checks branch naming, requires a changeset, and runs the full CI gate before every push.

## 0.1.1

### Patch Changes

- [`9d4c900`](https://github.com/Studnicky/mnemotek/commit/9d4c900efa3cdc66d3debdfc3f3456b610aee788) Thanks [@Studnicky](https://github.com/Studnicky)! - Initial publish setup and release hardening for mnemotek: pnpm scripts, metadata, release workflow, and CI publish gates.

- [#2](https://github.com/Studnicky/mnemotek/pull/2) [`98e9a22`](https://github.com/Studnicky/mnemotek/commit/98e9a22b0fd4b89f2a8517aa2ec97b35f4979bb8) Thanks [@Studnicky](https://github.com/Studnicky)! - Harden CI/CD: pin all GitHub Actions to commit SHAs, extract a shared pnpm node-setup composite action, enable CodeQL default setup, and add security audit, license compliance, and changeset-presence checks. Fix the CI workflow missing `NODE_AUTH_TOKEN` (GitHub Packages requires auth even for public packages) and the Release workflow missing the `repo` option for `@changesets/changelog-github`.

## 0.1.0

- Initial package bootstrap with manifest-first API for agents.
