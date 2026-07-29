import type {CommitMessageValidationEntity} from '../entities/index.js'

import {ConventionalCommitTypeEntity} from '../entities/index.js'
import {CONVENTIONAL_COMMITS_PATTERNS} from './constants/ConventionalCommitsConstants.js'

const BRANCH_PREFIX_TO_COMMIT_TYPE: Readonly<Record<string, ConventionalCommitTypeEntity.Type>> = Object.freeze({
  bugfix: 'fix',
  feature: 'feat'
})

export class ConventionalCommits {

  public static branchPrefixToConventionalType (prefix: string): ConventionalCommitTypeEntity.Type {

    const override = BRANCH_PREFIX_TO_COMMIT_TYPE[prefix]

    if (override !== undefined) {

      return override

    }

    return ConventionalCommitTypeEntity.validate(prefix)
      ? prefix
      : 'chore'

  }

  public static validateCommitMessage (input: {branch?: string;
    message: string;}): CommitMessageValidationEntity.Type {

    const subject = input.message.split('\n')[0] ?? ''

    if (CONVENTIONAL_COMMITS_PATTERNS.EXEMPT_SUBJECT.test(subject)) {

      return {exempt: true,
        scope: undefined,
        subject,
        type: undefined,
        valid: true}

    }

    if (input.branch?.startsWith('chore/backmerge-') === true) {

      return {exempt: true,
        scope: undefined,
        subject,
        type: undefined,
        valid: true}

    }

    const commitTypesAlternation = ConventionalCommitTypeEntity.Schema.enum.join('|')
    const commitPattern = new RegExp(
      `^(${commitTypesAlternation})(\\([^)]+\\))?!?: .+`,
      'u'
    )
    const match = commitPattern.exec(subject)

    if (match === null) {

      return {exempt: false,
        scope: undefined,
        subject,
        type: undefined,
        valid: false}

    }

    const matchedType = match[1]
    const matchedScope = match[2]
    const scope = matchedScope === undefined
      ? undefined
      : matchedScope.slice(
        1,
        -1
      )

    return {exempt: false,
      scope,
      subject,
      type: matchedType,
      valid: true}

  }

}
