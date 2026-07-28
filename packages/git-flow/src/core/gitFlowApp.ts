import {Mnemotek} from '@studnicky/mnemotek'
import {readFileSync} from 'node:fs'

import {branchPrefixToConventionalType, CONVENTIONAL_COMMIT_TYPES, validateCommitMessage} from './conventionalCommits.js'
import {featureFlow} from './featureFlow.js'
import {currentBranch} from './gitPrimitives.js'
import {hotfixFlow} from './hotfixFlow.js'
import {releaseFlow} from './releaseFlow.js'
import {syncFlow} from './syncFlow.js'

export function createGitFlowApp (): Mnemotek {

  const app = new Mnemotek({
    description: 'Git-flow driver: feature/release/hotfix branch orchestration, PR create + CI wait + merge + tag + back-merge. Local-only, drives git and gh directly — no server, no proxy.',
    name: 'git-flow-tool',
    version: '0.1.0'
  })

  app.command({
    description: 'Feature/bugfix/chore/docs/test/refactor/perf/ci/build branch workflow: create, push (PR + CI wait + squash-merge), or status.',
    name: 'feature',
    runner: (payload) => featureFlow({
      branch: typeof payload.branch === 'string' ? payload.branch : undefined,
      create: payload.create === true,
      direct: payload.direct === true,
      push: payload.push === true,
      repo: typeof payload.repo === 'string' ? payload.repo : undefined,
      type: typeof payload.type === 'string' ? payload.type : undefined
    }),
    schema: {
      additionalProperties: false,
      properties: {
        branch: {description: 'Branch name for creation.', type: 'string'},
        create: {description: 'Create the branch.', type: 'boolean'},
        direct: {description: 'Skip PR and merge directly (only if target is unprotected).', type: 'boolean'},
        push: {description: 'Push the current branch and open/merge its PR.', type: 'boolean'},
        repo: {description: 'owner/repo. Defaults to the current repo.', type: 'string'},
        type: {description: 'Branch type prefix: feature (default), bugfix, chore, docs, test, refactor, perf, ci, or build.', enum: ['feature', 'bugfix', 'chore', 'docs', 'test', 'refactor', 'perf', 'ci', 'build'], type: 'string'}
      },
      type: 'object'
    }
  })

  app.command({
    description: 'Release workflow: develop -> release branch -> PR -> CI wait -> merge to main -> tag -> back-merge to develop.',
    name: 'release',
    runner: (payload) => releaseFlow({
      bump: payload.major === true ? 'major' : (payload.minor === true ? 'minor' : 'patch'),
      direct: payload.direct === true,
      dryRun: payload.dryRun === true,
      repo: typeof payload.repo === 'string' ? payload.repo : undefined,
      root: typeof payload.root === 'string' ? payload.root : undefined,
      version: typeof payload.version === 'string' ? payload.version : undefined
    }),
    schema: {
      additionalProperties: false,
      properties: {
        direct: {description: 'Skip PR and merge directly (only if main is unprotected).', type: 'boolean'},
        dryRun: {description: 'Preview the release without making changes.', type: 'boolean'},
        major: {description: 'Major version bump.', type: 'boolean'},
        minor: {description: 'Minor version bump.', type: 'boolean'},
        repo: {description: 'owner/repo. Defaults to the current repo.', type: 'string'},
        root: {description: 'Project root containing package.json/CHANGELOG.md.', type: 'string'},
        version: {description: 'Explicit version (e.g. 1.2.3). Overrides bump flags.', type: 'string'}
      },
      type: 'object'
    }
  })

  app.command({
    description: 'Emergency hotfix workflow: main -> hotfix branch -> PR -> CI wait -> merge to main -> tag -> back-merge to develop.',
    name: 'hotfix',
    runner: (payload) => hotfixFlow({
      direct: payload.direct === true,
      dryRun: payload.dryRun === true,
      repo: typeof payload.repo === 'string' ? payload.repo : undefined,
      root: typeof payload.root === 'string' ? payload.root : undefined,
      version: typeof payload.version === 'string' ? payload.version : undefined
    }),
    schema: {
      additionalProperties: false,
      properties: {
        direct: {description: 'Skip PR and merge directly (only if main is unprotected).', type: 'boolean'},
        dryRun: {description: 'Preview the hotfix without making changes.', type: 'boolean'},
        repo: {description: 'owner/repo. Defaults to the current repo.', type: 'string'},
        root: {description: 'Project root containing package.json/CHANGELOG.md.', type: 'string'},
        version: {description: 'Explicit version (e.g. 1.2.4). Defaults to a patch bump.', type: 'string'}
      },
      type: 'object'
    }
  })

  app.command({
    description: 'Fetch, prune, and fast-forward main/develop, then return to the original branch.',
    name: 'sync',
    runner: () => syncFlow(),
    schema: {
      additionalProperties: false,
      properties: {},
      type: 'object'
    }
  })

  app.command({
    description: 'Validate a commit message against Conventional Commits; throws on an invalid message unless --lenient. Reads --message directly or --file (as git\'s commit-msg hook does).',
    name: 'commit-check',
    runner: (payload) => {

      const branch = typeof payload.branch === 'string' ? payload.branch : currentBranch()
      const message = typeof payload.file === 'string'
        ? readFileSync(payload.file, 'utf8')
        : (typeof payload.message === 'string' ? payload.message : undefined)

      if (message === undefined) {

        throw new TypeError('commit-check requires either "message" or "file".')

      }

      const result = validateCommitMessage({branch, message})

      if (payload.lenient !== true && !result.valid) {

        throw new Error(`Invalid commit message "${result.subject}". Expected: type(scope)?: description, one of ${CONVENTIONAL_COMMIT_TYPES.join(', ')}.`)

      }

      return result

    },
    schema: {
      additionalProperties: false,
      properties: {
        branch: {description: 'Branch to check for a back-merge exemption. Defaults to the current branch.', type: 'string'},
        file: {description: 'Path to a file containing the commit message (as git passes to commit-msg).', type: 'string'},
        lenient: {description: 'Return valid:false instead of throwing on an invalid message. Use this for introspection (e.g. an agent inspecting why a message failed); a commit-msg hook or CI gate should omit this.', type: 'boolean'},
        message: {description: 'The commit message to validate.', type: 'string'}
      },
      type: 'object'
    }
  })

  app.command({
    description: 'Derive the Conventional Commits type implied by a branch\'s prefix, so a commit message never has to be hand-guessed.',
    name: 'commit-type',
    runner: (payload) => {

      const branch = typeof payload.branch === 'string' ? payload.branch : currentBranch()
      const prefix = branch.split('/')[0] ?? branch

      return {branch, prefix, type: branchPrefixToConventionalType(prefix)}

    },
    schema: {
      additionalProperties: false,
      properties: {
        branch: {description: 'Branch to derive the type from. Defaults to the current branch.', type: 'string'}
      },
      type: 'object'
    }
  })

  return app

}
