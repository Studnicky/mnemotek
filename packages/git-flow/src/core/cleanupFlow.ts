import type {CleanupFlowResultEntity} from '../entities/index.js'

import {CLEANUP_FLOW_PATTERNS} from './constants/CleanupFlowConstants.js'
import {ExecCliTool} from './execCliTool.js'
import {GitPrimitives} from './gitPrimitives.js'

export class CleanupFlow {

  private static readonly PROTECTED_BRANCHES = new Set([
    'develop',
    'development',
    'main',
    'master'
  ])

  public static cleanupFlow (options: {dryRun?: boolean} = {}): CleanupFlowResultEntity.Type {

    const dryRun = options.dryRun === true
    const candidates = CleanupFlow.mergedBranchCandidates(GitPrimitives.currentBranch())

    if (!dryRun) {

      candidates.forEach((branch) => {

        GitPrimitives.deleteLocalBranch(branch)

      })
      ExecCliTool.run(
        'git',
        CleanupFlow.toArgumentList('gc')
      )

    }

    return {deleted: candidates,
      dryRun}

  }

  private static mergedBranchCandidates (currentBranch: string): string[] {

    const output = ExecCliTool.run(
      'git',
      CleanupFlow.toArgumentList(
        'branch',
        '--merged'
      ),
      {allowFail: true}
    )

    if (output.length === 0) {

      return []

    }

    return output.split('\n').reduce(
      (candidates: string[], line): string[] => {

        const branch = line.replace(
          CLEANUP_FLOW_PATTERNS.BRANCH_LIST_PREFIX,
          ''
        ).trim()

        if (branch.length > 0 && branch !== currentBranch && !CleanupFlow.PROTECTED_BRANCHES.has(branch)) {

          candidates.push(branch)

        }

        return candidates

      },
      []
    )

  }

  private static toArgumentList (...parts: string[]): string[] {

    const result = parts
    return result

  }

}
