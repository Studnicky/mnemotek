import {branchPrefixToConventionalType} from './conventionalCommits.js'
import * as gitPrimitives from './gitPrimitives.js'
import * as githubPrimitives from './githubPrimitives.js'

export interface FeatureFlowResult {
  readonly [key: string]: unknown
  readonly branch: string
  readonly commits: readonly {readonly hash: string; readonly subject: string}[]
  readonly error: string | undefined
  readonly mode: string
  readonly prUrl: string | undefined
  readonly pushed: boolean
  readonly targetBranch: string
}

// hotfix and release are their own dedicated commands, not a --type here.
const BRANCH_TYPES = ['feature', 'bugfix', 'chore', 'docs', 'test', 'refactor', 'perf', 'ci', 'build'] as const
export type BranchType = typeof BRANCH_TYPES[number]

function isBranchType (value: string): value is BranchType {

  return (BRANCH_TYPES as readonly string[]).includes(value)

}

function branchTypePrefixes (): readonly string[] {

  return BRANCH_TYPES.map((type) => `${type}/`)

}

function formatBranchName (name: string, type: BranchType): string {

  return branchTypePrefixes().some((prefix) => name.startsWith(prefix)) ? name : `${type}/${name}`

}

function startsWithKnownPrefix (branch: string): boolean {

  return branchTypePrefixes().some((prefix) => branch.startsWith(prefix))

}


export function featureFlow (input: {
  readonly branch?: string
  readonly create?: boolean
  readonly direct?: boolean
  readonly push?: boolean
  readonly repo?: string
  readonly type?: string
}): FeatureFlowResult {

  const branchType = input.type !== undefined && isBranchType(input.type) ? input.type : 'feature'

  const structure = gitPrimitives.detectBranchStructure()
  const targetBranch = structure.development ?? structure.production
  const protectedTarget = githubPrimitives.isBranchProtected(targetBranch, input.repo)
  const usePr = protectedTarget || input.direct !== true

  if (input.push === true) {

    const branch = structure.current

    if (!startsWithKnownPrefix(branch)) {

      return {
        branch,
        commits: [],
        error: `Not on a branch prefixed with one of: ${BRANCH_TYPES.join(', ')}.`,
        mode: 'push',
        prUrl: undefined,
        pushed: false,
        targetBranch
      }

    }

    if (gitPrimitives.hasUncommittedChanges()) {

      return {
        branch,
        commits: [],
        error: 'Uncommitted changes. Commit first.',
        mode: 'push',
        prUrl: undefined,
        pushed: false,
        targetBranch
      }

    }

    const commits = gitPrimitives.getCommitsAhead(targetBranch)

    gitPrimitives.pushBranch(branch)

    if (!usePr) {

      return {branch, commits, error: undefined, mode: 'push', prUrl: undefined, pushed: true, targetBranch}

    }

    const [prefix, ...nameParts] = branch.split('/')
    // Branch-type prefix and Conventional Commits type are different vocabularies:
    // the branch says "bugfix", the commit type is "fix" (bugfix isn't a valid
    // Conventional Commits type). feature -> feat is the other divergence.
    const conventionalType = branchPrefixToConventionalType(prefix ?? 'chore')
    const prUrl = githubPrimitives.createPr({
      base: targetBranch,
      body: `Branch \`${branch}\` (${String(commits.length)} commit(s)).`,
      repo: input.repo,
      title: `${conventionalType}: ${nameParts.join('/')}`
    })

    githubPrimitives.waitForChecks({repo: input.repo})
    githubPrimitives.mergePr({method: 'squash', repo: input.repo})

    return {branch, commits, error: undefined, mode: 'push', prUrl, pushed: true, targetBranch}

  }

  if (input.create === true) {

    if (input.branch === undefined) {

      return {
        branch: '',
        commits: [],
        error: 'A branch name is required to create a branch.',
        mode: 'create',
        prUrl: undefined,
        pushed: false,
        targetBranch
      }

    }

    const branchName = formatBranchName(input.branch, branchType)

    if (gitPrimitives.branchExists(branchName)) {

      gitPrimitives.checkoutBranch(branchName)

      return {
        branch: branchName,
        commits: gitPrimitives.getCommitsAhead(targetBranch),
        error: undefined,
        mode: 'create',
        prUrl: undefined,
        pushed: false,
        targetBranch
      }

    }

    if (gitPrimitives.hasUncommittedChanges()) {

      return {
        branch: '',
        commits: [],
        error: 'Uncommitted changes. Commit first.',
        mode: 'create',
        prUrl: undefined,
        pushed: false,
        targetBranch
      }

    }

    gitPrimitives.checkoutBranch(targetBranch)
    gitPrimitives.pullBranch(targetBranch)
    gitPrimitives.createBranch(branchName, targetBranch)

    return {branch: branchName, commits: [], error: undefined, mode: 'create', prUrl: undefined, pushed: false, targetBranch}

  }

  const branch = structure.current
  const commits = startsWithKnownPrefix(branch) ? gitPrimitives.getCommitsAhead(targetBranch) : []

  return {branch, commits, error: undefined, mode: 'status', prUrl: undefined, pushed: false, targetBranch}

}
