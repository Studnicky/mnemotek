import {Mnemotek} from '@studnicky/mnemotek'

import {branchValidate} from './branchValidate.js'
import {changelogCheck} from './changelogCheck.js'
import {hooksInstall} from './hooksInstall.js'
import {prStatus} from './prStatus.js'

export function createGitFlowApp (): Mnemotek {

  const app = new Mnemotek({
    description: 'Local-only git-flow helpers: branch naming, hook install, changelog gating, PR status.',
    name: 'git-flow-tool',
    version: '0.1.0'
  })

  app.command({
    description: 'Validate a branch name against the git-flow naming convention.',
    name: 'branch-validate',
    runner: (payload) => branchValidate({
      branch: typeof payload.branch === 'string' ? payload.branch : undefined,
      pattern: typeof payload.pattern === 'string' ? payload.pattern : undefined
    }),
    schema: {
      additionalProperties: false,
      properties: {
        branch: {description: 'Branch to validate. Defaults to the current branch.', type: 'string'},
        pattern: {description: 'Override the naming regex.', type: 'string'}
      },
      type: 'object'
    }
  })

  app.command({
    description: 'Install pre-commit/pre-push git hooks and wire core.hooksPath.',
    name: 'hooks-install',
    runner: (payload) => hooksInstall({
      force: payload.force === true,
      targetDir: typeof payload.targetDir === 'string' ? payload.targetDir : undefined
    }),
    schema: {
      additionalProperties: false,
      properties: {
        force: {description: 'Overwrite existing hook files.', type: 'boolean'},
        targetDir: {description: 'Repository root. Defaults to the current directory.', type: 'string'}
      },
      type: 'object'
    }
  })

  app.command({
    description: 'Check that a changeset or CHANGELOG Unreleased section exists.',
    name: 'changelog-check',
    runner: (payload) => changelogCheck({
      root: typeof payload.root === 'string' ? payload.root : undefined
    }),
    schema: {
      additionalProperties: false,
      properties: {
        root: {description: 'Repository root. Defaults to the current directory.', type: 'string'}
      },
      type: 'object'
    }
  })

  app.command({
    description: 'Report a pull request\'s mergeability and check status (single snapshot, no polling).',
    name: 'pr-status',
    runner: (payload) => {

      if (typeof payload.number !== 'number') {

        throw new TypeError('pr-status requires a numeric "number".')

      }

      return prStatus({
        number: payload.number,
        repo: typeof payload.repo === 'string' ? payload.repo : undefined
      })

    },
    schema: {
      additionalProperties: false,
      properties: {
        number: {description: 'Pull request number.', type: 'number'},
        repo: {description: 'owner/repo. Defaults to the current repo.', type: 'string'}
      },
      required: ['number'],
      type: 'object'
    }
  })

  return app

}
