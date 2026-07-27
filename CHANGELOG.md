# Changelog

## 0.1.1

### Patch Changes

- [`9d4c900`](https://github.com/Studnicky/mnemotek/commit/9d4c900efa3cdc66d3debdfc3f3456b610aee788) Thanks [@Studnicky](https://github.com/Studnicky)! - Initial publish setup and release hardening for mnemotek: pnpm scripts, metadata, release workflow, and CI publish gates.

- [#2](https://github.com/Studnicky/mnemotek/pull/2) [`98e9a22`](https://github.com/Studnicky/mnemotek/commit/98e9a22b0fd4b89f2a8517aa2ec97b35f4979bb8) Thanks [@Studnicky](https://github.com/Studnicky)! - Harden CI/CD: pin all GitHub Actions to commit SHAs, extract a shared pnpm node-setup composite action, enable CodeQL default setup, and add security audit, license compliance, and changeset-presence checks. Fix the CI workflow missing `NODE_AUTH_TOKEN` (GitHub Packages requires auth even for public packages) and the Release workflow missing the `repo` option for `@changesets/changelog-github`.

## 0.1.0

- Initial package bootstrap with manifest-first API for agents.
