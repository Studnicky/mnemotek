import assert from 'node:assert/strict'
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {describe, test} from 'node:test'

import {StyleDriftStandards} from '../src/core/styleDriftStandards.js'

void describe(
  'StyleDriftStandards',
  () => {

    void test(
      'check: reports a conflict when .editorconfig and .prettierrc disagree on indent style',
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
            'root = true\n[*]\nindent_style = space\nindent_size = 2\n'
          )
          writeFileSync(
            join(
              dir,
              '.prettierrc.json'
            ),
            JSON.stringify({useTabs: true})
          )

          const result = StyleDriftStandards.check(dir)
          assert.equal(
            result.ok,
            false
          )
          const indentConflict = result.conflicts.find((conflict) => {

            return conflict.field === 'indentStyle'

          })
          assert.ok(indentConflict !== undefined)

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
      'check: no conflict when only one source declares style fields',
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
            'root = true\n[*]\nindent_style = space\n'
          )

          const result = StyleDriftStandards.check(dir)
          assert.equal(
            result.ok,
            true
          )
          assert.deepEqual(
            result.conflicts,
            []
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
