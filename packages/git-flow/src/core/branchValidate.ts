import {execFileSync} from 'node:child_process'

const DEFAULT_PATTERN = '^(feature|feat|fix|chore|ci|docs|release|hotfix)/.+$'
const PROTECTED_BRANCHES: readonly string[] = ['main', 'master', 'develop']

export interface BranchValidateResult {
  readonly [key: string]: unknown
  readonly branch: string
  readonly pattern: string
  readonly protected: boolean
  readonly valid: boolean
}

function currentBranch (): string {

  return execFileSync(
    'git',
    ['rev-parse', '--abbrev-ref', 'HEAD'],
    {encoding: 'utf8'}
  ).trim()

}

export function branchValidate (input: {
  readonly branch?: string
  readonly pattern?: string
}): BranchValidateResult {

  const branch = input.branch ?? currentBranch()
  const pattern = input.pattern ?? DEFAULT_PATTERN

  if (PROTECTED_BRANCHES.includes(branch)) {

    return {
      branch,
      pattern,
      protected: true,
      valid: true
    }

  }

  const valid = new RegExp(pattern).test(branch)

  return {
    branch,
    pattern,
    protected: false,
    valid
  }

}
