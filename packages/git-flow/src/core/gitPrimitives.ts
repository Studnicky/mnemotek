import {execFileSync} from 'node:child_process'

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

export function currentBranch (): string {

  return git(['rev-parse', '--abbrev-ref', 'HEAD'])

}

export function hasUncommittedChanges (): boolean {

  return git(['status', '--porcelain']).length > 0

}

export function branchExists (branch: string): boolean {

  const result = git(['rev-parse', '--verify', '--quiet', branch], {allowFail: true})
  return result.length > 0

}

export function detectBranchStructure (): BranchStructure {

  const current = currentBranch()
  const hasMain = branchExists('main') || branchExists('origin/main')
  const production = hasMain ? 'main' : 'master'
  const hasDevelop = branchExists('develop') || branchExists('origin/develop')

  return {
    current,
    development: hasDevelop ? 'develop' : undefined,
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

  git(['pull', 'origin', branch], {allowFail: true})

}

export function createBranch (branch: string, base: string): void {

  git(['checkout', '-b', branch, base])

}

export function pushBranch (branch: string): void {

  git(['push', '-u', 'origin', branch])

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
  git(['pull', 'origin', target], {allowFail: true})
  git(['merge', '--no-ff', source, '-m', `chore: merge ${source} into ${target}`])
  git(['push', 'origin', target])

}
