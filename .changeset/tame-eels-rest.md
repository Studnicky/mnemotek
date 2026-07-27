---
"@studnicky/mnemotek": patch
---

Remove the redundant tag-triggered publish workflow (Release via Changesets is now the single publish path). Add local git hooks (`.githooks/pre-commit`, `.githooks/pre-push`) wired automatically via `pnpm install`'s `prepare` script: pre-commit blocks committing generated/local-only paths and lints staged files; pre-push blocks direct pushes to `main`/`develop`, checks branch naming, requires a changeset, and runs the full CI gate before every push.
