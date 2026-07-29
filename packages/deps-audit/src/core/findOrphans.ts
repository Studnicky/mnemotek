import {basename, relative} from 'node:path'

import type {ModuleGraphInterface} from '../interfaces/ModuleGraphInterface.js'

import {FIND_ORPHANS_DEFAULTS} from './constants/FindOrphansConstants.js'

export class FindOrphans {

  public static findOrphanModules (root: string, graph: ModuleGraphInterface, entryPointNames: readonly string[] = FIND_ORPHANS_DEFAULTS.ENTRY_POINT_NAMES): string[] {

    const imported = new Set<string>()

    for (const targets of graph.edges.values()) {

      for (const target of targets) {

        imported.add(target)

      }

    }

    const entryPointSet = new Set(entryPointNames)
    const orphans: string[] = []

    for (const file of graph.edges.keys()) {

      if (imported.has(file)) {

        continue

      }

      if (entryPointSet.has(basename(file))) {

        continue

      }

      orphans.push(relative(
        root,
        file
      ))

    }

    return orphans

  }

}
