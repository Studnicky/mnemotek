# @studnicky/git-flow

A git-flow driver built on [Mnemotek](https://github.com/Studnicky/mnemotek): feature/release/hotfix branch orchestration — create branch, push, open PR, wait for CI, squash-merge, tag, back-merge. Drives `git` and `gh` directly. No server, no proxy.

## Install

```sh
npm install @studnicky/git-flow
```

## Commands

- `feature` — `--create --branch <name>` creates `feature/<name>` from `develop`/`main` (`--type fix|chore|ci|docs` for a different prefix); `--push` pushes the current branch, opens a PR, waits for CI, and squash-merges it; with no flags, reports status
- `release` — `develop` → `release/<version>` → PR → CI wait → merge into `main` → tag → back-merge into `develop`. `--major`/`--minor` control the bump (default patch), `--version` sets it explicitly, `--dry-run` previews without touching the repo, `--direct` skips the PR when the target branch isn't protected
- `hotfix` — same shape as `release` but branches from `main` and defaults to a patch bump
- `sync` — fetch, prune, and fast-forward `main`/`develop`, then return to the original branch

```sh
npx git-flow-tool feature --create --branch my-thing
npx git-flow-tool feature --push
npx git-flow-tool release --minor
npx git-flow-tool hotfix --version 1.2.4
npx git-flow-tool sync
```

## License

MIT — see [LICENSE](./LICENSE).
