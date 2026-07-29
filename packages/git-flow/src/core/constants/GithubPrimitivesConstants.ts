import type {MergeMethodEntity} from '../../entities/index.js'

export const MERGE_METHOD_FLAGS: Record<MergeMethodEntity.Type, string> = {
  merge: '--merge',
  rebase: '--rebase',
  squash: '--squash'
} as const
