import assert from 'node:assert/strict'
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {describe, test} from 'node:test'

import {EditorconfigStandards} from '../src/core/editorconfigStandards.js'

void describe(
  'EditorconfigStandards',
  () => {

    void test(
      'check: reports all baseline lines missing with no file',
      () => {

        const dir = mkdtempSync(join(
          tmpdir(),
          'config-standards-test-'
        ))

        try {

          const result = EditorconfigStandards.check(dir)
          assert.equal(
            result.ok,
            false
          )
          assert.ok(result.missing.includes('root = true'))

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
      'fix: appends missing lines and check passes afterward',
      () => {

        const dir = mkdtempSync(join(
          tmpdir(),
          'config-standards-test-'
        ))

        try {

          writeFileSync(
            join(
              dir,
              '.editorconfig'
            ),
            'root = true\n'
          )
          const fixResult = EditorconfigStandards.fix(dir)
          assert.ok(fixResult.added.length > 0)
          assert.ok(!fixResult.added.includes('root = true'))

          const checkResult = EditorconfigStandards.check(dir)
          assert.equal(
            checkResult.ok,
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

  }
)
