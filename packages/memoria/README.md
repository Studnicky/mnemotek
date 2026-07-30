# @studnicky/memoria

Agent-native dotfile manager, built on [Mnemotek](https://github.com/Studnicky/mnemotek). Templated apply, drift status, and seed-once files — a schema-driven replacement for the "run a manager, edit a template, apply by hand" loop of chezmoi/dotbot/yadm. No daemon, no network dependency for core operations.

> **0.x — expect breaking changes.** `adopt`/`apply` write to your real home directory. Review the plan output before running against a manifest you haven't audited.

## Install

```sh
npm install @studnicky/memoria
```

## Manifest (`memoria.manifest.json`)

```json
{
  "entries": [
    {"source": "zsh/zshrc.tmpl", "target": "~/.zshrc", "mode": "link"}
  ],
  "data": {"email": {"work": "me@corp.com"}},
  "watchGlobs": ["~/.*rc"]
}
```

Every entry's `target` is resolved and validated at load time — an entry that would resolve outside the effective home root is rejected before anything is rendered or written.

## Commands

- `adopt` — copy a live file into managed storage (byte-verified), append a manifest entry, then atomically replace the original with a symlink. `--scan` reports known dotfile candidates on disk that aren't in the manifest yet, without adopting them.
- `apply` — render each manifest entry's template and write it to its target, skipping entries whose live content already matches and seed-once entries already consumed. `--dry-run` reports without writing.
- `diff` — compare rendered entries against live targets (added/modified/removed) without writing.
- `status` — three-way classification: managed, unmanaged (found by `watchGlobs` but not in the manifest), missing.

```sh
npx memoria-tool adopt --path ~/.zshrc
npx memoria-tool apply
npx memoria-tool status
```

`catalog`, `doctor`, `secrets`, `verify`, and `bootstrap` are specced but not yet built in this release.

## License

MIT — see [LICENSE](./LICENSE).
