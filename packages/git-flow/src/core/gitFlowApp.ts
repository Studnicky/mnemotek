import {Mnemotek, MnemotekAppFactory} from '@studnicky/mnemotek'
import {readFileSync} from 'node:fs'

import type {CleanupFlowResultEntity, CommitMessageValidationEntity, FeatureFlowResultEntity, HotfixFlowResultEntity, MilestoneFlowResultEntity, ReleaseFlowResultEntity, SyncFlowResultEntity, VersionBumpEntity} from '../entities/index.js'

import {BranchTypeEntity, ConventionalCommitTypeEntity} from '../entities/index.js'
import {CleanupFlow} from './cleanupFlow.js'
import {GIT_FLOW_APP_SCHEMA} from './constants/GitFlowAppConstants.js'
import {ConventionalCommits} from './conventionalCommits.js'
import {FeatureFlow} from './featureFlow.js'
import {GitPrimitives} from './gitPrimitives.js'
import {HotfixFlow} from './hotfixFlow.js'
import {MilestoneFlow} from './milestoneFlow.js'
import {ReleaseFlow} from './releaseFlow.js'
import {SyncFlow} from './syncFlow.js'

export class GitFlowApp {

  public static createGitFlowApp (): Mnemotek {

    const app = new Mnemotek({
      description: 'Git-flow driver: feature/release/hotfix branch orchestration, PR create + CI wait + merge + tag + back-merge. Local-only, drives git and gh directly — no server, no proxy.',
      name: 'git-flow-tool',
      version: '0.1.0'
    })

    MnemotekAppFactory.registerCommands(
      app,
      {
        description: 'Feature/bugfix/chore/docs/test/refactor/perf/ci/build branch workflow: create, push (PR + CI wait + squash-merge), or status.',
        name: 'feature',
        runner: GitFlowApp.featureRunner,
        schema: {
          additionalProperties: false,
          properties: {
            branch: {description: 'Branch name for creation.',
              type: 'string'},
            create: {description: 'Create the branch.',
              type: 'boolean'},
            direct: {description: 'Skip PR and merge directly (only if target is unprotected).',
              type: 'boolean'},
            push: {description: 'Push the current branch and open/merge its PR.',
              type: 'boolean'},
            repository: GIT_FLOW_APP_SCHEMA.REPOSITORY_OPTION,
            type: {description: 'Branch type prefix: feature (default), bugfix, chore, docs, test, refactor, perf, ci, or build.',
              enum: BranchTypeEntity.Schema.enum,
              type: 'string'}
          },
          type: 'object'
        }
      },
      {
        description: 'Release workflow: develop -> release branch -> PR -> CI wait -> merge to main -> tag -> back-merge to develop.',
        name: 'release',
        runner: GitFlowApp.releaseRunner,
        schema: {
          additionalProperties: false,
          properties: {
            direct: {description: 'Skip PR and merge directly (only if main is unprotected).',
              type: 'boolean'},
            dryRun: {description: 'Preview the release without making changes.',
              type: 'boolean'},
            major: {description: 'Major version bump.',
              type: 'boolean'},
            minor: {description: 'Minor version bump.',
              type: 'boolean'},
            repository: GIT_FLOW_APP_SCHEMA.REPOSITORY_OPTION,
            root: GIT_FLOW_APP_SCHEMA.PROJECT_ROOT_OPTION,
            version: {description: 'Explicit version (e.g. 1.2.3). Overrides bump flags.',
              type: 'string'}
          },
          type: 'object'
        }
      },
      {
        description: 'Emergency hotfix workflow: main -> hotfix branch -> PR -> CI wait -> merge to main -> tag -> back-merge to develop.',
        name: 'hotfix',
        runner: GitFlowApp.hotfixRunner,
        schema: {
          additionalProperties: false,
          properties: {
            direct: {description: 'Skip PR and merge directly (only if main is unprotected).',
              type: 'boolean'},
            dryRun: {description: 'Preview the hotfix without making changes.',
              type: 'boolean'},
            repository: GIT_FLOW_APP_SCHEMA.REPOSITORY_OPTION,
            root: GIT_FLOW_APP_SCHEMA.PROJECT_ROOT_OPTION,
            version: {description: 'Explicit version (e.g. 1.2.4). Defaults to a patch bump.',
              type: 'string'}
          },
          type: 'object'
        }
      },
      {
        description: 'Fetch, prune, and fast-forward main/develop, then return to the original branch.',
        name: 'sync',
        runner: GitFlowApp.syncRunner,
        schema: {
          additionalProperties: false,
          properties: {},
          type: 'object'
        }
      },
      {
        description: 'Delete local branches already merged into the current branch (excluding main/master/develop/development and the current branch itself), then run git gc.',
        name: 'cleanup',
        runner: GitFlowApp.cleanupRunner,
        schema: {
          additionalProperties: false,
          properties: {
            dryRun: {description: 'Report which branches would be deleted without deleting them or running git gc.',
              type: 'boolean'}
          },
          type: 'object'
        }
      },
      {
        description: 'Stage everything and create a WIP checkpoint commit.',
        name: 'milestone',
        runner: GitFlowApp.milestoneRunner,
        schema: {
          additionalProperties: false,
          properties: {
            message: {description: 'Checkpoint message, appended after "wip: ". Defaults to "wip: checkpoint" when omitted.',
              type: 'string'}
          },
          type: 'object'
        }
      },
      {
        description: 'Validate a commit message against Conventional Commits; throws on an invalid message unless --lenient. Reads --message directly or --file (as git\'s commit-msg hook does).',
        name: 'commit-check',
        runner: GitFlowApp.commitCheckRunner,
        schema: {
          additionalProperties: false,
          properties: {
            branch: {description: 'Branch to check for a back-merge exemption. Defaults to the current branch.',
              type: 'string'},
            file: {description: 'Path to a file containing the commit message (as git passes to commit-msg).',
              type: 'string'},
            lenient: {description: 'Return valid:false instead of throwing on an invalid message. Use this for introspection (e.g. an agent inspecting why a message failed); a commit-msg hook or CI gate should omit this.',
              type: 'boolean'},
            message: {description: 'The commit message to validate.',
              type: 'string'}
          },
          type: 'object'
        }
      },
      {
        description: 'Derive the Conventional Commits type implied by a branch\'s prefix, so a commit message never has to be hand-guessed.',
        name: 'commit-type',
        runner: GitFlowApp.commitTypeRunner,
        schema: {
          additionalProperties: false,
          properties: {
            branch: {description: 'Branch to derive the type from. Defaults to the current branch.',
              type: 'string'}
          },
          type: 'object'
        }
      }
    )
    return app

  }

  private static readonly cleanupRunner = (payload: Record<string, unknown>): CleanupFlowResultEntity.Type => {

    const result = GitPrimitives.withLock(() => {

      const cleanupFlowResult = CleanupFlow.cleanupFlow({dryRun: payload.dryRun === true})
      return cleanupFlowResult

    })
    return result

  }

  private static readonly commitCheckRunner = (payload: Record<string, unknown>): CommitMessageValidationEntity.Type => {

    const branch = typeof payload.branch === 'string'
      ? payload.branch
      : GitPrimitives.currentBranch()
    const message = GitFlowApp.resolveCommitMessage(payload)

    if (message === undefined) {

      throw new TypeError('commit-check requires either "message" or "file".')

    }

    const result = ConventionalCommits.validateCommitMessage({branch,
      message})

    if (payload.lenient !== true && !result.valid) {

      throw new Error(`Invalid commit message "${result.subject}". Expected: type(scope)?: description, one of ${ConventionalCommitTypeEntity.Schema.enum.join(', ')}.`)

    }

    return result

  }

  private static readonly commitTypeRunner = (payload: Record<string, unknown>): {branch: string;
    prefix: string;
    type: ConventionalCommitTypeEntity.Type;} => {

    const branch = typeof payload.branch === 'string'
      ? payload.branch
      : GitPrimitives.currentBranch()
    const prefix = branch.split('/')[0] ?? branch

    return {branch,
      prefix,
      type: ConventionalCommits.branchPrefixToConventionalType(prefix)}

  }

  private static extractCommonFlowPayload (payload: Record<string, unknown>): {direct: boolean;
    dryRun: boolean;
    repository: string | undefined;
    root: string | undefined;
    version: string | undefined;} {

    return {
      direct: payload.direct === true,
      dryRun: payload.dryRun === true,
      repository: typeof payload.repository === 'string'
        ? payload.repository
        : undefined,
      root: typeof payload.root === 'string'
        ? payload.root
        : undefined,
      version: typeof payload.version === 'string'
        ? payload.version
        : undefined
    }

  }

  private static readonly featureRunner = (payload: Record<string, unknown>): FeatureFlowResultEntity.Type => {

    const result = GitPrimitives.withLock(() => {

      const featureFlowResult = FeatureFlow.featureFlow({
        branch: typeof payload.branch === 'string'
          ? payload.branch
          : undefined,
        create: payload.create === true,
        direct: payload.direct === true,
        push: payload.push === true,
        repository: typeof payload.repository === 'string'
          ? payload.repository
          : undefined,
        type: typeof payload.type === 'string'
          ? payload.type
          : undefined
      })
      return featureFlowResult

    })
    return result

  }

  private static readonly hotfixRunner = (payload: Record<string, unknown>): HotfixFlowResultEntity.Type => {

    const result = GitPrimitives.withLock(() => {

      const hotfixFlowResult = HotfixFlow.hotfixFlow(GitFlowApp.extractCommonFlowPayload(payload))
      return hotfixFlowResult

    })
    return result

  }

  private static readonly milestoneRunner = (payload: Record<string, unknown>): MilestoneFlowResultEntity.Type => {

    const result = GitPrimitives.withLock(() => {

      const milestoneFlowResult = MilestoneFlow.milestoneFlow({
        message: typeof payload.message === 'string'
          ? payload.message
          : undefined
      })
      return milestoneFlowResult

    })
    return result

  }

  private static readonly releaseRunner = (payload: Record<string, unknown>): ReleaseFlowResultEntity.Type => {

    const result = GitPrimitives.withLock(() => {

      const releaseFlowResult = ReleaseFlow.releaseFlow({
        ...GitFlowApp.extractCommonFlowPayload(payload),
        bump: GitFlowApp.resolveBump(payload)
      })
      return releaseFlowResult

    })
    return result

  }

  private static resolveBump (payload: Record<string, unknown>): VersionBumpEntity.Type {

    if (payload.major === true) {

      return 'major'

    }

    if (payload.minor === true) {

      return 'minor'

    }

    return 'patch'

  }

  private static resolveCommitMessage (payload: Record<string, unknown>): string | undefined {

    if (typeof payload.file === 'string') {

      return readFileSync(
        payload.file,
        'utf8'
      )

    }

    if (typeof payload.message === 'string') {

      return payload.message

    }

    return undefined

  }

  private static readonly syncRunner = (): SyncFlowResultEntity.Type => {

    const result = GitPrimitives.withLock(() => {

      const syncFlowResult = SyncFlow.syncFlow()
      return syncFlowResult

    })
    return result

  }

}
