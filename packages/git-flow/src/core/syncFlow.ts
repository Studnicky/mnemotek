import {execFileSync} from 'node:child_process'

import type {SyncFlowResultEntity} from '../entities/index.js'

import {GitPrimitives} from './gitPrimitives.js'

export class SyncFlow {

  public static syncFlow (): SyncFlowResultEntity.Type {

    SyncFlow.git(SyncFlow.toArgumentList(
      'fetch',
      '--all',
      '--prune'
    ))

    const structure = GitPrimitives.detectBranchStructure()
    const branches = structure.development === undefined
      ? SyncFlow.toBranchList(structure.production)
      : SyncFlow.toBranchList(
        structure.production,
        structure.development
      )

    const fastForwarded = branches.filter((branch) => {

      const result = SyncFlow.fastForwardBranch(branch)
      return result

    })

    SyncFlow.git(SyncFlow.toArgumentList(
      'checkout',
      structure.current
    ))

    return {fastForwarded,
      pruned: true}

  }

  private static fastForwardBranch (branch: string): boolean {

    try {

      SyncFlow.git(SyncFlow.toArgumentList(
        'checkout',
        branch
      ))
      SyncFlow.git(SyncFlow.toArgumentList(
        'merge',
        '--ff-only',
        `origin/${branch}`
      ))
      return true

    } catch {

      // branch has diverged or has no upstream — leave it alone
      return false

    }

  }

  private static git (argumentList: readonly string[]): void {

    execFileSync(
      'git',
      [...argumentList],
      {encoding: 'utf8'}
    )

  }

  private static toArgumentList (...parts: string[]): string[] {

    const result = parts
    return result

  }

  private static toBranchList (...branches: string[]): string[] {

    const result = branches
    return result

  }

}
