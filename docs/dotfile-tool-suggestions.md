# Dotfile-Derived Tool Suggestions

## Thesis

Every dotfile-manager (chezmoi, dotbot, yadm, GNU Stow) is a human-operated
CLI: a person runs `chezmoi apply` after editing a template by hand. Nobody
has built the agent-operated version — a manager an AI coding agent can drive
directly (via MCP) to actually perform environment setup, not just report on
it. Two independent research passes confirm this gap is real, not assumed:

- **["Dotfiles for Consistent AI-Assisted Development"](https://dylanbochman.com/blog/2026-01-25-dotfiles-for-ai-assisted-development)** — the author wants a workflow that makes "what is synced vs. local-only" obvious for agent skills/commands, and worries the dotfiles repo becomes "a junk drawer."
- **["How to Use AI to Create Config Files from Your Dotfiles"](https://notes.suhaib.in/docs/tech/how-to/how-to-use-ai-to-create-config-files-from-your-dotfiles/)** — uses an LLM as a one-off *generator*, confirming "an agent performs live setup" is still unclaimed territory.

The sharper gap: existing managers are reactive, not verifying. Real
still-open asks for exactly this:

- **[yadm #435](https://github.com/yadm-dev/yadm/issues/435)** — wants files deployed once on first setup, then left alone (no perpetual drift-nagging).
- **[Organizing Dotfiles with Chezmoi, GitHub Actions, and Bats](https://www.ivansantos.me/blog/2025-12-31-organizing-dotfiles-with-chezmoi-github-actions-and-bats)** — author bolts on CI because nothing dry-runs a "new machine" bootstrap before it's needed live.
- **[Dotfiles Secrets in Chezmoi, Without Password Headaches](https://www.mikekasberg.com/blog/2026/01/31/dotfiles-secrets-in-chezmoi.html)** — stopped updating dotfiles altogether because vault re-auth broke sync cadence, undetected until failure.

This means the tools below are meant to be called by an agent with no human
double-checking every step — which changes the risk profile from "a careful
developer might mistype a flag" to "an agent will call this with a
plausible-looking argument and no hesitation." The pitfalls section below is
written with that caller in mind, not a human at a terminal.

## Adversarial review pass

Before finalizing specs, four independent reviewers (correctness/consistency,
security/safety, concurrency/filesystem-safety, scope/substrate/rollout) read
this document against the actual mnemotek source
(`src/core/mnemotek.ts`, `mnemotekCli.ts`, `mnemotekMcp.ts`,
`mnemotekConfiguration.ts`, `packages/git-flow/src/core/{gitFlowApp,gitPrimitives,syncFlow,execCliTool}.ts`,
`packages/config-standards/src/core/{configStandardsApp,gitignoreStandards}.ts`)
rather than the doc's own claims about that source. Two findings changed the
spec structurally; both went through a second correction pass after review.

1. **Two-word commands need a real dispatch mechanism, not hyphenated
   flattening.** `Mnemotek.command()` stores descriptors in a flat
   `Map<CommandNameEntity.Type, …>` (`src/core/mnemotek.ts:66-91`) with no
   nested-subcommand support — confirmed real; the `subcommands` field on
   every manifest command is a vestigial `Object.freeze([])`, unused by
   `MnemotekCli` or `MnemotekMcp`. The first pass at fixing this flattened
   every domain's multi-verb operations into separate hyphenated commands
   (`hooks-install`, `hooks-list`). **That was the wrong fix** — it's
   exactly what a schema argument is for, and inventing a hyphenation
   convention on top of a framework that already has a perfectly good
   mechanism (an `enum` property) is unnecessary surface area. Every
   genuinely multi-verb domain below (hook installation, catalog snippets,
   label sync) is now **one command taking an `action` enum property** —
   its own Entity, per the existing enum convention (`BranchTypeEntity`) —
   with the runner dispatching on `payload.action`. A domain with exactly
   one verb (`secrets`, `sync`, `cleanup`) stays a single flat command with
   no `action` property at all.

   Separately, and more consequentially: **hooks, PR-stacking, and GitHub
   Release automation don't belong bolted onto `git-flow`.** `git-flow`'s
   existing domain is branch/release/hotfix orchestration and commit
   validation; hook installation, wrapping `gh-stack`, and release-note
   generation are three different concerns that happened to share a
   `git:*` prefix in archivum, not one concern. Each becomes its own small
   package — `git-hooks`, `git-stack`, `github-release` — so a consumer who
   wants one doesn't pull in the others, and `git-flow` doesn't grow into a
   dumping ground for "everything git-adjacent archivum used to do."
   `cleanup` and `milestone` stay in `git-flow`, because branch hygiene and
   commit checkpoints genuinely are the same domain as `feature`/`release`/
   `hotfix`, built on the same `GitPrimitives`.

2. **`GitPrimitives.acquireLock()`'s race is fixed, not just documented.**
   Confirmed by direct read: it did `existsSync(path)` then a
   non-exclusive `writeFileSync(path, pid)` — two processes could both pass
   the check and both write, each believing it holds the lock. This is now
   fixed directly in `packages/git-flow/src/core/gitPrimitives.ts`:
   `acquireLock` writes with `{flag: 'wx'}` (exclusive create, throws
   `EEXIST` on collision), and on `EEXIST` probes the recorded pid with
   `process.kill(pid, 0)` — if that throws `ESRCH` (process gone), the
   stale lock is unlinked and reclaimed automatically instead of requiring
   a human to delete the file by hand. `withLock`'s `finally`-based release
   was already correct and is untouched. Typecheck and lint both pass
   against the change. Every new lock file below (`memoria`,
   `config-standards`, `git-hooks`) uses this same corrected shape from the
   start, not a copy of the original race.

Every other finding is folded inline into the relevant package spec below,
plus summarized in the pitfalls table.

## Architecture conventions every spec below follows

Confirmed by reading the existing packages, not assumed:

- **App file** (`src/core/<name>App.ts`): builds a `Mnemotek` instance,
  calls `MnemotekAppFactory.registerCommands(app, {name, description,
  schema, runner, resultSchema?}, ...)`. Command schemas are **literal**
  JSON Schema objects (`additionalProperties: false`, `properties`,
  `type: 'object'`) inlined at the registration call site.
- **No nested CLI subcommands exist in mnemotek core, and none are added
  here.** Every command is one flat name. A domain with multiple related
  verbs (install a hook vs. list installed hooks; apply a catalog entry
  vs. list what's available; pull labels vs. push them) is **one command
  with an `action` enum property** — its own Entity (e.g.
  `HookActionEntity`) — with the runner switching on `payload.action`. A
  domain with only one verb stays a single flat command with no `action`
  property; don't add an enum with one value.
- **Package boundaries follow domain, not convenience or package-count
  minimization.** A capability being "related to git" isn't sufficient
  reason to add it to `git-flow` — see the migration section below for
  where this changed the plan (`git-hooks`, `git-stack`,
  `github-release` are each their own package). Consumers install only
  what they need; nothing here is merged into fewer packages just to keep
  the package count down, and nothing is split further than its actual
  domain boundary either.
- **Entity pattern** (`src/entities/<Name>Entity.ts`): every result shape
  and every closed value set gets a namespace — `Schema`
  (`as const satisfies JSONSchema`) → `Type` (`FromSchema<typeof Schema>`)
  → `validate` (`SchemaValidator.compile<Type>(Schema)` from
  `@studnicky/json`). Enums (e.g. `BranchTypeEntity`, and every new
  `*ActionEntity` below) are Entities too — never a hand-rolled TS union.
- **Runners**: `private static readonly xRunner = (payload: Record<string, unknown>): XEntity.Type => {...}`,
  reading typed fields off `payload` by hand. Root-taking commands use the
  shared `PayloadOptions.resolveRoot(payload)` helper. Git-mutating flows
  wrap the body in `GitPrimitives.withLock(() => {...})`.
- **Array-typed CLI options are space-separated, not comma-separated.**
  Confirmed by reading `src/adapters/mnemotekConfiguration.ts`:
  `coerceArrayValue` returns early when Commander has already produced an
  array, before any comma-splitting logic runs — so a variadic option
  collects `--hosts a b c`, never `--hosts a,b,c`. Schemas below that need
  a scoped list either stay a real array with space-separated documented
  explicitly, or use a `string` type with the runner doing `.split(',')`
  when a single comma-joined value is the more natural CLI shape.
- **Shelling out**: a package-local `ExecCliTool.run(bin, args, {allowFail?, timeout?})`
  wraps `execFileSync`; each package owns its own copy. **`memoria` extends
  this contract** with an `env?: Record<string,string>` option — a
  deliberate, documented deviation from the existing two-package shape,
  required for `verify`'s sandboxing (below). Anyone copying `ExecCliTool`
  for a new package should start from the extended shape, not the original.
- **Lock files**: `GitPrimitives`'s pattern, corrected as described above
  (exclusive-create + stale-pid reclaim). Every package that does
  multi-step file mutation and could plausibly be invoked twice
  concurrently (`memoria`, `config-standards`, `git-hooks`) gets its own
  copy of the corrected shape — not the original race.
- **Atomic writes**: none of the existing mutating code
  (`GitignoreStandards.fix`, `PackageJsonStandards.fix`) writes atomically —
  a pre-existing gap the spec inherits rather than introduces, but every
  *new* write path below (`memoria apply`/`adopt`/`catalog`'s `apply`
  action, `VscodeStandards.fix`, `git-hooks`' dispatcher script writes)
  uses write-to-`${target}.tmp-${pid}` then `renameSync(tmp, target)`,
  since POSIX rename is atomic even when it replaces an existing file.
- **Precedent for "declared vs. actual" already exists**:
  `GitignoreStandards.check/fix` is the exact shape every drift-check rule
  below follows.
- **Precedent for template installation already exists**:
  `PrTemplateInstaller.ensureTemplate()` runs as a side effect inside
  `FeatureFlow`/`ReleaseFlow` — "generate a file from bundled content if a
  known location doesn't already have one" is already live code.
- **Package shape**: `src/bin/cli.ts`, `src/index.ts`, `package.json` with
  `bin: {"<name>-tool": "./dist/bin/cli.js"}`, deps `@studnicky/json` +
  `@studnicky/mnemotek` (`workspace:*`) + `commander` + `enquirer`, devDeps
  `ajv` + `json-schema-to-ts` + `typescript` + `eslint` + `tsx` +
  `@types/node`. New packages (`memoria`, `git-hooks`, `git-stack`,
  `github-release`, `labels-sync`) start at `0.1.0` with
  `publishConfig.registry: npm.pkg.github.com` / `access: public` and
  `files: [dist, README.md, LICENSE]`, matching every existing package
  exactly — no deviation.
- **Correction from an earlier draft**: `git-flow sync` **already ships**
  (`packages/git-flow/src/core/syncFlow.ts`) — the archivum migration table
  reflects this; it is not net-new work.

## Pitfalls and how each is avoided

| Pitfall | Where it would bite | How the spec avoids it |
|---|---|---|
| `bootstrap` as `curl \| bash` with extra steps | `memoria bootstrap --remote <url>` clones and immediately applies an untrusted manifest — nothing restricts a `target` to under `$HOME`, so a malicious manifest can symlink `~/.ssh/authorized_keys` or plant a shell-executing git alias | `bootstrap` defaults to **preview-only** (prints the full `MemoriaDiffResultEntity` it would apply); a second explicit `--apply` flag is required to write anything. `apply` (called by `bootstrap --apply`) rejects any manifest entry whose resolved `target` is not a descendant of `$HOME`. |
| Secret material leaking through the tool itself | `memoria secrets`/`render`/error paths — a rendered template containing an interpolated secret, or a broker error containing vault metadata, is exactly the kind of output an agent will read and could relay elsewhere | A redaction pass runs on every value the secrets broker resolves: the literal resolved bytes never appear in `render`'s output, `MemoriaApplyResultEntity`, or any thrown error message — only a `[secret:<name>]` placeholder does. The real value is written straight from broker to target file, never round-tripped through a string the caller can see. |
| Safety hook with a self-service bypass | `git-hooks`' `install` action bundles a protected-branch check — an env-var escape hatch is something an agent can set on itself to "just get past" a block, silently defeating the hook | No env-var bypass. The only way past `pre-commit-protected-branch` is the standard `git commit --no-verify`, which is already a known, auditable, git-native escape hatch rather than a tool-specific one an agent could discover and normalize using. |
| Secret scan reading as stronger than it is | `pre-commit-secret-scan` is a built-in regex set — this repo's `redactor` package strips ANSI/spinner noise from command output for token savings, it has no secret-detection capability, so there is no stronger tool to fall back from | The check prints an unambiguous warning to stderr on every run ("built-in regex secret scan — coverage is limited to common patterns") so a passing commit is never read as more thoroughly scanned than it actually was. |
| `labels`' `push` action writing to the wrong repo | No preview step means a stale `.github/labels.json` or a typo'd `--repository` writes labels somewhere unintended | `push` defaults to dry-run (prints the planned `gh label create` calls and the resolved `owner/repo`); an `--apply` flag is required to actually write. Still add-only — never deletes or renames. |
| `verify`'s sandbox is escapable | Redirecting `HOME` alone doesn't stop an absolute-path `target`, or a broker shelling to `op`/`gpg` that reads real keychain state via `XDG_CONFIG_HOME`/`GNUPGHOME` regardless of `HOME` | `verify` statically rejects any manifest entry whose resolved `target` isn't a descendant of the sandbox root before rendering anything, and redirects the full env surface (`HOME`, `XDG_CONFIG_HOME`, `XDG_DATA_HOME`, `GNUPGHOME`) for every shelled call made during the run — using `ExecCliTool`'s new `env` option. |
| `adopt` losing the only copy of a file | A move-then-symlink sequence with a crash between steps leaves nothing at the original path | Reordered to be crash-safe: (1) **copy** (not move) into managed storage, byte-verify the copy; (2) write the symlink to a temp path beside the target; (3) atomic `renameSync` over the target. The original is only ever deleted after both the copy is verified and the manifest write is durable. |
| Torn writes under concurrent reads | Two racing `memoria apply` calls, or `diff`/`doctor` reading a file mid-write | Every write in `apply`/`adopt`/catalog's `apply` action and `VscodeStandards.fix` goes through the atomic write-then-rename helper described above. |
| Two concurrent mutating invocations racing | `memoria apply` called twice (an agent retrying after a timeout is a realistic trigger); `config-standards fix --all` racing another `fix` call on the same file | `memoria`, `config-standards`, and `git-hooks` each get their own corrected lock file (exclusive-create + stale-pid reclaim), wrapping every write-capable runner the same way `GitPrimitives.withLock` already wraps `git-flow`'s flows. |
| Hook install orphaning an existing hook setup | A project already using Husky or a hand-placed `.git/hooks/pre-commit` has `core.hooksPath` silently repointed, and its existing hooks simply stop firing with no error | Before writing, `git-hooks`' `install` action reads the current `core.hooksPath` and checks for a non-sample `.git/hooks/*` or `.husky/` directory. If either is in play and isn't this tool's own directory, it refuses and reports what it found; `--force` is required to override knowingly. |
| Catalog supply-chain risk | Bundled catalog resources ship inside the npm package with no review step; a compromised publish could ship a malicious `git config` alias that's executable | Git-domain catalog entries (`git/aliases-core`, `git/identity`) are applied as a diffable config-file merge (same mechanism as the gitignore domain), not executed through `git config` directly, and catalog's `apply` action always prints the exact lines it's about to write before writing them. |
| Silent, ambiguous result-schema growth | An earlier draft proposed a `rules?: string[]` filter on `config-standards check`, but the result entity's `required: ['gitignore', 'packageJson']` means an omitted key would fail to type-check, contradicting the doc's own "additive, non-breaking" claim | Dropped the general rule filter. `check` always evaluates every rule and always returns every key — no entity contradiction. The two rules that need a live `gh api` call (`codeowners`'s team-existence check, `template-sync`) take a separate `networked?: boolean` (default `false`) that only gates the network portion of *those two* checks. |
| `render`'s output described ambiguously | "Prints it" doesn't distinguish CLI from MCP behavior — `MnemotekCli` always `JSON.stringify`s a defined result (so a multi-line template prints `\n`-escaped, not raw), while `MnemotekMcp.formatToolResult` special-cases a bare string and emits it raw | Documented explicitly per transport in the command spec below instead of left as "prints it." |
| Command names invented outside mnemotek's actual capabilities | An earlier draft used two-word CLI invocations (`hooks install`) that `Mnemotek`'s flat command registry can't represent, and separately hyphenated them into names like `hooks-install` that read as unrelated top-level verbs | Every multi-verb domain uses a single command with an `action` enum property (see Architecture conventions) — achievable with existing schema/runner mechanics, no core framework change, and no invented naming convention. |

## Substrate — build this first

Everything above implies five pieces of shared machinery that must exist
*before* any command that depends on them is implemented — building a
command first and retrofitting safety underneath it is exactly the ordering
mistake this review pass exists to catch:

1. **Corrected lock-file helper**, per package that needs it (`memoria`,
   `config-standards`, `git-hooks`) — exclusive-create + stale-pid reclaim,
   as specified above. Blocks: `memoria apply`/`adopt`/catalog's `apply`
   action, `config-standards fix`, `git-hooks`' `install` action.
2. **Atomic write-then-rename helper**, per package — blocks the same
   command set, plus `VscodeStandards.fix`.
3. **`ExecCliTool`'s `env` option**, in `memoria` only for now — blocks
   `verify` (env-sandboxing) and `secrets` (broker session checks that
   shouldn't inherit the caller's full environment unexamined).
4. **Test-isolation root** — `HostFacts` and `ManifestStore` accept an
   optional `homeRoot` override (or read a `MEMORIA_HOME` env var) used by
   `memoria`'s own test suite. This is broader than `verify`'s
   already-specified sandboxing: without it, `adopt`/`apply`'s own
   `tests/**/*.spec.ts` (the existing repo-wide test convention) would
   mutate the CI runner's real `$HOME`, which is a rollout blocker, not a
   style preference. Blocks: any test coverage for `memoria` at all.
5. **`DriftEngine`'s home, decided explicitly**: it stays **`memoria`-internal**
   (`packages/memoria/src/core/driftEngine.ts`), and each `config-standards`
   rule class hand-rolls its own compare — consistent with the existing
   `ExecCliTool`-duplicated-per-package precedent, and avoiding a new
   internal-only shared package for a handful of ~20-line compares.

None of these are commands themselves — they produce no user-visible
behavior on their own — which is exactly why it's easy to skip them and
start writing `apply` directly. Don't; every mitigation in the pitfalls
table above assumes one of these five already exists.

## Flagship: `memoria`

*(Latin "memory" — mnemotek already means "mnemonic technology"; this is the
package that actually remembers and replays a developer's environment. Not a
final name — swap freely — but the shape below is the point.)*

**Package**: `@studnicky/memoria`, bin `memoria-tool`, description "Agent-native
dotfile manager: templated apply, drift status, seed-once files, dry-run
verify, and a bundled snippet catalog. No daemon, no network dependency for
core operations." Version `0.1.0`; README carries an explicit "0.x, expect
breaking changes — `bootstrap`/`apply` write to your real home directory,
review the plan output before passing `--apply`" disclaimer, given how much
write-capable surface area ships at once.

### File tree

```
packages/memoria/
  src/
    bin/cli.ts
    core/
      memoriaApp.ts                 # command registration — one command per verb;
                                     # action-enum dispatch for the one multi-verb
                                     # domain (catalog)
      execCliTool.ts                # execFileSync wrapper (allowFail, timeout, env)
      lockFile.ts                   # exclusive-create + stale-pid reclaim
      atomicWrite.ts                # write-to-tmp then renameSync
      hostFacts.ts                  # os.hostname()/platform()/arch(); homeRoot override for tests
      manifestStore.ts              # read/write memoria.manifest.json; homeRoot override for tests
      templateRenderer.ts           # {{ dotted.path }} substitution, no conditionals/loops
      driftEngine.ts                # shared expected-vs-actual diff (memoria-internal only, see Substrate)
      linkPlanner.ts                # resolves link|copy per entry, applies os/host filters, rejects out-of-sandbox targets
      secretsBroker.ts              # detect + JIT-fetch via op/age/gpg/pass, with redaction pass
      catalog/
        index.ts                    # catalog registry (domain -> entries -> bundled resource path)
        resources/
          gitignore/node.gitignore, macos.gitignore, jetbrains.gitignore, ...
          git/aliases-core.gitconfig, git/commit-template.txt
      doctor/
        rcHygieneCheck.ts
        secretsScanCheck.ts
        startupProfileCheck.ts
        envrcAuditCheck.ts
        archiveToolsCheck.ts
      constants/MemoriaAppConstants.ts
    entities/
      MemoriaManifestEntryEntity.ts
      MemoriaApplyResultEntity.ts
      MemoriaDiffResultEntity.ts
      MemoriaStatusResultEntity.ts
      MemoriaVerifyResultEntity.ts
      MemoriaSecretsBrokerEntity.ts      # enum: 1password | age | gpg | pass | none
      MemoriaCatalogActionEntity.ts      # enum: list | apply
      MemoriaCatalogDomainEntity.ts      # enum: gitignore | git | agent-config
      MemoriaDoctorCheckEntity.ts        # enum: rc-hygiene | secrets-scan | startup-profile | envrc-audit | archive-tools
      MemoriaDoctorResultEntity.ts
      index.ts
    index.ts
  package.json
  tsconfig.json
```

### Manifest format (`memoria.manifest.json` — the "declared state")

```json
{
  "entries": [
    {
      "source": "zsh/zshrc.tmpl",
      "target": "~/.zshrc",
      "mode": "link",
      "os": ["darwin", "linux"],
      "seedOnce": false
    },
    {
      "source": "local/npmrc.tmpl",
      "target": "~/.npmrc",
      "mode": "copy",
      "seedOnce": true
    }
  ],
  "data": {
    "email": {"work": "me@corp.com", "personal": "me@example.com"}
  },
  "watchGlobs": ["~/.*rc", "~/.config/**"]
}
```

`target` is validated at load time (before any render/write) to resolve to a
descendant of the current `homeRoot` (real `$HOME`, or the sandboxed root
under `verify`/tests) — an entry that fails this check is rejected with the
manifest load itself, not discovered mid-apply.

`MemoriaManifestEntryEntity.Schema` (literal, mirrors `SyncFlowResultEntity`'s
shape exactly):

```ts
export namespace MemoriaManifestEntryEntity {
  export const Schema = {
    additionalProperties: false,
    properties: {
      mode: {enum: ['link', 'copy'], type: 'string'},
      os: {items: {type: 'string'}, type: 'array'},
      host: {items: {type: 'string'}, type: 'array'},
      seedOnce: {type: 'boolean'},
      source: {type: 'string'},
      target: {type: 'string'}
    },
    required: ['source', 'target', 'mode'],
    type: 'object'
  } as const satisfies JSONSchema
  export type Type = FromSchema<typeof Schema>
  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema)
}
```

`MemoriaCatalogActionEntity.Schema` — the one enum needed for memoria's one
multi-verb domain, same shape as `BranchTypeEntity`:

```ts
export namespace MemoriaCatalogActionEntity {
  export const Schema = {
    enum: ['list', 'apply']
  } as const satisfies JSONSchema
  export type Type = FromSchema<typeof Schema>
  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema)
}
```

### Commands

| Command | Schema properties | Result entity | Runner does |
|---|---|---|---|
| `adopt` | `path?: string`, `scan?: boolean` | `MemoriaApplyResultEntity` (`adopted: string[]`) | If `path` given: copies the live file into the manifest's source tree, byte-verifies the copy, writes a `link`-mode manifest entry, then atomically symlinks the target over the original (see Pitfalls table — never a bare move). If `scan`: checks a fixed candidate list (`.zshrc`, `.bashrc`, `.gitconfig`, `.gitignore_global`, `.vimrc`, `.tmux.conf`) for files present on disk but absent from any manifest entry, and reports them for review — never auto-adopts on scan. |
| `apply` | `manifest?: string` (default `./memoria.manifest.json`), `dryRun?: boolean`, `host?: string`, `os?: string` | `MemoriaApplyResultEntity` | Acquires `memoria`'s lock file. For each entry not filtered out by `os`/`host`: renders source via `TemplateRenderer` against `data` + `HostFacts`, writes atomically to `target` (skip if content already byte-matches — idempotent). Entries with `seedOnce: true` apply once, then are marked `consumed` in the manifest so future applies/diffs ignore them (answers yadm #435). Releases the lock in a `finally`, mirroring `GitPrimitives.withLock`'s correct release behavior. |
| `render` | `file: string` (required) | bare string (schema-legal per `CommandResultEntity`'s string variant) | Debug/preview: renders one template file against current host facts. **Transport-specific output**: over MCP, `MnemotekMcp.formatToolResult` emits the raw string; over the CLI, `MnemotekCli` `JSON.stringify`s it like every other result, so a multi-line template prints `\n`-escaped — documented here explicitly rather than left as "prints it." |
| `diff` | `manifest?: string`, `host?: string`, `os?: string` | `MemoriaDiffResultEntity` (`added/modified/removed: string[]`) | Runs `DriftEngine.compare` (Algorithms below) between rendered-expected and live-actual, reports without writing. |
| `status` | `manifest?: string` | `MemoriaStatusResultEntity` (`managed/unmanaged/missing: string[]`) | Three-way classification: manifest entries present+correct vs. files matched by `watchGlobs` but absent from any entry vs. entries whose target doesn't exist yet. |
| `verify` | `manifest?: string`, `keepArtifacts?: boolean` | `MemoriaVerifyResultEntity` (`ok: boolean`, `failures: string[]`) | Rejects any manifest entry whose `target` isn't a descendant of a fresh temp sandbox root, then runs `apply` against that sandbox with `HOME`, `XDG_CONFIG_HOME`, `XDG_DATA_HOME`, and `GNUPGHOME` all redirected via `ExecCliTool`'s `env` option — not `HOME` alone. Reports any render/link/broker failure before the manifest is ever run against a real machine. Documented v1 limitation: `$HOME`-plus-`XDG`-redirection isolation, not a real container — won't catch OS-specific binary absence the way Docker isolation would. |
| `bootstrap` | `remote: string` (required, git URL), `branch?: string`, `apply?: boolean` (default `false`) | `MemoriaDiffResultEntity` when `apply` is false, `MemoriaApplyResultEntity` when true | Shallow-clones `remote` into a temp dir. **Defaults to preview-only** — runs `diff` against the clone's manifest and returns the plan without writing anything. Only writes when `apply: true` is explicitly passed, and even then routes through the same `target`-containment check every other write path uses. `npx @studnicky/memoria bootstrap --remote <url>` leaves no persistent install either way (answers chezmoi #1410). |
| `secrets` | *(none — single verb, no `action` property)* | `MemoriaSecretsBrokerEntity` + `{sessionValid: boolean}` | Detects the first present broker via `command -v op/age/gpg/pass`, runs that broker's own session-check command, and reports staleness *before* an `apply` run needs it (answers the Kasberg mid-sync-failure pain point). Never surfaces resolved secret values — only broker identity and session state. |
| `catalog` | `action: MemoriaCatalogActionEntity.Type` (required), `domain?: MemoriaCatalogDomainEntity.Type` (used with `action: 'list'`), `entry?: string` (required with `action: 'apply'`, e.g. `gitignore/node,macos`, `git/aliases-core`), `root?: string` | `list` returns a plain array; `apply` reuses `MemoriaApplyResultEntity` | `list`: lists bundled catalog entries, optionally filtered by `domain`. `apply`: resolves `entry` to its bundled resource file(s), prints the exact content about to be written, then merges/writes: gitignore entries merge into `.gitignore`; git-domain entries (`aliases-core`, `identity`) merge into a diffable config-file fragment rather than being executed through `git config` directly (see Pitfalls table). No network fetch — resources ship in the npm package. |
| `doctor` | `checks?: MemoriaDoctorCheckEntity.Type[]`, `rc?: string[]` (default `[~/.zshrc, ~/.bashrc, ~/.profile]`) | `MemoriaDoctorResultEntity` (`{check: string, ok: boolean, findings: string[]}[]`) | Runs the selected diagnostics from `core/doctor/*`; each is a standalone pure-function check over file contents plus, where needed, one shell-out (`direnv status`, `command -v`, `time <shell> -i -c exit`). |

### Algorithms worth specifying precisely

**Template grammar (`templateRenderer.ts`)** — deliberately minimal vs.
chezmoi's full Go-template+sprig: `{{ dotted.path }}` substitution only, no
conditionals or loops. Per-host/OS branching happens at the *manifest entry*
level (`os`/`host` filter arrays), not inside a template — a stated scope
cut, not an oversight. Resolution order for `dotted.path`: `manifest.data`
first, then `HostFacts` (`hostname`, `os`, `arch`) as a fallback namespace.

**Drift engine (`driftEngine.ts`)** — memoria-internal only (see Substrate
item 5), shared by `apply`, `diff`, and `status`:

1. For every manifest entry not filtered out by the current `os`/`host`,
   render its source and compute the expected target content + path.
2. Compare against the live filesystem: target missing → `missing`; target
   exists with different content (byte compare — files here are small text
   configs, hashing buys nothing) → `modified`; matches → managed/no-op.
3. Separately, expand `watchGlobs` and subtract every manifest `target` from
   the result set → whatever remains is `unmanaged`.

**Hook-dispatcher pattern** — used by `git-hooks`' `install` action (below),
not `memoria` — described once there rather than duplicated.

## Archivum migration (corrected against actual git-flow state)

Archivum (private git-workflow tool) is being retired; its git-facing
command surface folds into either `git-flow` or one of three new,
domain-scoped packages — not all crammed into `git-flow` regardless of fit
(see Adversarial review pass, finding 1). `packages/git-flow` currently
registers exactly six commands: `feature`, `release`, `hotfix`, `sync`,
`commit-check`, `commit-type`.

| Archivum command | Disposition | Net-new? |
|---|---|---|
| `git:feature`, `git:release`, `git:hotfix` | Already covered by `git-flow` — `feature`/`release`/`hotfix` exist with equivalent scope (PR create, CI wait, merge, tag, back-merge). | No — verify parity only. |
| `git:sync` | **Already covered** by `git-flow` — `SyncFlow.syncFlow()` fetches, prunes, fast-forwards main+develop, returns to original branch. | No. |
| `git:cleanup` | Folds into `git-flow` as a new `cleanup` command (same domain — branch hygiene, same `GitPrimitives`). Schema: `{dryRun?: boolean}`. Lists merged branches (`git branch --merged`) minus protected names, deletes with `git branch -d`, runs `git gc` after. Wrapped in `GitPrimitives.withLock`. | Yes, within `git-flow`. |
| `git:milestone` | Folds into `git-flow` as a new `milestone` command (same domain — commit checkpoints, alongside `commit-check`/`commit-type`). Schema: `{message?: string}`. Creates a WIP checkpoint commit. Jira coupling from archivum is **dropped, not ported** — ticket context stays MCP-gated elsewhere, never a hard dependency of a public package. Archivum's own `git:milestone` prints a deprecation notice pointing at `git-flow milestone` for at least one release before removal. | Yes, within `git-flow` (narrower than archivum's version). |
| `git:hooks` | **Not folded into `git-flow`** — different domain (repository safety infrastructure, not branch/release orchestration). New standalone package `git-hooks`, single command `hooks` with `{action: HookActionEntity.Type ('install'\|'list'), hooks?: string[], dir?: string default '.githooks', force?: boolean}`. `install`: before writing, checks the current `core.hooksPath` and for a non-sample `.git/hooks/*` or `.husky/` directory; refuses with a report if either is already in play and isn't this tool's own dir (`force: true` overrides knowingly — see Pitfalls table). Otherwise runs `git config core.hooksPath <dir>` and writes one dispatcher script per requested hook name (mirrors henrik/dotfiles' `hookname-*` loop): `for f in "$(dirname "$0")/pre-commit-"*; do [ -x "$f" ] && "$f" "$@" || exit 1; done`. Bundled checks ship as their own executable files: `pre-commit-protected-branch` (blocks direct commits to main/develop — no env-var bypass, `--no-verify` is the only escape), `pre-commit-large-file` (configurable size ceiling), `pre-commit-secret-scan` (a built-in regex set for common secret patterns — this repo has no dedicated secret-scanning package to shell out to; `redactor` strips ANSI/spinner noise for token savings and has no secret-detection capability — the check prints a loud warning on every run that its coverage is limited to common patterns). `list`: reports which hooks are currently installed under the configured `dir`. Real request this answers: [igor-krupenja/dotfiles#282](https://github.com/igor-krupenja/dotfiles/issues/282). | Yes (new package). |
| `git:stack` | **Not folded into `git-flow`** — different domain (stacked-PR workflow, not this package's single-branch feature/release/hotfix model). New standalone package `git-stack`, single command `stack` with `{action: string (required), args?: string[]}` — a thin passthrough shelling to `gh stack <action> <...args>`, not a reimplementation of stacked-PR logic. Consumers who don't use stacked PRs never install this package. | Yes (new package). |
| `git:github-release` | **Not folded into `git-flow`** — different domain (GitHub Release notes, not branch orchestration). New standalone package `github-release`, single command `release` (`{tag?: string, notes?: string}`) shelling to `gh release create --generate-notes`. | Yes (new package). |
| `labels:pull`, `labels:push` | New standalone package `labels-sync` (labels aren't a branch/release concern either). See below. | Yes (new package). |
| `scaffold`, `list`, `run` (generic script registry) | Dropped — no public-toolkit analogue, forcing a fold-in would add scope with no evidenced demand. | Dropped. |
| `integration` (connectivity status) | Dropped — `gh auth status` already covers the one thing developers actually check. | Dropped. |

### New package: `git-hooks`

Spec is inline in the table above (the strongest evidenced finding of the
whole review, [igor-krupenja/dotfiles#282](https://github.com/igor-krupenja/dotfiles/issues/282)).
**Package**: `@studnicky/git-hooks`, bin `git-hooks-tool`, version `0.1.0`.
Uses its own corrected lock file around the `install` action (two
concurrent `hooks --action install` calls writing dispatcher scripts is the
same class of race as `memoria apply` — see Substrate item 1).

### New package: `git-stack`

**Package**: `@studnicky/git-stack`, bin `git-stack-tool`, version `0.1.0`.
Deliberately thin — `gh-stack` owns all the actual stacked-PR state and
logic; this package exists only so `stack --action <verb>` is
schema-derived (CLI + MCP + skill manifest) like everything else in the
toolkit, rather than requiring an agent to shell out to `gh stack` directly
with no schema to validate against.

### New package: `github-release`

**Package**: `@studnicky/github-release`, bin `github-release-tool`,
version `0.1.0`. Single command, no `action` property needed (one verb).

### New package: `labels-sync`

**Package**: `@studnicky/labels-sync`, bin `labels-sync-tool`, version
`0.1.0`. GitHub-only (no Jira sync — stays a private-repo concern).

- Entities: `LabelsActionEntity` (enum: `pull` | `push`);
  `LabelEntity {name: string, color: string, description?: string}`;
  `LabelSyncResultEntity` — `{labels: LabelEntity.Type[]}` when
  `action: 'pull'`, `{planned: string[], created: string[]}` when
  `action: 'push'`.
- Single command `labels` — `{action: LabelsActionEntity.Type (required),
  repository?: string, file?: string, apply?: boolean}` (default
  `.github/labels.json`, `apply` defaults `false`).
  - `pull`: shells to `gh api repos/:owner/:repo/labels --paginate`, writes
    `.github/labels.json` atomically.
  - `push`: reads the file, diffs against `gh api .../labels`, prints the
    resolved `owner/repo` and the planned `gh label create` calls. Only
    executes them when `apply: true` is explicit — never deletes or
    renames either way.

## `config-standards` expansion

`packages/config-standards/src/core/configStandardsApp.ts` currently
registers two commands (`check`, `fix`) delegating to
`GitignoreStandards`/`PackageJsonStandards`, each a static class with a
`check(root): XCheckResultEntity.Type` / `fix(root): XFixResultEntity.Type`
pair. Every rule below is a new class in that exact shape — no new commands,
no new package, and (per the pitfalls fix above) no rule-filtering flag that
would make result keys conditionally absent.

| Rule class | `check()` reads | `check()` returns (shape) | `fix()` | Source pattern |
|---|---|---|---|---|
| `EditorconfigStandards` | `.editorconfig` | `{ok, missing: string[]}` | Appends missing baseline lines — same append logic as `GitignoreStandards.fix`, but through the new atomic-write helper | copy-pasted `.editorconfig` boilerplate |
| `VscodeStandards` | `.vscode/extensions.json`, `.vscode/settings.json`, plus presence of `.eslintrc*`/`.prettierrc*`/`tailwind.config.*` | `{ok, missingRecommendations: string[], missingSettings: string[]}` | Merges missing extension IDs and the `formatOnSave`/`codeActionsOnSave`/`defaultFormatter` triad via read-merge-atomic-rewrite (this is the one rule that does a full-file JSON rewrite, so it's the primary reason the atomic-write helper and the package's own lock file are required substrate, not optional polish) | MS `extensions.json` shape, common ESLint/Prettier pairing |
| `PrettierStandards` | `.prettierrc*` | `{ok: boolean}` | Scaffolds a minimal `.prettierrc.json` via an Enquirer prompt when absent | boilerplate re-typed from memory |
| `StyleDriftStandards` | `.editorconfig`, `.prettierrc*`, `.eslintrc*`/`eslint.config.*` (indent/quote fields only) | `{ok, conflicts: {field: string, sources: Record<string, unknown>}[]}` | **Check-only** — resolving a genuine conflict needs judgment, not a mechanical default | independently authored, silently conflicting |
| `VersionPinStandards` | `.nvmrc`, `.node-version`, `.tool-versions`, `package.json#engines.node` (whichever exist) | `{ok, disagreements: {file: string, value: string}[]}` | `fix --from <file>` propagates one source's value to the others | fragmentation across version managers |
| `EnvcheckStandards` | source tree via `rg` for `process.env.FOO`/`import.meta.env.FOO`, diffed against `.env.example` keys | `{ok, undocumented: string[], unused: string[]}` | **Check-only** | classic drift; npm prior art (sync-dotenv, envsync) confirms demand |
| `CodeownersStandards` | `CODEOWNERS`, `git ls-files` always; referenced user/team existence via `gh api` only when `networked: true` | `{ok, uncoveredPaths: string[], staleOwners: string[], networkSkipped: boolean}` | **Check-only** | stale entries invisible until a PR needs routing |
| `DevcontainerStandards` | `devcontainer.json`, `devcontainer-lock.json` | `{ok, unpinnedFeatures: string[], staleLock: boolean}` | **Check-only** | drift between the two files, pure JSON parsing |
| `IssueTemplatesStandards` | `.github/ISSUE_TEMPLATE/config.yml`, template front-matter | `{ok, brokenReferences: string[], missingFrontMatter: string[]}` | **Check-only** | generalizes this repo's own `PrTemplateInstaller` precedent past PR templates |
| `TemplateSyncStandards` | local copy vs. upstream, only fetched when `networked: true` | `{ok, staleness: 'current' \| 'behind' \| 'unknown', networkSkipped: boolean}` | **Check-only, reports only** — auto-applying an upstream diff is exactly the kind of decision that shouldn't be silent | scaffolded once, never revisited |

`ConfigStandardsCheckResultEntity`/`ConfigStandardsFixResultEntity` grow one
required (not optional) property per rule, since every rule always runs and
is always present in the result. The only scoping knob is `networked?: boolean`
(default `false`) on `check`, which gates the `gh api`/fetch portion of
`codeowners` and `template-sync`. `codeowners` has genuine local-only work
(path coverage via `git ls-files`) that runs either way, reporting
`networkSkipped` accordingly. `template-sync` does not — comparing a local
file against upstream has no meaningful computation without the fetch, so
when `networked` is false it short-circuits directly to
`{networkSkipped: true, ok: true, staleness: 'unknown'}` rather than running
a "local-only" step that doesn't actually exist for this rule. Caught during
the post-build adversarial review below; this doc originally claimed both
rules always run local-only work, which was true for `codeowners` but never
accurate for `template-sync`.

## Build order

Wave 0 must land first — everything else depends on at least one piece of
it (see Substrate section above for why each exists):

**Wave 0 — shared substrate** (no user-visible commands): corrected
lock-file helper, atomic write-then-rename helper, `ExecCliTool`'s `env`
extension, `MEMORIA_HOME`/`homeRoot` test-isolation override, `DriftEngine`
placement decided (memoria-internal, no shared package). The
`GitPrimitives.acquireLock()` fix is already landed (see Adversarial review
pass, finding 2), so `git-hooks` inherits a correct pattern to copy rather
than needing to design its own from scratch.

**Wave 1** (parallelizable — disjoint packages, no cross-dependencies):
- `memoria` core: `adopt`/`apply`/`diff`/`status`, built on Wave 0's lock
  and atomic-write helpers from the start — not retrofitted after.
- `git-hooks`: `hooks` (both actions), self-contained, strongest evidence.
- `config-standards`'s `envcheck` and `version-pin` rules — no `fix()`
  complexity, no locking needed (pure reads), highest immediate CI value.

**Wave 2** (each depends on its own Wave 1 sibling, still parallelizable
across tracks):
- `memoria`: `catalog`, `doctor`, `secrets`, `verify` (needs the Wave 0
  `env` extension), `bootstrap` (needs `apply` and `diff` from Wave 1,
  ships preview-only by default).
- `git-flow`: `cleanup` (mechanical).
- `git-stack`, `github-release`: thin wraps of already-installed `gh`
  tooling, no dependency on anything else in this doc.
- `config-standards`: `editorconfig`/`vscode`/`prettier` (need the Wave 0
  atomic-write helper and package-level lock — `vscode`'s full-file rewrite
  is the one that actually requires them), then `style-drift`/`codeowners`/
  `devcontainer`/`issue-templates`/`template-sync` (check-only, lower risk,
  can land in any order once `envcheck` has proven the rule-class shape).

**Wave 3**:
- `git-flow milestone` (the Jira-optional gating needs care — it's the one
  place archivum's scope could silently creep back in) plus its
  deprecation-notice companion change in archivum itself.
- `labels-sync` (small, standalone, low-risk — could also slot into Wave 1
  or 2 if capacity allows; sequenced last only because nothing else depends
  on it and nothing about its scope changed after review).

**Correction from an earlier draft**: `pre-commit-secret-scan` was originally
specced to shell out to this repo's `redactor` package as a stronger primary
scanner, falling back to a built-in regex set if it wasn't on `PATH`.
`redactor` strips ANSI/spinner noise from command output for token
savings — it has no secret-detection capability, so that dependency was a
naming-confusion mistake, not a real integration. `git-hooks` has no
runtime dependency on any other package in this toolkit; the built-in
regex set is the only secret-scan mechanism, unconditionally.

## Build status

All of the above has been built. Seven packages (new: `memoria`, `git-hooks`,
`git-stack`, `github-release`, `labels-sync`; expanded: `git-flow`,
`config-standards`) landed via disjoint parallel builds per the wave order
above, each independently verified (typecheck, lint, and a real test run —
not just the builder's own claim). Whole-tree `pnpm -r run ci` across all 11
packages plus the root passes clean: 121 package-level tests + 15 root tests,
0 failures.

## Post-build adversarial review

Building surfaces defects a spec review can't — four more reviewers (spec
fidelity, security/safety, concurrency/consistency, test quality) then read
the actual shipped code, independent of the doc's own claims about it. Two
were safety-critical and are now fixed, not just documented as known gaps:

1. **`memoria verify` was silently mutating the real `memoria.manifest.json`.**
   Its sandbox correctly redirected where seed-once *targets* resolved, but
   `ApplyEngine.run` still called `ManifestStore.markConsumed` against the
   **real** manifest file path, with no lock — a "fully isolated" command
   permanently corrupting real state, unlocked, on every seed-once entry it
   touched. Fixed by adding a `trackConsumed` option to `ApplyEngine`
   (defaults `true` for `apply`/`bootstrap --apply`, `false` for `verify`),
   plus a regression test asserting the real manifest file is byte-identical
   before and after a `verify` run against a seed-once entry.
2. **`memoria adopt` ran with no lock at all**, unlike every other mutating
   memoria command — a classic lost-update race on concurrent `adopt` calls
   (plausible for a parallelizing agent). Fixed by wrapping it in the same
   `LockFile.withLock` every other mutating command already uses, plus a
   regression test proving `adopt` refuses to run while the lock is held.

Also fixed, lower severity:

- **Symlink-unaware home-root containment.** `ManifestStore.isDescendant`
  compared paths lexically; a symlinked intermediate directory under `$HOME`
  (`~/.config -> /etc`) would pass the check while the real write landed
  outside it. Fixed by resolving through the deepest *existing* ancestor's
  `realpathSync` before comparing, without requiring the target itself
  (usually not yet created) to exist.
- **`bootstrap`'s `git clone` had no timeout** — an unreachable/hanging
  remote blocked the command indefinitely with no recovery path for an
  autonomous caller. Fixed with a 30s default.
- **`catalog apply`'s preview used a raw `process.stdout.write`** instead of
  returning the content — harmless today (no MCP stdio server is wired up
  anywhere in this codebase yet), but the wrong pattern for when one is,
  since an unstructured stdout write from inside a command runner would
  corrupt a JSON-RPC stream. Fixed by adding an optional `preview: string[]`
  field to `MemoriaApplyResultEntity` and returning the content there instead.
- **`pre-commit-secret-scan`'s regex required a quote character** after
  `:`/`=`, missing common unquoted `.env`-style secrets (`API_KEY=sk-...`)
  entirely — a coverage gap that gave false confidence rather than an
  injection risk (the script was already confirmed safe from shell
  injection: diff content is piped as data, never interpolated). Fixed by
  making the quote optional.
- **Four call sites built an order-sensitive CLI argument list as a literal
  array** (`templateSyncStandards.ts`, `memoriaApp.ts`'s `secretsRunner`,
  `archiveToolsCheck.ts`, `envrcAuditCheck.ts`) instead of the
  `toArgumentList(...parts)` rest-param pattern every other call site in
  the toolkit already uses — the exact shape a future `eslint --fix` could
  silently reorder and break, per this repo's `perfectionist/sort-arrays`
  rule (independently hit and worked around by six different builders
  during the build phase). Fixed by routing all four through the same
  pattern.
- **Two pre-existing `config-standards` fixers** (`GitignoreStandards.fix`,
  `PackageJsonStandards.fix`) wrote directly instead of through the
  package's own new `AtomicWrite` helper, unlike every rule added this
  round — a crash-safety inconsistency within the same package, not a new
  gap introduced by this build. Fixed for consistency.

**Confirmed as already correct, not deviations**: `bootstrap`'s preview-only
default and target-containment reuse; `verify`'s four-variable env
redirection (`HOME`/`XDG_CONFIG_HOME`/`XDG_DATA_HOME`/`GNUPGHOME`);
`catalog`'s git-domain fragment-file merge never shelling to `git config`;
`git-hooks install`'s Husky/existing-hooks refusal and the protected-branch
check's lack of an env-var bypass; `labels-sync push`'s structural
`apply`-gated code path (not a bypassable flag check); `config-standards
check`'s all-12-keys-always-present result shape; `git-flow milestone`'s
zero Jira coupling; and the Entity pattern's consistent use across every new
enum and result shape.

**Deliberately not changed**: `catalog apply`'s `root` option has no path
containment — flagged by the security review, but this matches every other
`--root`-taking command already in the toolkit (`config-standards`,
`git-flow`), and catalog content is fixed/bundled rather than
attacker-controlled, so adding a special case here would be an
inconsistency, not a fix. `memoria verify`'s env-var redirection mutates
the real process's `HOME`/`XDG_*` rather than routing through
`ExecCliTool`'s `environment` option as originally specced — inert today
since nothing `verify` calls shells out, restored in a `finally`, and left
as a known mechanism deviation rather than a deeper refactor for a
currently-unexercised path.

**Test-coverage gaps identified, not yet closed** (tracked for a follow-up
pass, not blocking): `git-hooks`' dispatcher script is never executed
end-to-end in tests (only checked for existence/executable bit); `git-stack`
and `github-release`'s command handlers are never invoked through
`app.run()` (their argv-builders and exec wrappers are each unit-tested in
isolation, but the integration point between them isn't); `labels-sync`'s
diff logic matches by name only and has no test for a same-name,
different-color label; `memoria apply`'s unconditional overwrite of
user-modified drifted content has no test (only the no-op/skip path does);
and `memoria diff`/`status` are asserted present in the command manifest but
never actually invoked via `app.run()` in any test.

## Out of scope, deliberately

- **OS-level preference toggling** (`defaults write`, thoughtbot/laptop-style) — too invasive to run unattended even from an agent; if it ships at all, it's an explicit opt-in `memoria catalog` entry per setting, never a blanket sweep.
- **Jira-specific coupling** anywhere in the public toolkit — archivum's Jira integration doesn't fold in; ticket context stays MCP-gated and optional, never a hard dependency for a public package. `git-flow milestone` is the one place this needs active vigilance during implementation, and the one place archivum itself needs a deprecation notice rather than a silent cutover.
- **Reimplementing a package-manager or version-manager itself** (no bundled Node/asdf/mise replacement) — `memoria`/`config-standards` check and pin versions, they don't install runtimes.
- **Reimplementing `gh-stack`'s stacked-PR logic** — `git-stack` is a thin, schema-derived passthrough, not a competing implementation.
- **Real OS-level container isolation for `memoria verify`** — v1 uses `$HOME`-plus-`XDG`-variable redirection into a temp dir, not Docker; documented as a known gap (won't catch OS-specific binary absence), not silently glossed over.
- **A general result-filtering flag on `config-standards check`** — considered and dropped after review; see Pitfalls table. `networked` is the one narrow exception, and only for the two rules that actually need it.
- **A core mnemotek change to add real nested CLI subcommands** — considered and dropped; the `action`-enum-property pattern solves the same domain-grouping problem with zero core framework risk (see Adversarial review pass, finding 1).
