# @studnicky/github-release

Create a GitHub release via `gh release create`, built on [Mnemotek](https://github.com/Studnicky/mnemotek). No server, no daemon — shells to the `gh` CLI directly.

## Install

```sh
npm install @studnicky/github-release
```

## Commands

- `release` — create a GitHub release. Always pass `--tag` for non-interactive/agent use: omitting it leaves `gh` to prompt for a tag interactively. Pass `--notes` for an explicit body, or omit it to use `gh`'s auto-generated release notes.

```sh
npx github-release-tool release --tag v1.2.3
npx github-release-tool release --tag v1.2.3 --notes "Release notes here"
```

## License

MIT — see [LICENSE](./LICENSE).
