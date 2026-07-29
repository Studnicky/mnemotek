# @studnicky/deps-audit

## 0.1.1

### Patch Changes

- [#16](https://github.com/Studnicky/mnemotek/pull/16) [`6b81aba`](https://github.com/Studnicky/mnemotek/commit/6b81aba1943e982d90768afec6c94a65be2465a7) Thanks [@Studnicky](https://github.com/Studnicky)! - Unify strict TypeScript/ESLint configuration across every package in the workspace: extract `eslint.config.shared.mjs` behind a new `@studnicky/mnemotek/eslint-config` export (`createMnemotekEslintConfig`), and adopt it in all five leaf packages instead of each maintaining its own copy.

  Add `MnemotekAppFactory.registerCommands(app, ...commands)` (new public export from `@studnicky/mnemotek`) and switch every `create*App()` factory to it, replacing near-identical command-registration boilerplate. Also adds `PayloadOptions.resolveRoot`, `RecordGuard.isRecord`, and `CamelCaseJoiner.join` as shared utilities, replacing several duplicated private implementations across `MnemotekConfiguration`, `MnemotekMcp`, and `MnemotekCli`.

  Roll out the Entity (JSON-schema `Schema`/`Type`/`validate`) pattern for every closed value-set across all packages, replacing hand-rolled string unions and, where found, hand-rolled enum-membership guards that duplicated an entity's own `validate` function.

  Add `prebuild`/`pretest`/`pretypecheck`/`pretypecheck:test` lifecycle hooks to every leaf package so `@studnicky/mnemotek` is always rebuilt before a dependent package's own checks run, closing a stale-dist bug class.

  Remove ~60 redundant ESLint-related `devDependencies` from the five leaf packages' `package.json` files — they were never the actual resolution source (the shared config file lives at the workspace root and resolves its plugin imports from root's own `devDependencies` regardless of which package invoked it); removing the duplicates changes nothing about which rules are enforced.

- [#16](https://github.com/Studnicky/mnemotek/pull/16) [`6b81aba`](https://github.com/Studnicky/mnemotek/commit/6b81aba1943e982d90768afec6c94a65be2465a7) Thanks [@Studnicky](https://github.com/Studnicky)! - Add five standalone CLI/MCP/skill packages built on Mnemotek: `git-flow` (branch validation, hook install, changelog gating, PR status), `redactor` (ANSI/spinner stripping and token-savings tracking), `config-standards` (`.gitignore`/`package.json` check and fix), `deps-audit` (circular imports, orphan modules, unused dependencies), and `inspect` (project's own tsc/eslint runner). None depend on a graph database, agent-orchestration proxy, or live external API.

  Also fixes `MnemotekCli`: command runners now have their result printed to stdout (previously only `skill-manifest` printed anything, so every other CLI command silently discarded its output).

- Updated dependencies [[`6b81aba`](https://github.com/Studnicky/mnemotek/commit/6b81aba1943e982d90768afec6c94a65be2465a7), [`6b81aba`](https://github.com/Studnicky/mnemotek/commit/6b81aba1943e982d90768afec6c94a65be2465a7), [`6b81aba`](https://github.com/Studnicky/mnemotek/commit/6b81aba1943e982d90768afec6c94a65be2465a7)]:
  - @studnicky/mnemotek@0.2.0
