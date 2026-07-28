export const CONVENTIONAL_COMMIT_TYPES = [
  'feat', 'fix', 'chore', 'docs', 'style', 'refactor', 'perf', 'test', 'ci', 'build', 'revert', 'wip'
] as const
export type ConventionalCommitType = typeof CONVENTIONAL_COMMIT_TYPES[number]

const EXEMPT_SUBJECT_PATTERN = /^(?:Merge|Rebase|Revert|Squashed commit of)/u
const BACKMERGE_BRANCH_PATTERN = /^chore\/backmerge-/u

const COMMIT_TYPES_ALTERNATION = CONVENTIONAL_COMMIT_TYPES.join('|')
const COMMIT_PATTERN = new RegExp(`^(${COMMIT_TYPES_ALTERNATION})(\\([^)]+\\))?!?: .+`, 'u')

const BRANCH_PREFIX_TO_COMMIT_TYPE: Readonly<Record<string, ConventionalCommitType>> = Object.freeze({
  bugfix: 'fix',
  feature: 'feat'
})

export function branchPrefixToConventionalType (prefix: string): ConventionalCommitType {

  const override = BRANCH_PREFIX_TO_COMMIT_TYPE[prefix]

  if (override !== undefined) {

    return override

  }

  const match = CONVENTIONAL_COMMIT_TYPES.find((type) => type === prefix)
  return match ?? 'chore'

}

export interface CommitMessageValidation {
  readonly [key: string]: unknown
  readonly exempt: boolean
  readonly scope: string | undefined
  readonly subject: string
  readonly type: string | undefined
  readonly valid: boolean
}

export function validateCommitMessage (input: {
  readonly branch?: string
  readonly message: string
}): CommitMessageValidation {

  const subject = input.message.split('\n')[0] ?? ''

  if (EXEMPT_SUBJECT_PATTERN.test(subject)) {

    return {exempt: true, scope: undefined, subject, type: undefined, valid: true}

  }

  if (input.branch !== undefined && BACKMERGE_BRANCH_PATTERN.test(input.branch)) {

    return {exempt: true, scope: undefined, subject, type: undefined, valid: true}

  }

  const match = COMMIT_PATTERN.exec(subject)

  if (match === null) {

    return {exempt: false, scope: undefined, subject, type: undefined, valid: false}

  }

  const scope = match[2] === undefined ? undefined : match[2].slice(1, -1)

  return {exempt: false, scope, subject, type: match[1], valid: true}

}
