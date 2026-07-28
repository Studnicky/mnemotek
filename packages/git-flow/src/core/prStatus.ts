import {execFileSync} from 'node:child_process'

export interface PrCheckResult {
  readonly bucket: string
  readonly name: string
}

export interface PrStatusResult {
  readonly [key: string]: unknown
  readonly checks: readonly PrCheckResult[]
  readonly mergeStateStatus: string
  readonly mergeable: string
  readonly number: number
}

interface RawCheck {
  readonly bucket: string
  readonly name: string
}

interface RawPrView {
  readonly mergeStateStatus: string
  readonly mergeable: string
}

function runGh (args: readonly string[]): string {

  return execFileSync('gh', [...args], {encoding: 'utf8'})

}

export function prStatus (input: {
  readonly number: number
  readonly repo?: string
}): PrStatusResult {

  const repoArgs = input.repo === undefined ? [] : ['--repo', input.repo]

  const checksJson = runGh([
    'pr',
    'checks',
    String(input.number),
    ...repoArgs,
    '--json',
    'name,bucket'
  ])
  const viewJson = runGh([
    'pr',
    'view',
    String(input.number),
    ...repoArgs,
    '--json',
    'mergeable,mergeStateStatus'
  ])

  const checks = JSON.parse(checksJson) as readonly RawCheck[]
  const view = JSON.parse(viewJson) as RawPrView

  return {
    checks: checks.map((check) => ({
      bucket: check.bucket,
      name: check.name
    })),
    mergeStateStatus: view.mergeStateStatus,
    mergeable: view.mergeable,
    number: input.number
  }

}
