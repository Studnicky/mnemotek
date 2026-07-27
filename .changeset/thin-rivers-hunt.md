---
"@studnicky/mnemotek": patch
---

Harden CI/CD: pin all GitHub Actions to commit SHAs, extract a shared pnpm node-setup composite action, enable CodeQL default setup, and add security audit, license compliance, and changeset-presence checks. Fix the CI workflow missing `NODE_AUTH_TOKEN` (GitHub Packages requires auth even for public packages) and the Release workflow missing the `repo` option for `@changesets/changelog-github`.
