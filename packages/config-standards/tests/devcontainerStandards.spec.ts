import assert from 'node:assert/strict'
import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {describe, test} from 'node:test'

import {DevcontainerStandards} from '../src/core/devcontainerStandards.js'

void describe(
  'DevcontainerStandards',
  () => {

    void test(
      'check: reports unpinned features (:latest and no tag) and no staleness with no lock file',
      () => {

        const dir = mkdtempSync(join(
          tmpdir(),
          'config-standards-test-'
        ))

        try {

          const devcontainerDir = join(
            dir,
            '.devcontainer'
          )

          mkdirSync(devcontainerDir)
          writeFileSync(
            join(
              devcontainerDir,
              'devcontainer.json'
            ),
            JSON.stringify({features: {
              'ghcr.io/devcontainers/features/docker-in-docker': {},
              'ghcr.io/devcontainers/features/node:1': {},
              'ghcr.io/devcontainers/features/python:latest': {}
            }})
          )

          const result = DevcontainerStandards.check(dir)
          assert.equal(
            result.ok,
            false
          )
          assert.equal(
            result.staleLock,
            false
          )
          assert.ok(result.unpinnedFeatures.includes('ghcr.io/devcontainers/features/docker-in-docker'))
          assert.ok(result.unpinnedFeatures.includes('ghcr.io/devcontainers/features/python:latest'))
          assert.ok(!result.unpinnedFeatures.includes('ghcr.io/devcontainers/features/node:1'))

        } finally {

          rmSync(
            dir,
            {force: true,
              recursive: true}
          )

        }

      }
    )

    void test(
      'check: reports a stale lock when the lock file features do not match',
      () => {

        const dir = mkdtempSync(join(
          tmpdir(),
          'config-standards-test-'
        ))

        try {

          const devcontainerDir = join(
            dir,
            '.devcontainer'
          )

          mkdirSync(devcontainerDir)
          writeFileSync(
            join(
              devcontainerDir,
              'devcontainer.json'
            ),
            JSON.stringify({features: {'ghcr.io/devcontainers/features/node:1': {}}})
          )
          writeFileSync(
            join(
              devcontainerDir,
              'devcontainer-lock.json'
            ),
            JSON.stringify({features: {'ghcr.io/devcontainers/features/python:2': {}}})
          )

          const result = DevcontainerStandards.check(dir)
          assert.equal(
            result.staleLock,
            true
          )
          assert.equal(
            result.ok,
            false
          )

        } finally {

          rmSync(
            dir,
            {force: true,
              recursive: true}
          )

        }

      }
    )

  }
)
