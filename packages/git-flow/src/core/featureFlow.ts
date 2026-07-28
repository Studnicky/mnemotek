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

function formatBranchName (name: string): string {

  return name.startsWith('feature/') ? name : `feature/${name}`

}

export function featureFlow (input: {
  readonly branch?: string
  readonly create?: boolean
  readonly direct?: boolean
  readonly push?: boolean
  readonly repo?: string
}): FeatureFlowResult {

  const structure = gitPrimitives.detectBranchStructure()
  const targetBranch = structure.development ?? structure.production
  const protectedTarget = githubPrimitives.isBranchProtected(targetBranch, input.repo)
  const usePr = protectedTarget || input.direct !== true

  if (input.push === true) {

    const branch = structure.current

    if (!branch.startsWith('feature/')) {

      return {
        branch,
        commits: [],
        error: 'Not on a feature branch.',
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

    const prUrl = githubPrimitives.createPr({
      base: targetBranch,
      body: `Feature branch \`${branch}\` (${String(commits.length)} commit(s)).`,
      repo: input.repo,
      title: `feat: ${branch.replace('feature/', '')}`
    })

    githubPrimitives.waitForChecks({repo: input.repo})
    githubPrimitives.mergePr({repo: input.repo})

    return {branch, commits, error: undefined, mode: 'push', prUrl, pushed: true, targetBranch}

  }

  if (input.create === true) {

    if (input.branch === undefined) {

      return {
        branch: '',
        commits: [],
        error: 'A branch name is required to create a feature branch.',
        mode: 'create',
        prUrl: undefined,
        pushed: false,
        targetBranch
      }

    }

    const branchName = formatBranchName(input.branch)

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
  const commits = branch.startsWith('feature/') ? gitPrimitives.getCommitsAhead(targetBranch) : []

  return {branch, commits, error: undefined, mode: 'status', prUrl: undefined, pushed: false, targetBranch}

}
