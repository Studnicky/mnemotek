# @studnicky/git-flow

Local-only git-flow helpers built on [Mnemotek](https://github.com/Studnicky/mnemotek): branch naming, hook install, changelog gating, and single-shot PR status. No server, no daemon — shells out only to `git` and `gh`.

## Install

```sh
npm install @studnicky/git-flow
```

## Commands

- `branch-validate` — validate a branch name against the git-flow naming convention
- `hooks-install` — install `pre-commit`/`pre-push` git hooks and wire `core.hooksPath`
- `changelog-check` — check that a changeset or CHANGELOG `Unreleased` section exists
- `pr-status` — report a pull request's mergeability and check status (single snapshot, no polling)

```sh
npx git-flow-tool branch-validate --branch feature/my-thing
```

## License

MIT — see [LICENSE](./LICENSE).
