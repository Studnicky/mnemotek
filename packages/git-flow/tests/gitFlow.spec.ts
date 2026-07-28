import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {describe, test} from 'node:test'

import {bumpVersion, updatePackageVersion} from '../src/core/versioning.js'
import {branchPrefixToConventionalType, validateCommitMessage} from '../src/core/conventionalCommits.js'
import {detectBranchStructure} from '../src/core/gitPrimitives.js'
import {featureFlow} from '../src/core/featureFlow.js'
import {releaseFlow} from '../src/core/releaseFlow.js'
import {hotfixFlow} from '../src/core/hotfixFlow.js'
import {createGitFlowApp} from '../src/core/gitFlowApp.js'

function makeRepo (developmentBranchName = 'develop'): string {

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
  run(['checkout', '-q', '-b', developmentBranchName])

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

  test('updatePackageVersion: writes the new version to package.json', () => {

    const dir = mkdtempSync(join(tmpdir(), 'git-flow-test-'))

    try {

      writeFileSync(join(dir, 'package.json'), JSON.stringify({name: 'x', version: '0.1.0'}))
      updatePackageVersion(dir, '0.2.0')

      const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as {readonly version: string}
      assert.equal(pkg.version, '0.2.0')

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

  test('featureFlow: create mode honors --type for non-feature branch prefixes', () => {

    const dir = makeRepo()

    try {

      const result = runIn(dir, () => featureFlow({branch: 'broken-thing', create: true, type: 'bugfix'}))
      assert.equal(result.error, undefined)
      assert.equal(result.branch, 'bugfix/broken-thing')

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

  test('detectBranchStructure: detects "development" as well as "develop"', () => {

    const dir = makeRepo('development')

    try {

      const structure = runIn(dir, () => detectBranchStructure())
      assert.equal(structure.development, 'development')
      assert.equal(structure.production, 'main')

    } finally {

      rmSync(dir, {force: true, recursive: true})

    }

  })

  test('branchPrefixToConventionalType: maps feature/bugfix to feat/fix, passes through the rest', () => {

    assert.equal(branchPrefixToConventionalType('feature'), 'feat')
    assert.equal(branchPrefixToConventionalType('bugfix'), 'fix')
    assert.equal(branchPrefixToConventionalType('chore'), 'chore')
    assert.equal(branchPrefixToConventionalType('docs'), 'docs')
    assert.equal(branchPrefixToConventionalType('nonsense'), 'chore')

  })

  test('validateCommitMessage: accepts a well-formed Conventional Commits subject', () => {

    const result = validateCommitMessage({message: 'fix(cli): correct the exit code'})
    assert.equal(result.valid, true)
    assert.equal(result.type, 'fix')
    assert.equal(result.scope, 'cli')

  })

  test('validateCommitMessage: rejects a subject with no type prefix', () => {

    const result = validateCommitMessage({message: 'correct the exit code'})
    assert.equal(result.valid, false)

  })

  test('validateCommitMessage: exempts Merge/Revert/Squashed subjects', () => {

    assert.equal(validateCommitMessage({message: "Merge branch 'develop'"}).exempt, true)
    assert.equal(validateCommitMessage({message: 'Revert "feat: broken thing"'}).exempt, true)

  })

  test('validateCommitMessage: exempts chore/backmerge-* branches regardless of subject', () => {

    const result = validateCommitMessage({branch: 'chore/backmerge-v1.2.3', message: 'whatever this is'})
    assert.equal(result.exempt, true)
    assert.equal(result.valid, true)

  })

  test('commit-check command: validates via --file the way git invokes commit-msg', async () => {

    const dir = mkdtempSync(join(tmpdir(), 'git-flow-test-'))

    try {

      const msgPath = join(dir, 'COMMIT_EDITMSG')
      writeFileSync(msgPath, 'feat: add the thing\n')

      const app = createGitFlowApp()
      const result = await app.run('commit-check', {branch: 'feature/x', file: msgPath}) as Record<string, unknown> | undefined

      assert.equal(result?.valid, true)
      assert.equal(result?.type, 'feat')

    } finally {

      rmSync(dir, {force: true, recursive: true})

    }

  })

  test('commit-check command: throws by default (non-zero CLI exit) instead of returning valid:false', async () => {

    const app = createGitFlowApp()
    await assert.rejects(
      async () => app.run('commit-check', {branch: 'feature/x', message: 'did a thing wrong'}),
      /Invalid commit message/u
    )

  })

  test('commit-check command: --lenient returns valid:false instead of throwing', async () => {

    const app = createGitFlowApp()
    const result = await app.run('commit-check', {branch: 'feature/x', lenient: true, message: 'did a thing wrong'}) as Record<string, unknown> | undefined

    assert.equal(result?.valid, false)

  })

  test('commit-type command: derives the conventional type from the current branch', async () => {

    const dir = makeRepo()
    execFileSync('git', ['checkout', '-q', '-b', 'bugfix/thing'], {cwd: dir})

    try {

      const app = createGitFlowApp()
      const result = await runIn(dir, () => app.run('commit-type', {})) as Record<string, unknown> | undefined

      assert.equal(result?.type, 'fix')
      assert.equal(result?.prefix, 'bugfix')

    } finally {

      rmSync(dir, {force: true, recursive: true})

    }

  })

  test('manifest: exposes all commands', () => {

    const app = createGitFlowApp()
    const names = app.manifest().commands.map((command) => command.name).sort()
    assert.deepEqual(names, ['commit-check', 'commit-type', 'feature', 'hotfix', 'release', 'sync'])

  })

})
