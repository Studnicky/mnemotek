import type {MergeMethodEntity} from '../entities/index.js'

export class MergeMethodResolver {

  public static resolve (capabilities: {allowMerge: boolean;
    allowRebase: boolean;
    allowSquash: boolean;}, ...acceptableMethods: MergeMethodEntity.Type[]): MergeMethodEntity.Type {

    const availabilityByMethod: Record<MergeMethodEntity.Type, boolean> = {
      merge: capabilities.allowMerge,
      rebase: capabilities.allowRebase,
      squash: capabilities.allowSquash
    }

    const resolved = acceptableMethods.find((method) => {

      const isAvailable = availabilityByMethod[method]
      return isAvailable

    })

    if (resolved === undefined) {

      throw new Error(`None of the acceptable merge methods (${acceptableMethods.join(', ')}) are enabled for this repository. Enable one of them under Settings > General > Pull Requests on GitHub.`)

    }

    return resolved

  }

}
