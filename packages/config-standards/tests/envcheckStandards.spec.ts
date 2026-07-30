import assert from 'node:assert/strict'
import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {describe, test} from 'node:test'

import {EnvcheckStandards} from '../src/core/envcheckStandards.js'

void describe(
  'EnvcheckStandards',
  () => {

    void test(
      'check: reports an undocumented var used in source and an unused var declared in .env.example',
      () => {

        const dir = mkdtempSync(join(
          tmpdir(),
          'config-standards-test-'
        ))

        try {

          const sourceDir = join(
            dir,
            'src'
          )

          mkdirSync(sourceDir)
          writeFileSync(
            join(
              sourceDir,
              'index.ts'
            ),
            'const key = process.env.API_KEY\nexport {key}\n'
          )
          writeFileSync(
            join(
              dir,
              '.env.example'
            ),
            'DATABASE_URL=postgres://localhost\n'
          )

          const result = EnvcheckStandards.check(dir)
          assert.equal(
            result.ok,
            false
          )
          assert.deepEqual(
            result.undocumented,
            ['API_KEY']
          )
          assert.deepEqual(
            result.unused,
            ['DATABASE_URL']
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
      'check: ok when discovered vars and documented keys match, and node_modules is skipped',
      () => {

        const dir = mkdtempSync(join(
          tmpdir(),
          'config-standards-test-'
        ))

        try {

          const sourceDir = join(
            dir,
            'src'
          )
          const nodeModulesDir = join(
            dir,
            'node_modules'
          )

          mkdirSync(sourceDir)
          mkdirSync(nodeModulesDir)
          writeFileSync(
            join(
              sourceDir,
              'index.ts'
            ),
            'const key = process.env.API_KEY\nexport {key}\n'
          )
          writeFileSync(
            join(
              nodeModulesDir,
              'ignored.ts'
            ),
            'const key = process.env.SHOULD_NOT_APPEAR\n'
          )
          writeFileSync(
            join(
              dir,
              '.env.example'
            ),
            'API_KEY=abc\n'
          )

          const result = EnvcheckStandards.check(dir)
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

  }
)
