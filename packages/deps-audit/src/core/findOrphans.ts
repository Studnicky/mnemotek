import {basename, relative} from 'node:path'

import type {ModuleGraph} from './scanImports.js'

export function findOrphanModules (root: string, graph: ModuleGraph, entryPointNames: readonly string[] = ['index.ts', 'cli.ts', 'main.ts']): readonly string[] {

  const imported = new Set<string>()

  for (const targets of graph.edges.values()) {

    for (const target of targets) {

      imported.add(target)

    }

  }

  const orphans: string[] = []

  for (const file of graph.edges.keys()) {

    if (imported.has(file)) {

      continue

    }

    if (entryPointNames.includes(basename(file))) {

      continue

    }

    orphans.push(relative(root, file))

  }

  return orphans

}
