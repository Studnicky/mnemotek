import assert from 'node:assert/strict'
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {describe, test} from 'node:test'

import {VersionPinStandards} from '../src/core/versionPinStandards.js'

void describe(
  'VersionPinStandards',
  () => {

    void test(
      'check: reports a disagreement between .nvmrc and package.json#engines.node',
      () => {

        const dir = mkdtempSync(join(
          tmpdir(),
          'config-standards-test-'
        ))

        try {

          writeFileSync(
            join(
              dir,
              '.nvmrc'
            ),
            '20.11.0\n'
          )
          writeFileSync(
            join(
              dir,
              'package.json'
            ),
            JSON.stringify({engines: {node: '18.0.0'},
              name: 'x'})
          )

          const result = VersionPinStandards.check(dir)
          assert.equal(
            result.ok,
            false
          )
          assert.equal(
            result.disagreements.length,
            2
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
      'fix: propagates the .nvmrc value into package.json#engines.node',
      () => {

        const dir = mkdtempSync(join(
          tmpdir(),
          'config-standards-test-'
        ))

        try {

          writeFileSync(
            join(
              dir,
              '.nvmrc'
            ),
            '20.11.0\n'
          )
          writeFileSync(
            join(
              dir,
              'package.json'
            ),
            JSON.stringify({engines: {node: '18.0.0'},
              name: 'x'})
          )

          const fixResult = VersionPinStandards.fix(
            dir,
            '.nvmrc'
          )
          assert.ok(fixResult.propagated.includes('package.json#engines.node'))

          const written = JSON.parse(readFileSync(
            join(
              dir,
              'package.json'
            ),
            'utf8'
          )) as {engines: {node: string}}
          assert.equal(
            written.engines.node,
            '20.11.0'
          )

          const checkResult = VersionPinStandards.check(dir)
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
