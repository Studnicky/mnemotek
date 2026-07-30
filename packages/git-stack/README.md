# @studnicky/git-stack

Stacked-PR workflow driver, built on [Mnemotek](https://github.com/Studnicky/mnemotek). A thin passthrough to the [gh-stack](https://github.com/timothyandrew/gh-stack) GitHub CLI extension — no reimplementation of stacked-PR logic, no server, no daemon.

## Install

```sh
npm install @studnicky/git-stack
```

Requires the `gh` CLI with the `gh-stack` extension installed and authenticated.

## Command

`stack` — `{action: string (required), argumentList?: string[]}`

Runs `gh stack <action> <...argumentList>` and returns the captured stdout as `output`. `action` and `argumentList` are passed through as-is (e.g. `create`, `sync`, `submit`, `log`) — this package validates nothing about gh-stack's own subcommand semantics.

```sh
npx git-stack-tool stack --action create
npx git-stack-tool stack --action sync
```

## License

MIT — see [LICENSE](./LICENSE).
