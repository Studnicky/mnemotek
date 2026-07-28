import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {describe, test} from 'node:test'

import {bumpVersion, getCurrentVersion, updatePackageVersion} from '../src/core/versioning.js'
import {branchPrefixToConventionalType, validateCommitMessage} from '../src/core/conventionalCommits.js'
import {acquireLock, commitAll, detectBranchStructure, mergeBranch, pullBranch, pushBranch, releaseLock, withLock} from '../src/core/gitPrimitives.js'
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

function runGit (dir: string, args: readonly string[]): void {

  execFileSync('git', [...args], {cwd: dir})

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

  test('releaseFlow: resumes an existing release branch from a prior run instead of failing on createBranch', () => {

    const bare = mkdtempSync(join(tmpdir(), 'git-flow-test-bare-'))
    const dir = mkdtempSync(join(tmpdir(), 'git-flow-test-clone-'))

    try {

      runGit(bare, ['init', '-q', '--bare', '-b', 'main'])
      execFileSync('git', ['clone', '-q', bare, dir])

      runGit(dir, ['config', 'user.email', 'test@example.com'])
      runGit(dir, ['config', 'user.name', 'Test'])
      writeFileSync(join(dir, 'package.json'), JSON.stringify({name: 'x', version: '0.1.0'}))
      runGit(dir, ['add', '-A'])
      runGit(dir, ['commit', '-q', '-m', 'initial'])
      runGit(dir, ['push', '-q', '-u', 'origin', 'main'])

      runGit(dir, ['checkout', '-q', '-b', 'develop'])
      runGit(dir, ['push', '-q', '-u', 'origin', 'develop'])

      const priorVersion = getCurrentVersion(dir)
      const expectedNewVersion = bumpVersion(priorVersion ?? '0.0.0', 'patch')
      const releaseBranch = `release/${expectedNewVersion}`

      runGit(dir, ['checkout', '-q', '-b', releaseBranch, 'develop'])
      updatePackageVersion(dir, expectedNewVersion)
      runIn(dir, () => commitAll('chore(release): prior partial run'))

      const result = runIn(dir, () => releaseFlow({direct: true}))

      assert.equal(result.error, undefined)
      assert.equal(result.releaseBranch, releaseBranch)
      assert.ok(result.steps.some((step) => step.includes(`resumed existing ${releaseBranch}`)))
      assert.ok(!result.steps.some((step) => step.includes(`created ${releaseBranch}`)))

    } finally {

      rmSync(bare, {force: true, recursive: true})
      rmSync(dir, {force: true, recursive: true})

    }

  })

  test('releaseFlow: resuming a prior partial run computes the same version instead of double-bumping', () => {

    const bare = mkdtempSync(join(tmpdir(), 'git-flow-test-bare-'))
    const dir = mkdtempSync(join(tmpdir(), 'git-flow-test-clone-'))

    try {

      runGit(bare, ['init', '-q', '--bare', '-b', 'main'])
      execFileSync('git', ['clone', '-q', bare, dir])

      runGit(dir, ['config', 'user.email', 'test@example.com'])
      runGit(dir, ['config', 'user.name', 'Test'])
      writeFileSync(join(dir, 'package.json'), JSON.stringify({name: 'x', version: '1.4.0'}))
      runGit(dir, ['add', '-A'])
      runGit(dir, ['commit', '-q', '-m', 'initial'])
      runGit(dir, ['push', '-q', '-u', 'origin', 'main'])

      runGit(dir, ['checkout', '-q', '-b', 'develop'])
      runGit(dir, ['push', '-q', '-u', 'origin', 'develop'])

      // Simulate a prior run that created the release branch, bumped the version, and
      // committed, but failed before finishing (e.g. a network blip on push). It leaves
      // the repo checked out on the half-finished release branch, exactly like a real
      // partial run would.
      const expectedNewVersion = bumpVersion('1.4.0', 'patch')
      const releaseBranch = `release/${expectedNewVersion}`

      runGit(dir, ['checkout', '-q', '-b', releaseBranch, 'develop'])
      updatePackageVersion(dir, expectedNewVersion)
      runIn(dir, () => commitAll('chore(release): prior partial run'))

      const result = runIn(dir, () => releaseFlow({direct: true}))

      assert.equal(result.error, undefined)
      assert.equal(result.previousVersion, '1.4.0')
      assert.equal(result.newVersion, expectedNewVersion)
      assert.equal(result.releaseBranch, releaseBranch)

    } finally {

      rmSync(bare, {force: true, recursive: true})
      rmSync(dir, {force: true, recursive: true})

    }

  })

  test('pushBranch: retries after a fast-forward pull when the initial push is rejected', () => {

    const bare = mkdtempSync(join(tmpdir(), 'git-flow-test-bare-'))
    const cloneA = mkdtempSync(join(tmpdir(), 'git-flow-test-a-'))
    const cloneB = mkdtempSync(join(tmpdir(), 'git-flow-test-b-'))

    try {

      runGit(bare, ['init', '-q', '--bare', '-b', 'main'])
      execFileSync('git', ['clone', '-q', bare, cloneA])
      execFileSync('git', ['clone', '-q', bare, cloneB])

      runGit(cloneA, ['config', 'user.email', 'a@example.com'])
      runGit(cloneA, ['config', 'user.name', 'A'])
      writeFileSync(join(cloneA, 'file.txt'), 'base\n')
      runGit(cloneA, ['add', '-A'])
      runGit(cloneA, ['commit', '-q', '-m', 'base'])
      runGit(cloneA, ['push', '-q', '-u', 'origin', 'main'])

      runGit(cloneB, ['config', 'user.email', 'b@example.com'])
      runGit(cloneB, ['config', 'user.name', 'B'])
      runGit(cloneB, ['pull', '-q', '--no-rebase', 'origin', 'main'])

      // A pushes a second commit that B has not pulled. B's local "main" is now behind
      // origin, so B's push is rejected (non-fast-forward) even though B made no local
      // commits of its own — the same "someone else pushed between my pull and my push"
      // race the retry is meant to recover from.
      writeFileSync(join(cloneA, 'file.txt'), 'from-a\n')
      runGit(cloneA, ['add', '-A'])
      runGit(cloneA, ['commit', '-q', '-m', 'second commit from a'])
      runGit(cloneA, ['push', '-q', 'origin', 'main'])

      assert.doesNotThrow(() => runIn(cloneB, () => pushBranch('main')))

      const remoteHead = execFileSync('git', ['rev-parse', 'main'], {cwd: bare, encoding: 'utf8'}).trim()
      const localHead = execFileSync('git', ['rev-parse', 'main'], {cwd: cloneB, encoding: 'utf8'}).trim()
      assert.equal(localHead, remoteHead)

    } finally {

      rmSync(bare, {force: true, recursive: true})
      rmSync(cloneA, {force: true, recursive: true})
      rmSync(cloneB, {force: true, recursive: true})

    }

  })

  test('pullBranch: throws and leaves a clean repo when the pull hits a real conflict', () => {

    const bare = mkdtempSync(join(tmpdir(), 'git-flow-test-bare-'))
    const cloneA = mkdtempSync(join(tmpdir(), 'git-flow-test-a-'))
    const cloneB = mkdtempSync(join(tmpdir(), 'git-flow-test-b-'))

    try {

      runGit(bare, ['init', '-q', '--bare', '-b', 'main'])
      execFileSync('git', ['clone', '-q', bare, cloneA])
      execFileSync('git', ['clone', '-q', bare, cloneB])

      runGit(cloneA, ['config', 'user.email', 'a@example.com'])
      runGit(cloneA, ['config', 'user.name', 'A'])
      writeFileSync(join(cloneA, 'file.txt'), 'base\n')
      runGit(cloneA, ['add', '-A'])
      runGit(cloneA, ['commit', '-q', '-m', 'base'])
      runGit(cloneA, ['push', '-q', '-u', 'origin', 'main'])

      runGit(cloneB, ['config', 'user.email', 'b@example.com'])
      runGit(cloneB, ['config', 'user.name', 'B'])
      runGit(cloneB, ['pull', '-q', '--no-rebase', 'origin', 'main'])

      writeFileSync(join(cloneA, 'file.txt'), 'from-a\n')
      runGit(cloneA, ['add', '-A'])
      runGit(cloneA, ['commit', '-q', '-m', 'edit from a'])
      runGit(cloneA, ['push', '-q', 'origin', 'main'])

      writeFileSync(join(cloneB, 'file.txt'), 'from-b\n')
      runGit(cloneB, ['add', '-A'])
      runGit(cloneB, ['commit', '-q', '-m', 'edit from b'])

      assert.throws(() => runIn(cloneB, () => pullBranch('main')), /conflict/u)

      const status = execFileSync('git', ['status', '--porcelain'], {cwd: cloneB, encoding: 'utf8'})
      assert.equal(status.trim(), '')
      assert.equal(existsSync(join(cloneB, '.git', 'MERGE_HEAD')), false)

    } finally {

      rmSync(bare, {force: true, recursive: true})
      rmSync(cloneA, {force: true, recursive: true})
      rmSync(cloneB, {force: true, recursive: true})

    }

  })

  test('pullBranch: does not throw when the remote has no matching branch yet', () => {

    const bare = mkdtempSync(join(tmpdir(), 'git-flow-test-bare-'))
    const clone = mkdtempSync(join(tmpdir(), 'git-flow-test-clone-'))

    try {

      runGit(bare, ['init', '-q', '--bare', '-b', 'main'])
      execFileSync('git', ['clone', '-q', bare, clone])

      runGit(clone, ['config', 'user.email', 'x@example.com'])
      runGit(clone, ['config', 'user.name', 'X'])
      writeFileSync(join(clone, 'file.txt'), 'base\n')
      runGit(clone, ['add', '-A'])
      runGit(clone, ['commit', '-q', '-m', 'base'])
      runGit(clone, ['push', '-q', '-u', 'origin', 'main'])

      runGit(clone, ['checkout', '-q', '-b', 'feature/new-thing'])

      assert.doesNotThrow(() => runIn(clone, () => pullBranch('feature/new-thing')))

    } finally {

      rmSync(bare, {force: true, recursive: true})
      rmSync(clone, {force: true, recursive: true})

    }

  })

  test('mergeBranch: throws and aborts cleanly on a real merge conflict', () => {

    const dir = makeRepo()

    try {

      runGit(dir, ['checkout', '-q', 'main'])
      writeFileSync(join(dir, 'file.txt'), 'base\n')
      runGit(dir, ['add', '-A'])
      runGit(dir, ['commit', '-q', '-m', 'base'])

      runGit(dir, ['checkout', '-q', '-b', 'branch-a'])
      writeFileSync(join(dir, 'file.txt'), 'from-a\n')
      runGit(dir, ['add', '-A'])
      runGit(dir, ['commit', '-q', '-m', 'edit a'])

      runGit(dir, ['checkout', '-q', 'main'])
      runGit(dir, ['checkout', '-q', '-b', 'branch-b'])
      writeFileSync(join(dir, 'file.txt'), 'from-b\n')
      runGit(dir, ['add', '-A'])
      runGit(dir, ['commit', '-q', '-m', 'edit b'])

      assert.throws(() => runIn(dir, () => mergeBranch('branch-a', 'branch-b')), /merge/iu)

      const status = execFileSync('git', ['status', '--porcelain'], {cwd: dir, encoding: 'utf8'})
      assert.equal(status.trim(), '')
      assert.equal(existsSync(join(dir, '.git', 'MERGE_HEAD')), false)

    } finally {

      rmSync(dir, {force: true, recursive: true})

    }

  })

  test('assertCleanRepoState: releaseFlow/hotfixFlow/featureFlow refuse to run against a mid-merge repo', () => {

    const dir = makeRepo()

    try {

      runGit(dir, ['checkout', '-q', 'main'])
      writeFileSync(join(dir, 'file.txt'), 'base\n')
      runGit(dir, ['add', '-A'])
      runGit(dir, ['commit', '-q', '-m', 'base'])

      runGit(dir, ['checkout', '-q', '-b', 'branch-a'])
      writeFileSync(join(dir, 'file.txt'), 'from-a\n')
      runGit(dir, ['add', '-A'])
      runGit(dir, ['commit', '-q', '-m', 'edit a'])

      runGit(dir, ['checkout', '-q', 'main'])
      runGit(dir, ['checkout', '-q', '-b', 'branch-b'])
      writeFileSync(join(dir, 'file.txt'), 'from-b\n')
      runGit(dir, ['add', '-A'])
      runGit(dir, ['commit', '-q', '-m', 'edit b'])

      try {

        execFileSync('git', ['merge', 'branch-a'], {cwd: dir, stdio: 'ignore'})

      } catch {

        // expected: the merge conflicts and leaves the repo mid-merge

      }

      assert.equal(existsSync(join(dir, '.git', 'MERGE_HEAD')), true)

      const releaseResult = runIn(dir, () => releaseFlow({}))
      assert.match(releaseResult.error ?? '', /mid-merge|mid-rebase/u)

      const hotfixResult = runIn(dir, () => hotfixFlow({}))
      assert.match(hotfixResult.error ?? '', /mid-merge|mid-rebase/u)

      const featureResult = runIn(dir, () => featureFlow({}))
      assert.match(featureResult.error ?? '', /mid-merge|mid-rebase/u)

    } finally {

      rmSync(dir, {force: true, recursive: true})

    }

  })

  test('acquireLock/releaseLock: acquiring twice throws, releasing then acquiring succeeds', () => {

    const dir = makeRepo()

    try {

      runIn(dir, () => acquireLock())
      assert.throws(() => runIn(dir, () => acquireLock()), /already running|lock file/u)

      runIn(dir, () => releaseLock())
      assert.doesNotThrow(() => runIn(dir, () => acquireLock()))

      runIn(dir, () => releaseLock())

    } finally {

      rmSync(dir, {force: true, recursive: true})

    }

  })

  test('withLock: releases the lock even when the wrapped function throws', () => {

    const dir = makeRepo()

    try {

      assert.throws(() => runIn(dir, () => withLock(() => {

        throw new Error('boom')

      })), /boom/u)

      assert.doesNotThrow(() => runIn(dir, () => acquireLock()))

      runIn(dir, () => releaseLock())

    } finally {

      rmSync(dir, {force: true, recursive: true})

    }

  })

  test('withLock: passes through the wrapped function\'s return value unchanged', () => {

    const dir = makeRepo()

    try {

      const result = runIn(dir, () => withLock(() => 42))
      assert.equal(result, 42)

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
