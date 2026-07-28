import assert from 'node:assert/strict'
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {describe, test} from 'node:test'

import {checkGitignore} from '../src/core/checkGitignore.js'
import {fixGitignore} from '../src/core/fixGitignore.js'
import {fixPackageJson} from '../src/core/fixPackageJson.js'
import {createConfigStandardsApp} from '../src/core/configStandardsApp.js'

describe('config-standards suite', () => {

  test('checkGitignore: reports all lines missing with no file', () => {

    const dir = mkdtempSync(join(tmpdir(), 'config-standards-test-'))

    try {

      const result = checkGitignore(dir)
      assert.equal(result.ok, false)
      assert.equal(result.missing.length, 3)

    } finally {

      rmSync(dir, {force: true, recursive: true})

    }

  })

  test('fixGitignore: appends missing lines and check passes afterward', () => {

    const dir = mkdtempSync(join(tmpdir(), 'config-standards-test-'))

    try {

      writeFileSync(join(dir, '.gitignore'), 'node_modules/\n')
      const fixResult = fixGitignore(dir)
      assert.deepEqual([...fixResult.added].sort(), ['*.tsbuildinfo', 'dist/'])

      const checkResult = checkGitignore(dir)
      assert.equal(checkResult.ok, true)

    } finally {

      rmSync(dir, {force: true, recursive: true})

    }

  })

  test('fixPackageJson: fills license, leaves engines/repository as remaining', () => {

    const dir = mkdtempSync(join(tmpdir(), 'config-standards-test-'))

    try {

      writeFileSync(join(dir, 'package.json'), JSON.stringify({name: 'x'}))
      const fixResult = fixPackageJson(dir)
      assert.deepEqual(fixResult.added, ['license'])
      assert.deepEqual([...fixResult.remaining].sort(), ['engines', 'repository'])

      const written = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as Record<string, unknown>
      assert.equal(written.license, 'MIT')

    } finally {

      rmSync(dir, {force: true, recursive: true})

    }

  })

  test('manifest: exposes check and fix commands', () => {

    const app = createConfigStandardsApp()
    const names = app.manifest().commands.map((command) => command.name).sort()
    assert.deepEqual(names, ['check', 'fix'])

  })

})
