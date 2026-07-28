import {execFileSync} from 'node:child_process'
import {existsSync, unlinkSync, writeFileSync} from 'node:fs'
import {join} from 'node:path'
import process from 'node:process'

export interface CommitInfo {
  readonly hash: string
  readonly subject: string
}

export interface BranchStructure {
  readonly current: string
  readonly development: string | undefined
  readonly production: string
}

function git (args: readonly string[], options: {readonly allowFail?: boolean} = {}): string {

  try {

    return execFileSync('git', [...args], {encoding: 'utf8'}).trim()

  } catch (error) {

    if (options.allowFail === true) {

      return ''

    }

    throw error

  }

}

function gitDir (): string {

  return git(['rev-parse', '--git-dir'])

}

function mergeHeadExists (): boolean {

  return existsSync(join(gitDir(), 'MERGE_HEAD'))

}

export function currentBranch (): string {

  return git(['rev-parse', '--abbrev-ref', 'HEAD'])

}

export function hasUncommittedChanges (): boolean {

  return git(['status', '--porcelain']).length > 0

}

export function isRepoMidOperation (): boolean {

  const dir = gitDir()
  return existsSync(join(dir, 'MERGE_HEAD')) || existsSync(join(dir, 'rebase-merge'))

}

export function assertCleanRepoState (): void {

  if (isRepoMidOperation()) {

    throw new Error('Repository is already mid-merge or mid-rebase. Resolve or abort it before running git-flow-tool again.')

  }

}

const LOCK_FILE_NAME = 'git-flow-tool.lock'

function lockFilePath (): string {

  return join(gitDir(), LOCK_FILE_NAME)

}

export function acquireLock (): void {

  const path = lockFilePath()

  if (existsSync(path)) {

    throw new Error(`git-flow-tool is already running in this repository (lock file ${path} exists). Wait for it to finish, or remove the lock file if a prior run crashed without cleaning up.`)

  }

  writeFileSync(path, String(process.pid))

}

export function releaseLock (): void {

  const path = lockFilePath()

  if (existsSync(path)) {

    unlinkSync(path)

  }

}

export function withLock<T> (fn: () => T): T {

  acquireLock()

  try {

    return fn()

  } finally {

    releaseLock()

  }

}

export function branchExists (branch: string): boolean {

  const result = git(['rev-parse', '--verify', '--quiet', branch], {allowFail: true})
  return result.length > 0

}

const DEVELOPMENT_BRANCH_NAMES = ['develop', 'development'] as const

function branchExistsLocalOrRemote (branch: string): boolean {

  return branchExists(branch) || branchExists(`origin/${branch}`)

}

function detectDevelopmentBranch (): string | undefined {

  return DEVELOPMENT_BRANCH_NAMES.find((name) => branchExistsLocalOrRemote(name))

}

export function detectBranchStructure (): BranchStructure {

  const current = currentBranch()
  const production = branchExistsLocalOrRemote('main') ? 'main' : 'master'

  return {
    current,
    development: detectDevelopmentBranch(),
    production
  }

}

export function getCommitsAhead (baseBranch: string): readonly CommitInfo[] {

  const log = git(['log', `${baseBranch}..HEAD`, '--pretty=format:%h %s'], {allowFail: true})

  if (log.length === 0) {

    return []

  }

  return log.split('\n').map((line) => {

    const [hash, ...subjectParts] = line.split(' ')
    return {hash: hash ?? '', subject: subjectParts.join(' ')}

  })

}

export function checkoutBranch (branch: string): void {

  git(['checkout', branch])

}

export function pullBranch (branch: string): void {

  try {

    git(['pull', '--no-rebase', 'origin', branch])

  } catch {

    if (mergeHeadExists()) {

      git(['merge', '--abort'], {allowFail: true})
      throw new Error(`Pull conflict on ${branch}: merge aborted, repository restored to a clean state. Resolve manually and retry.`)

    }

  }

}

export function createBranch (branch: string, base: string): void {

  git(['checkout', '-b', branch, base])

}

function pushWithRetry (branch: string, args: readonly string[]): void {

  try {

    git(args)

  } catch {

    try {

      git(['pull', '--ff-only', 'origin', branch])

    } catch {

      throw new Error(`Push to ${branch} was rejected and the branch has diverged (fast-forward pull failed). Resolve manually and retry.`)

    }

    try {

      git(args)

    } catch {

      throw new Error(`Push to ${branch} was rejected again after a fast-forward pull. Resolve manually.`)

    }

  }

}

export function pushBranch (branch: string): void {

  pushWithRetry(branch, ['push', '-u', 'origin', branch])

}

export function commitAll (message: string): boolean {

  git(['add', '-A'])
  const status = git(['status', '--porcelain'], {allowFail: true})

  if (status.length === 0) {

    return false

  }

  git(['commit', '-m', message])
  return true

}

export function createTag (tag: string, message: string): void {

  git(['tag', '-a', tag, '-m', message])
  git(['push', 'origin', tag])

}

export function deleteLocalBranch (branch: string): void {

  git(['branch', '-D', branch], {allowFail: true})

}

export function mergeBranch (target: string, source: string): void {

  git(['checkout', target])
  git(['pull', '--no-rebase', 'origin', target], {allowFail: true})

  try {

    git(['merge', '--no-ff', source, '-m', `chore: merge ${source} into ${target}`])

  } catch {

    git(['merge', '--abort'], {allowFail: true})
    throw new Error(`Merge of ${source} into ${target} failed and was aborted. Resolve the conflict manually.`)

  }

  pushWithRetry(target, ['push', 'origin', target])

}
