# @studnicky/labels-sync

GitHub-only label sync, built on [Mnemotek](https://github.com/Studnicky/mnemotek). Pulls a repository's labels into a JSON file, and pushes new labels from that file back to GitHub — add-only, dry-run by default. No Jira integration.

## Install

```sh
npm install @studnicky/labels-sync
```

Requires the `gh` CLI, authenticated.

## Command

`labels` — `{action: 'pull' | 'push', repository?: string, file?: string, apply?: boolean}`

- **pull**: fetches the repository's labels via `gh api repos/:owner/:repo/labels --paginate` and writes them to `file` (default `.github/labels.json`).
- **push**: reads `file`, diffs it against the repository's current labels by name, and always returns the resolved `repository` plus the `planned` list of labels that don't exist yet. Only when `apply: true` does it actually call `gh label create` for each planned label — omitting `apply` (the default) is a dry-run that never mutates GitHub. Never deletes, renames, or modifies an existing label.

```sh
npx labels-sync-tool labels --action pull
npx labels-sync-tool labels --action push
npx labels-sync-tool labels --action push --apply
```

## License

MIT — see [LICENSE](./LICENSE).
