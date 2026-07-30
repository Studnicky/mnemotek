import type {MilestoneFlowResultEntity} from '../entities/index.js'

import {GitPrimitives} from './gitPrimitives.js'

export class MilestoneFlow {

  private static readonly DEFAULT_MESSAGE = 'wip: checkpoint'

  public static milestoneFlow (options: {message?: string} = {}): MilestoneFlowResultEntity.Type {

    const message = options.message === undefined
      ? MilestoneFlow.DEFAULT_MESSAGE
      : `wip: ${options.message}`
    const committed = GitPrimitives.commitAll(message)

    return {committed,
      message}

  }

}
