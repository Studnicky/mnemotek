import {execFileSync} from 'node:child_process'

import {detectBranchStructure} from './gitPrimitives.js'

export interface SyncFlowResult {
  readonly [key: string]: unknown
  readonly fastForwarded: readonly string[]
  readonly pruned: boolean
}

function git (args: readonly string[]): void {

  execFileSync('git', [...args], {encoding: 'utf8'})

}

export function syncFlow (): SyncFlowResult {

  git(['fetch', '--all', '--prune'])

  const structure = detectBranchStructure()
  const branches = structure.development === undefined
    ? [structure.production]
    : [structure.production, structure.development]

  const fastForwarded: string[] = []

  for (const branch of branches) {

    try {

      git(['checkout', branch])
      git(['merge', '--ff-only', `origin/${branch}`])
      fastForwarded.push(branch)

    } catch {

      // branch has diverged or has no upstream — leave it alone

    }

  }

  git(['checkout', structure.current])

  return {fastForwarded, pruned: true}

}
