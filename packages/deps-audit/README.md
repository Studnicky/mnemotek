# @studnicky/deps-audit

Static import-graph analysis for a TypeScript source tree, built on [Mnemotek](https://github.com/Studnicky/mnemotek): circular imports, orphan modules, unused dependencies. No server, no external services.

## Install

```sh
npm install @studnicky/deps-audit
```

## Commands

- `circular` — find circular import chains within a source root
- `orphans` — find source files never imported by any other file in the scanned tree
- `unused-deps` — find `package.json` dependencies never referenced by a bare-specifier import

```sh
npx deps-audit-tool circular --root src
npx deps-audit-tool orphans --root src
npx deps-audit-tool unused-deps --root .
```

## License

MIT — see [LICENSE](./LICENSE).
