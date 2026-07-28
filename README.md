<p align="center">
  <a href="https://studnicky.github.io/mnemotek/">
    <img src="https://raw.githubusercontent.com/Studnicky/mnemotek/main/site/og.png" alt="Mnemotek: a schema-first TypeScript foundation that turns one literal JSON Schema command contract into a validated CLI, MCP tool, agent skill manifest, and slash command." width="1200" />
  </a>
</p>

<h1 align="center">Mnemotek</h1>

<p align="center"><em>Describe an agentic command once. Derive its CLI, MCP tool, skill manifest, and slash command from that single contract.</em></p>

<p align="center">

[![CI](https://img.shields.io/github/actions/workflow/status/Studnicky/mnemotek/ci.yml?branch=main&label=CI)](https://github.com/Studnicky/mnemotek/actions/workflows/ci.yml)
[![Docs](https://img.shields.io/github/actions/workflow/status/Studnicky/mnemotek/docs.yml?branch=main&label=docs)](https://github.com/Studnicky/mnemotek/actions/workflows/docs.yml)
[![Release](https://img.shields.io/github/actions/workflow/status/Studnicky/mnemotek/release.yml?branch=main&label=release)](https://github.com/Studnicky/mnemotek/actions/workflows/release.yml)
[![npm](https://img.shields.io/npm/v/%40studnicky%2Fmnemotek?label=npm&color=cb3837)](https://www.npmjs.com/package/@studnicky/mnemotek)
[![GitHub Packages](https://img.shields.io/badge/GitHub%20Packages-published-2ea44f?logo=github)](https://github.com/Studnicky/mnemotek/pkgs/npm/mnemotek)
[![node](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen)](package.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)](tsconfig.json)
[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

</p>

<p align="center"><strong><a href="https://studnicky.github.io/mnemotek/">Live demo & documentation</a></strong> — one <code>inspect</code> contract rendered as CLI, MCP, SKILL, and COMMAND output</p>

## What it does

Mnemotek takes one literal [JSON Schema](https://json-schema.org/) command contract and derives every surface an agentic tool needs from it, so the CLI flags, the MCP tool schema, the agent skill manifest, and the slash command definition can never drift out of sync with each other.

```mermaid
flowchart LR
    A["Literal JSON Schema\ncommand contract"] --> B(("Mnemotek\nregistry"))
    B --> C["CLI\nCommander + Enquirer"]
    B --> D["MCP tool"]
    B --> E["Agent SKILL.md\nmanifest"]
    B --> F["Slash command"]

    style A fill:#3178c6,color:#fff,stroke:none
    style B fill:#2ea44f,color:#fff,stroke:none
    style C fill:#1f2937,color:#fff,stroke:none
    style D fill:#1f2937,color:#fff,stroke:none
    style E fill:#1f2937,color:#fff,stroke:none
    style F fill:#1f2937,color:#fff,stroke:none
```

- **One source of truth.** The schema is authored as a literal object (`as const satisfies JSONSchema`) — no builder API, no separate type definitions to keep in sync.
- **Typed for free.** [`json-schema-to-ts`](https://github.com/ThomasAribart/json-schema-to-ts) derives TypeScript types directly from the schema at compile time.
- **Validated at the boundary.** [AJV](https://ajv.js.org/) validates every command payload at runtime through `@studnicky/json`'s `SchemaValidator`.
- **Configuration cascade.** Values resolve through schema defaults → package config → JSON config → environment → CLI, in that order.

## Usage

```ts
import { Mnemotek } from '@studnicky/mnemotek';
import { mnemotekContract } from '@studnicky/mnemotek/entities';

const app = new Mnemotek({
  name: 'project-tool',
  description: 'Project automation for humans and agents.'
});

app.command({
  name: 'inspect',
  description: 'Inspect the current project.',
  schema: {
    type: 'object',
    additionalProperties: true
  }
});

const isCommandName = mnemotekContract.CommandNameEntity.validate('inspect');

console.log(app.manifest());
```

## Install

```sh
npm install @studnicky/mnemotek
```

The package also publishes to GitHub Packages:

```sh
echo '@studnicky:registry=https://npm.pkg.github.com' >> .npmrc
npm install @studnicky/mnemotek
```

Entity schemas, types, and validators are exported separately:

```ts
import { mnemotekContract } from '@studnicky/mnemotek/entities';
```

## Packages

This repo is a pnpm workspace. The root `@studnicky/mnemotek` is the library; everything under `packages/*` is a small standalone CLI/MCP/skill tool built on it — each one just defines its commands as a Mnemotek manifest and gets a CLI, MCP adapter, and skill manifest for free. No package here depends on a graph database, an agent-orchestration proxy, or a live external API — each shells out only to tools already on a normal dev machine (`git`, `gh`, the target project's own `tsc`/`eslint`).

| Package | What it does |
|---|---|
| [`@studnicky/git-flow`](packages/git-flow) | Feature/release/hotfix branch orchestration: create, push, PR, CI wait, merge, tag, back-merge |
| [`@studnicky/redactor`](packages/redactor) | Strip ANSI/spinner noise from command output, track byte/token savings |
| [`@studnicky/config-standards`](packages/config-standards) | Check/fix `.gitignore` and `package.json` against a small built-in standards set |
| [`@studnicky/deps-audit`](packages/deps-audit) | Static import-graph analysis: circular imports, orphan modules, unused dependencies |
| [`@studnicky/inspect`](packages/inspect) | Run a project's own `tsc`/`eslint` and report structured pass/fail results |

## Development

```sh
pnpm install
pnpm run ci      # root package first — its test script builds dist/, which packages/* depend on
pnpm -r run ci   # then every package under packages/* (pnpm -r excludes the workspace root by design)
```

The Pages social preview is generated from the canonical transparent logo and the package version:

```sh
pnpm run generate:og
```

Release, publish, and documentation workflows run this generator automatically so the preview stays version-stamped. The local generator requires `rsvg-convert` from librsvg.

## License

MIT — see [LICENSE](./LICENSE).

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) and the [GitHub releases](https://github.com/Studnicky/mnemotek/releases).
