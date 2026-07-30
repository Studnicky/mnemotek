import assert from 'node:assert/strict'
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {describe, test} from 'node:test'

import {PrettierStandards} from '../src/core/prettierStandards.js'

void describe(
  'PrettierStandards',
  () => {

    void test(
      'check: false with no config present, fix scaffolds a default config',
      () => {

        const dir = mkdtempSync(join(
          tmpdir(),
          'config-standards-test-'
        ))

        try {

          assert.equal(
            PrettierStandards.check(dir).ok,
            false
          )

          const fixResult = PrettierStandards.fix(dir)
          assert.equal(
            fixResult.created,
            true
          )

          const written = JSON.parse(readFileSync(
            join(
              dir,
              '.prettierrc.json'
            ),
            'utf8'
          )) as Record<string, unknown>
          assert.equal(
            written.singleQuote,
            true
          )

          assert.equal(
            PrettierStandards.check(dir).ok,
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
      'fix: does not overwrite an existing config',
      () => {

        const dir = mkdtempSync(join(
          tmpdir(),
          'config-standards-test-'
        ))

        try {

          const filePath = join(
            dir,
            '.prettierrc.json'
          )

          writeFileSync(
            filePath,
            JSON.stringify({singleQuote: false})
          )

          const fixResult = PrettierStandards.fix(dir)
          assert.equal(
            fixResult.created,
            false
          )

          const written = JSON.parse(readFileSync(
            filePath,
            'utf8'
          )) as Record<string, unknown>
          assert.equal(
            written.singleQuote,
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
