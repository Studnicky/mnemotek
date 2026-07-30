import assert from 'node:assert/strict'
import {mkdtempSync, rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {describe, test} from 'node:test'

import {TemplateSyncStandards} from '../src/core/templateSyncStandards.js'

void describe(
  'TemplateSyncStandards',
  () => {

    void test(
      'check: with networked omitted, skips the network call and reports unknown/ok',
      () => {

        const dir = mkdtempSync(join(
          tmpdir(),
          'config-standards-test-'
        ))

        try {

          const result = TemplateSyncStandards.check(dir)
          assert.equal(
            result.networkSkipped,
            true
          )
          assert.equal(
            result.staleness,
            'unknown'
          )
          assert.equal(
            result.ok,
            true
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

    void test(
      'check: with networked false explicitly, same local-only behavior',
      () => {

        const dir = mkdtempSync(join(
          tmpdir(),
          'config-standards-test-'
        ))

        try {

          const result = TemplateSyncStandards.check(
            dir,
            {networked: false}
          )
          assert.equal(
            result.networkSkipped,
            true
          )
          assert.equal(
            result.staleness,
            'unknown'
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
