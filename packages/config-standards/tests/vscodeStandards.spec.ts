import assert from 'node:assert/strict'
import {mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {describe, test} from 'node:test'

import {VscodeStandards} from '../src/core/vscodeStandards.js'

void describe(
  'VscodeStandards',
  () => {

    void test(
      'check: reports missing recommendations and settings when eslint/prettier configs are present',
      () => {

        const dir = mkdtempSync(join(
          tmpdir(),
          'config-standards-test-'
        ))

        try {

          writeFileSync(
            join(
              dir,
              '.eslintrc.json'
            ),
            '{}'
          )
          writeFileSync(
            join(
              dir,
              '.prettierrc.json'
            ),
            '{}'
          )

          const result = VscodeStandards.check(dir)
          assert.ok(result.missingRecommendations.includes('dbaeumer.vscode-eslint'))
          assert.ok(result.missingRecommendations.includes('esbenp.prettier-vscode'))
          assert.ok(result.missingSettings.includes('editor.formatOnSave'))
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

    void test(
      'fix: merges recommendations/settings without dropping unrelated existing keys',
      () => {

        const dir = mkdtempSync(join(
          tmpdir(),
          'config-standards-test-'
        ))

        try {

          writeFileSync(
            join(
              dir,
              '.eslintrc.json'
            ),
            '{}'
          )

          const vscodeDir = join(
            dir,
            '.vscode'
          )

          writeFileSync(
            join(
              dir,
              '.editorconfig'
            ),
            ''
          )

          mkdirSync(
            vscodeDir,
            {recursive: true}
          )
          writeFileSync(
            join(
              vscodeDir,
              'settings.json'
            ),
            JSON.stringify({'some.unrelated.setting': true})
          )

          const fixResult = VscodeStandards.fix(dir)
          assert.ok(fixResult.addedRecommendations.includes('dbaeumer.vscode-eslint'))

          const settings = JSON.parse(readFileSync(
            join(
              vscodeDir,
              'settings.json'
            ),
            'utf8'
          )) as Record<string, unknown>
          assert.equal(
            settings['some.unrelated.setting'],
            true
          )
          assert.equal(
            settings['editor.formatOnSave'],
            true
          )

          const checkResult = VscodeStandards.check(dir)
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
