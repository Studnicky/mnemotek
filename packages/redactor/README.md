# @studnicky/redactor

Strip ANSI/spinner noise from a command's output and track byte/token savings, built on [Mnemotek](https://github.com/Studnicky/mnemotek). No server, no external filter plugins.

## Install

```sh
npm install @studnicky/redactor
```

## Commands

- `text` — redact a raw text string (strip ANSI escapes, collapse spinner overwrites, collapse blank-line runs)
- `run` — run a command, redact its output, and record savings
- `gain` — show cumulative savings across all recorded runs

```sh
npx redactor-tool run --command git --args status
npx redactor-tool gain
```

## License

MIT — see [LICENSE](./LICENSE).
