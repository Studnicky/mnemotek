# @studnicky/inspect

Run a project's own `tsc` and `eslint` and report structured pass/fail results, built on [Mnemotek](https://github.com/Studnicky/mnemotek). No server, no bundled compiler — resolves and runs whatever `tsc`/`eslint` the target project already has installed.

## Install

```sh
npm install @studnicky/inspect
```

## Commands

- `typecheck` — run the project's own `tsc --noEmit` and report pass/fail with an error count
- `lint` — run the project's own `eslint` and report pass/fail with a problem count

```sh
npx inspect-tool typecheck --root .
npx inspect-tool lint --root .
```

## License

MIT — see [LICENSE](./LICENSE).
