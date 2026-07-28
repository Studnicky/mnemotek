import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {describe, test} from 'node:test'

import {bumpVersion, updateChangelog, updatePackageVersion} from '../src/core/versioning.js'
import {featureFlow} from '../src/core/featureFlow.js'
import {releaseFlow} from '../src/core/releaseFlow.js'
import {hotfixFlow} from '../src/core/hotfixFlow.js'
import {createGitFlowApp} from '../src/core/gitFlowApp.js'

function makeRepo (): string {

  const dir = mkdtempSync(join(tmpdir(), 'git-flow-test-'))
  const run = (args: readonly string[]): void => {

    execFileSync('git', [...args], {cwd: dir})

  }

  run(['init', '-q', '-b', 'main'])
  run(['config', 'user.email', 'test@example.com'])
  run(['config', 'user.name', 'Test'])
  writeFileSync(join(dir, 'README.md'), '# test\n')
  run(['add', '-A'])
  run(['commit', '-q', '-m', 'initial'])
  run(['checkout', '-q', '-b', 'develop'])

  return dir

}

function runIn<T> (dir: string, fn: () => T): T {

  const originalCwd = process.cwd()
  process.chdir(dir)

  try {

    return fn()

  } finally {

    process.chdir(originalCwd)

  }

}

describe('git-flow suite', () => {

  test('bumpVersion: patch/minor/major', () => {

    assert.equal(bumpVersion('1.2.3', 'patch'), '1.2.4')
    assert.equal(bumpVersion('1.2.3', 'minor'), '1.3.0')
    assert.equal(bumpVersion('1.2.3', 'major'), '2.0.0')

  })

  test('updatePackageVersion + updateChangelog: writes real files', () => {

    const dir = mkdtempSync(join(tmpdir(), 'git-flow-test-'))

    try {

      writeFileSync(join(dir, 'package.json'), JSON.stringify({name: 'x', version: '0.1.0'}))
      updatePackageVersion(dir, '0.2.0')
      updateChangelog({newVersion: '0.2.0', root: dir, summary: 'Test release.'})

      const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as {readonly version: string}
      assert.equal(pkg.version, '0.2.0')

      const changelog = readFileSync(join(dir, 'CHANGELOG.md'), 'utf8')
      assert.match(changelog, /0\.2\.0/u)

    } finally {

      rmSync(dir, {force: true, recursive: true})

    }

  })

  test('featureFlow: create mode creates and checks out a feature branch', () => {

    const dir = makeRepo()

    try {

      const result = runIn(dir, () => featureFlow({branch: 'thing', create: true}))
      assert.equal(result.error, undefined)
      assert.equal(result.branch, 'feature/thing')

      const current = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {cwd: dir, encoding: 'utf8'}).trim()
      assert.equal(current, 'feature/thing')

    } finally {

      rmSync(dir, {force: true, recursive: true})

    }

  })

  test('featureFlow: status mode reports the current branch with no error', () => {

    const dir = makeRepo()

    try {

      const result = runIn(dir, () => featureFlow({}))
      assert.equal(result.error, undefined)
      assert.equal(result.mode, 'status')

    } finally {

      rmSync(dir, {force: true, recursive: true})

    }

  })

  test('releaseFlow: dry-run computes a version without touching the repo', () => {

    const dir = makeRepo()

    try {

      const result = runIn(dir, () => releaseFlow({dryRun: true}))
      assert.equal(result.error, undefined)
      assert.equal(result.newVersion, '0.1.0')
      assert.equal(result.tag, 'v0.1.0')

    } finally {

      rmSync(dir, {force: true, recursive: true})

    }

  })

  test('hotfixFlow: dry-run computes a version without touching the repo', () => {

    const dir = makeRepo()

    try {

      const result = runIn(dir, () => hotfixFlow({dryRun: true}))
      assert.equal(result.error, undefined)
      assert.equal(result.newVersion, '0.0.1')

    } finally {

      rmSync(dir, {force: true, recursive: true})

    }

  })

  test('manifest: exposes feature, release, hotfix, and sync commands', () => {

    const app = createGitFlowApp()
    const names = app.manifest().commands.map((command) => command.name).sort()
    assert.deepEqual(names, ['feature', 'hotfix', 'release', 'sync'])

  })

})
