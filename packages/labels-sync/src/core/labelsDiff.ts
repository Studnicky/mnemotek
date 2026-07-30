import type {LabelEntity} from '../entities/index.js'

export class LabelsDiff {

  public static computePlanned (fileLabels: readonly LabelEntity.Type[], currentLabels: readonly LabelEntity.Type[]): LabelEntity.Type[] {

    const currentNames = new Set(currentLabels.map((label) => {

      const result = label.name; return result

    }))
    const result = fileLabels.filter((label) => {

      return !currentNames.has(label.name)

    })
    return result

  }

}
