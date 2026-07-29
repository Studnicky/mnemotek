import type {BranchStructureEntity, FeatureFlowResultEntity} from '../entities/index.js'

import {BranchTypeEntity} from '../entities/index.js'
import {ConventionalCommits} from './conventionalCommits.js'
import {GithubPrimitives} from './githubPrimitives.js'
import {GitPrimitives} from './gitPrimitives.js'
import {MergeMethodResolver} from './mergeMethodResolver.js'
import {PrTemplateInstaller} from './prTemplateInstaller.js'

export class FeatureFlow {

  public static featureFlow (input: {branch?: string;
    create?: boolean;
    direct?: boolean;
    push?: boolean;
    repository?: string;
    type?: string;}): FeatureFlowResultEntity.Type {

    const branchType = input.type !== undefined && FeatureFlow.isBranchType(input.type)
      ? input.type
      : 'feature'

    const structure = GitPrimitives.detectBranchStructure()
    const targetBranch = structure.development ?? structure.production
    const protectedTarget = GithubPrimitives.isBranchProtected(
      targetBranch,
      input.repository
    )
    const usePr = protectedTarget || input.direct !== true

    let mode = 'status'

    if (input.push === true) {

      mode = 'push'

    } else if (input.create === true) {

      mode = 'create'

    }

    try {

      GitPrimitives.assertCleanRepositoryState()

    } catch (error) {

      return {
        branch: structure.current,
        commits: [],
        error: error instanceof Error
          ? error.message
          : String(error),
        mode,
        pushed: false,
        targetBranch
      }

    }

    if (input.push === true) {

      return FeatureFlow.push({repository: input.repository,
        structure,
        targetBranch,
        usePr})

    }

    if (input.create === true) {

      return FeatureFlow.create(
        input.branch,
        branchType,
        targetBranch
      )

    }

    const branch = structure.current
    const commits = FeatureFlow.startsWithKnownPrefix(branch)
      ? GitPrimitives.getCommitsAhead(targetBranch)
      : []

    return {branch,
      commits,
      mode: 'status',
      pushed: false,
      targetBranch}

  }

  private static branchTypePrefixes (): readonly string[] {

    const prefixes = BranchTypeEntity.Schema.enum.map((type) => {

      const prefix = `${type}/`
      return prefix

    })
    return prefixes

  }

  private static create (branchName: string | undefined, branchType: BranchTypeEntity.Type, targetBranch: string): FeatureFlowResultEntity.Type {

    if (branchName === undefined) {

      return {
        branch: '',
        commits: [],
        error: 'A branch name is required to create a branch.',
        mode: 'create',
        pushed: false,
        targetBranch
      }

    }

    const formattedBranchName = FeatureFlow.formatBranchName(
      branchName,
      branchType
    )

    if (GitPrimitives.branchExists(formattedBranchName)) {

      GitPrimitives.checkoutBranch(formattedBranchName)

      return {
        branch: formattedBranchName,
        commits: GitPrimitives.getCommitsAhead(targetBranch),
        mode: 'create',
        pushed: false,
        targetBranch
      }

    }

    if (GitPrimitives.hasUncommittedChanges()) {

      return {
        branch: '',
        commits: [],
        error: 'Uncommitted changes. Commit first.',
        mode: 'create',
        pushed: false,
        targetBranch
      }

    }

    GitPrimitives.checkoutBranch(targetBranch)
    GitPrimitives.pullBranch(targetBranch)
    GitPrimitives.createBranch(
      formattedBranchName,
      targetBranch
    )

    return {branch: formattedBranchName,
      commits: [],
      mode: 'create',
      pushed: false,
      targetBranch}

  }

  private static formatBranchName (name: string, type: BranchTypeEntity.Type): string {

    return FeatureFlow.branchTypePrefixes().some((prefix) => {

      const result = name.startsWith(prefix)
      return result

    })
      ? name
      : `${type}/${name}`

  }

  private static isBranchType (value: string): value is BranchTypeEntity.Type {

    const result = BranchTypeEntity.validate(value)
    return result

  }

  private static push (input: {repository: string | undefined;
    structure: BranchStructureEntity.Type;
    targetBranch: string;
    usePr: boolean;}): FeatureFlowResultEntity.Type {

    const {repository, structure, targetBranch, usePr} = input
    const branch = structure.current

    if (!FeatureFlow.startsWithKnownPrefix(branch)) {

      return {
        branch,
        commits: [],
        error: `Not on a branch prefixed with one of: ${BranchTypeEntity.Schema.enum.join(', ')}.`,
        mode: 'push',
        pushed: false,
        targetBranch
      }

    }

    if (GitPrimitives.hasUncommittedChanges()) {

      return {
        branch,
        commits: [],
        error: 'Uncommitted changes. Commit first.',
        mode: 'push',
        pushed: false,
        targetBranch
      }

    }

    const commits = GitPrimitives.getCommitsAhead(targetBranch)

    GitPrimitives.pushBranch(branch)

    if (!usePr) {

      return {branch,
        commits,
        mode: 'push',
        pushed: true,
        targetBranch}

    }

    const [
      prefix,
      ...nameParts
    ] = branch.split('/')

    /*
     * Branch-type prefix and Conventional Commits type are different vocabularies:
     * the branch says "bugfix", the commit type is "fix" (bugfix isn't a valid
     * Conventional Commits type). feature -> feat is the other divergence.
     */
    const conventionalType = ConventionalCommits.branchPrefixToConventionalType(prefix ?? 'chore')

    PrTemplateInstaller.ensureTemplate(process.cwd())

    const prUrl = GithubPrimitives.createPr({
      base: targetBranch,
      body: `Branch \`${branch}\` (${String(commits.length)} commit(s)).`,
      repository,
      title: `${conventionalType}: ${nameParts.join('/')}`
    })

    GithubPrimitives.waitForChecks({repository})

    const capabilities = GithubPrimitives.repositoryMergeCapabilities(repository)
    const method = MergeMethodResolver.resolve(
      capabilities,
      'squash',
      'merge',
      'rebase'
    )

    GithubPrimitives.mergePr({method,
      repository})

    return {branch,
      commits,
      mode: 'push',
      prUrl,
      pushed: true,
      targetBranch}

  }

  private static startsWithKnownPrefix (branch: string): boolean {

    const matches = FeatureFlow.branchTypePrefixes().some((prefix) => {

      const matchesPrefix = branch.startsWith(prefix)
      return matchesPrefix

    })
    return matches

  }

}
