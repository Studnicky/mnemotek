# @studnicky/git-hooks

Mnemotek-based CLI/MCP/skill: installs a `core.hooksPath` dispatcher plus
bundled protected-branch, large-file, and secret-scan pre-commit checks. No
server, no daemon.

## Command

`hooks` — `{action: 'install' | 'list', hooks?: string[], dir?: string, force?: boolean}`

- **install**: refuses if an existing non-sample `.git/hooks/*` file or a
  `.husky/` directory is detected, unless `force: true`. Otherwise sets
  `core.hooksPath` to `dir` (default `.githooks`) and writes an executable
  dispatcher script per requested hook name (default `['pre-commit']`).
  Requesting `pre-commit` also installs three bundled checks:
  `pre-commit-protected-branch` (blocks direct commits to `main`/`develop`,
  no bypass other than git's own `--no-verify`), `pre-commit-large-file`
  (blocks staged files over `GIT_HOOKS_MAX_FILE_SIZE_BYTES`, default 5MB),
  and `pre-commit-secret-scan` (a built-in regex scan for common secret
  patterns — AWS keys, private-key headers, secret/token/password
  assignments — with a loud stderr warning that coverage is limited since
  no dedicated secret-scanning tool is installed).
- **list**: reports which known git hook names have a dispatcher installed
  under the configured `dir`.

## CLI

```
git-hooks-tool hooks --action install
git-hooks-tool hooks --action list
```
