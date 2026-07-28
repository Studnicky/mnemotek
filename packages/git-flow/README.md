# @studnicky/git-flow

A git-flow driver built on [Mnemotek](https://github.com/Studnicky/mnemotek): feature/release/hotfix branch orchestration — create branch, push, open PR, wait for CI, merge, tag, back-merge. Drives `git` and `gh` directly. No server, no proxy.

## Install

```sh
npm install @studnicky/git-flow
```

## Branch types

`feature` (default), `bugfix`, `chore`, `docs`, `test`, `refactor`, `perf`, `ci`, `build` — all branch from and merge back to the development branch (auto-detected as `develop` or `development`). `release` and `hotfix` are separate commands.

## Commands

- `feature` — `--create --branch <name>` creates `<type>/<name>` from the development branch (`--type` selects the prefix, default `feature`); `--push` pushes the current branch, opens a PR, waits for CI, and squash-merges it; with no flags, reports status
- `release` — development branch → `release/<version>` → PR → CI wait → **merge-commit** into `main` (never squash) → tag → back-merge into the development branch. `--major`/`--minor` control the bump (default patch), `--version` sets it explicitly, `--dry-run` previews without touching the repo, `--direct` skips the PR when `main` isn't protected
- `hotfix` — same shape as `release` but branches from `main` and defaults to a patch bump
- `sync` — fetch, prune, and fast-forward `main` and the development branch, then return to the original branch

```sh
npx git-flow-tool feature --create --branch my-thing
npx git-flow-tool feature --create --branch broken-thing --type bugfix
npx git-flow-tool feature --push
npx git-flow-tool release --minor
npx git-flow-tool hotfix --version 1.2.4
npx git-flow-tool sync
```

## License

MIT — see [LICENSE](./LICENSE).
