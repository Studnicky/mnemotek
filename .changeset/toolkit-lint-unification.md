---
"@studnicky/mnemotek": minor
"@studnicky/git-flow": patch
"@studnicky/redactor": patch
"@studnicky/config-standards": patch
"@studnicky/deps-audit": patch
"@studnicky/inspect": patch
---

Unify strict TypeScript/ESLint configuration across every package in the workspace: extract `eslint.config.shared.mjs` behind a new `@studnicky/mnemotek/eslint-config` export (`createMnemotekEslintConfig`), and adopt it in all five leaf packages instead of each maintaining its own copy.

Add `MnemotekAppFactory.registerCommands(app, ...commands)` (new public export from `@studnicky/mnemotek`) and switch every `create*App()` factory to it, replacing near-identical command-registration boilerplate. Also adds `PayloadOptions.resolveRoot`, `RecordGuard.isRecord`, and `CamelCaseJoiner.join` as shared utilities, replacing several duplicated private implementations across `MnemotekConfiguration`, `MnemotekMcp`, and `MnemotekCli`.

Roll out the Entity (JSON-schema `Schema`/`Type`/`validate`) pattern for every closed value-set across all packages, replacing hand-rolled string unions and, where found, hand-rolled enum-membership guards that duplicated an entity's own `validate` function.

Add `prebuild`/`pretest`/`pretypecheck`/`pretypecheck:test` lifecycle hooks to every leaf package so `@studnicky/mnemotek` is always rebuilt before a dependent package's own checks run, closing a stale-dist bug class.

Remove ~60 redundant ESLint-related `devDependencies` from the five leaf packages' `package.json` files — they were never the actual resolution source (the shared config file lives at the workspace root and resolves its plugin imports from root's own `devDependencies` regardless of which package invoked it); removing the duplicates changes nothing about which rules are enforced.
