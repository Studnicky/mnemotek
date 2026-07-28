import assert from 'node:assert/strict'
import {mkdtempSync, rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {execFileSync} from 'node:child_process'
import {describe, test} from 'node:test'

import {branchValidate} from '../src/core/branchValidate.js'
import {changelogCheck} from '../src/core/changelogCheck.js'
import {hooksInstall} from '../src/core/hooksInstall.js'
import {createGitFlowApp} from '../src/core/gitFlowApp.js'

function makeTempRepo (): string {

  const dir = mkdtempSync(join(tmpdir(), 'git-flow-test-'))
  execFileSync('git', ['init', '-q'], {cwd: dir})
  return dir

}

describe('git-flow suite', () => {

  test('branch-validate: accepts a conventional feature branch', () => {

    const result = branchValidate({branch: 'feature/thing'})
    assert.equal(result.valid, true)

  })

  test('branch-validate: rejects an unconventional branch name', () => {

    const result = branchValidate({branch: 'whatever'})
    assert.equal(result.valid, false)

  })

  test('branch-validate: treats protected branches as always valid', () => {

    const result = branchValidate({branch: 'main'})
    assert.equal(result.protected, true)
    assert.equal(result.valid, true)

  })

  test('hooks-install: writes hook files and sets core.hooksPath', () => {

    const dir = makeTempRepo()

    try {

      const result = hooksInstall({targetDir: dir})
      assert.deepEqual([...result.installed].sort(), ['pre-commit', 'pre-push'])

      const hooksPath = execFileSync(
        'git',
        ['config', 'core.hooksPath'],
        {cwd: dir, encoding: 'utf8'}
      ).trim()
      assert.equal(hooksPath, '.githooks')

    } finally {

      rmSync(dir, {force: true, recursive: true})

    }

  })

  test('changelog-check: fails with no .changeset and no CHANGELOG', () => {

    const dir = makeTempRepo()

    try {

      const result = changelogCheck({root: dir})
      assert.equal(result.ok, false)

    } finally {

      rmSync(dir, {force: true, recursive: true})

    }

  })

  test('manifest: exposes all four commands', () => {

    const app = createGitFlowApp()
    const manifest = app.manifest()
    const names = manifest.commands.map((command) => command.name).sort()
    assert.deepEqual(names, ['branch-validate', 'changelog-check', 'hooks-install', 'pr-status'])

  })

})
