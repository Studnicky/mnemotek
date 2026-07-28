import {execFileSync} from 'node:child_process'

const CI_WATCH_TIMEOUT_MS = 1_800_000

function gh (args: readonly string[], options: {readonly allowFail?: boolean; readonly timeout?: number} = {}): string {

  try {

    return execFileSync('gh', [...args], {encoding: 'utf8', timeout: options.timeout}).trim()

  } catch (error) {

    if (options.allowFail === true) {

      return ''

    }

    throw error

  }

}

export function isBranchProtected (branch: string, repo?: string): boolean {

  const repoArgs = repo === undefined ? [] : ['--repo', repo]
  const result = gh(['api', `repos/{owner}/{repo}/branches/${branch}/protection`, ...repoArgs], {allowFail: true})
  return result.length > 0

}

export function createPr (input: {
  readonly base: string
  readonly body: string
  readonly repo?: string
  readonly title: string
}): string {

  const repoArgs = input.repo === undefined ? [] : ['--repo', input.repo]
  return gh([
    'pr',
    'create',
    '--base',
    input.base,
    '--title',
    input.title,
    '--body',
    input.body,
    ...repoArgs
  ])

}

export function waitForChecks (input: {
  readonly repo?: string
}): void {

  const repoArgs = input.repo === undefined ? [] : ['--repo', input.repo]
  gh(['pr', 'checks', '--watch', '--fail-fast', ...repoArgs], {timeout: CI_WATCH_TIMEOUT_MS})

}

export function mergePr (input: {
  readonly repo?: string
}): void {

  const repoArgs = input.repo === undefined ? [] : ['--repo', input.repo]
  gh(['pr', 'merge', '--squash', '--delete-branch', ...repoArgs])

}

export function createGitHubRelease (input: {
  readonly notes: string
  readonly repo?: string
  readonly tag: string
}): string {

  const repoArgs = input.repo === undefined ? [] : ['--repo', input.repo]
  return gh([
    'release',
    'create',
    input.tag,
    '--title',
    input.tag,
    '--notes',
    input.notes,
    ...repoArgs
  ])

}
