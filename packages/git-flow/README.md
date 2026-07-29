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
- `commit-check` — validate a commit message against [Conventional Commits](https://www.conventionalcommits.org/) (`feat, fix, chore, docs, style, refactor, perf, test, ci, build, revert, wip`). Throws on an invalid message by default, giving a non-zero CLI exit — usable directly as a `commit-msg` hook or CI check. Pass `--lenient` to get `valid: false` back instead of a throw, for introspection (e.g. an agent inspecting why a message failed before rewriting it)
- `commit-type` — derive the Conventional Commits type implied by a branch's prefix (`feature` → `feat`, `bugfix` → `fix`, everything else passes through), so a commit message's type is never hand-guessed

```sh
npx git-flow-tool feature --create --branch my-thing
npx git-flow-tool feature --create --branch broken-thing --type bugfix
npx git-flow-tool feature --push
npx git-flow-tool release --minor
npx git-flow-tool hotfix --version 1.2.4
npx git-flow-tool sync
npx git-flow-tool commit-type
npx git-flow-tool commit-check --file .git/COMMIT_EDITMSG
```

## Guardrail: a `commit-msg` hook

`commit-check` is designed to run directly as a `commit-msg` hook — git passes the message file path as `$1`, and an invalid message throws (non-zero exit) by default:

```sh
#!/bin/sh
node path/to/git-flow-tool commit-check --file "$1"
```

## License

MIT — see [LICENSE](./LICENSE).
