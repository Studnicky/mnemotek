import assert from 'node:assert/strict'
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {describe, test} from 'node:test'

import {ConfigStandardsApp} from '../src/core/configStandardsApp.js'
import {GitignoreStandards} from '../src/core/gitignoreStandards.js'
import {PackageJsonStandards} from '../src/core/packageJsonStandards.js'

void describe(
  'config-standards suite',
  () => {

    void test(
      'GitignoreStandards.check: reports all lines missing with no file',
      () => {

        const dir = mkdtempSync(join(
          tmpdir(),
          'config-standards-test-'
        ))

        try {

          const result = GitignoreStandards.check(dir)
          assert.equal(
            result.ok,
            false
          )
          assert.equal(
            result.missing.length,
            4
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
      'GitignoreStandards.fix: appends missing lines and check passes afterward',
      () => {

        const dir = mkdtempSync(join(
          tmpdir(),
          'config-standards-test-'
        ))

        try {

          writeFileSync(
            join(
              dir,
              '.gitignore'
            ),
            'node_modules/\n'
          )
          const fixResult = GitignoreStandards.fix(dir)
          assert.deepEqual(
            [...fixResult.added].sort(),
            [
              '*.tsbuildinfo',
              '.redactor/',
              'dist/'
            ]
          )

          const checkResult = GitignoreStandards.check(dir)
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

    void test(
      'PackageJsonStandards.fix: fills license, leaves engines/repository as remaining',
      () => {

        const dir = mkdtempSync(join(
          tmpdir(),
          'config-standards-test-'
        ))

        try {

          writeFileSync(
            join(
              dir,
              'package.json'
            ),
            JSON.stringify({name: 'x'})
          )
          const fixResult = PackageJsonStandards.fix(dir)
          assert.deepEqual(
            fixResult.added,
            ['license']
          )
          assert.deepEqual(
            [...fixResult.remaining].sort(),
            [
              'engines',
              'repository'
            ]
          )

          const written = JSON.parse(readFileSync(
            join(
              dir,
              'package.json'
            ),
            'utf8'
          )) as Record<string, unknown>
          assert.equal(
            written.license,
            'MIT'
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
      'manifest: exposes check and fix commands',
      () => {

        const app = ConfigStandardsApp.createConfigStandardsApp()
        const names = app.manifest().commands.map((command) => {

          const result = command.name; return result

        }).sort()
        assert.deepEqual(
          names,
          [
            'check',
            'fix'
          ]
        )

      }
    )

    void test(
      'check: runs every rule and returns every key, networked defaulting to false',
      async () => {

        const dir = mkdtempSync(join(
          tmpdir(),
          'config-standards-test-'
        ))

        try {

          const app = ConfigStandardsApp.createConfigStandardsApp()
          const result = await app.run(
            'check',
            {root: dir}
          ) as Record<string, unknown>

          assert.deepEqual(
            Object.keys(result).sort(),
            [
              'codeowners',
              'devcontainer',
              'editorconfig',
              'envcheck',
              'gitignore',
              'issueTemplates',
              'packageJson',
              'prettier',
              'styleDrift',
              'templateSync',
              'versionPin',
              'vscode'
            ]
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
      'fix: runs every fixable rule and returns every fix key',
      async () => {

        const dir = mkdtempSync(join(
          tmpdir(),
          'config-standards-test-'
        ))

        try {

          const app = ConfigStandardsApp.createConfigStandardsApp()
          const result = await app.run(
            'fix',
            {root: dir}
          ) as Record<string, unknown>

          assert.deepEqual(
            Object.keys(result).sort(),
            [
              'editorconfig',
              'gitignore',
              'packageJson',
              'prettier',
              'versionPin',
              'vscode'
            ]
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
