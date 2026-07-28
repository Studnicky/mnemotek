# @studnicky/config-standards

Check and fix common project config files against a small built-in standards set, built on [Mnemotek](https://github.com/Studnicky/mnemotek). No server, no external services.

## Install

```sh
npm install @studnicky/config-standards
```

## Commands

- `check` — check `.gitignore` and `package.json` against the built-in standards set
- `fix` — append missing `.gitignore` lines and fill auto-fillable `package.json` defaults (e.g. `license`)

```sh
npx config-standards-tool check
npx config-standards-tool fix
```

## License

MIT — see [LICENSE](./LICENSE).
