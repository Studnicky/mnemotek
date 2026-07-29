---
"@studnicky/mnemotek": patch
"@studnicky/git-flow": patch
"@studnicky/redactor": patch
"@studnicky/config-standards": patch
"@studnicky/deps-audit": patch
"@studnicky/inspect": patch
---

Add five standalone CLI/MCP/skill packages built on Mnemotek: `git-flow` (branch validation, hook install, changelog gating, PR status), `redactor` (ANSI/spinner stripping and token-savings tracking), `config-standards` (`.gitignore`/`package.json` check and fix), `deps-audit` (circular imports, orphan modules, unused dependencies), and `inspect` (project's own tsc/eslint runner). None depend on a graph database, agent-orchestration proxy, or live external API.

Also fixes `MnemotekCli`: command runners now have their result printed to stdout (previously only `skill-manifest` printed anything, so every other CLI command silently discarded its output).
