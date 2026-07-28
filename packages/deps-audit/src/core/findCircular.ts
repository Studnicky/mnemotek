import {relative} from 'node:path'

import type {ModuleGraph} from './scanImports.js'

export function findCircularImports (root: string, graph: ModuleGraph): readonly string[][] {

  const cycles: string[][] = []
  const visited = new Set<string>()
  const stack: string[] = []
  const onStack = new Set<string>()

  function visit (file: string): void {

    if (onStack.has(file)) {

      const cycleStart = stack.indexOf(file)
      cycles.push([...stack.slice(cycleStart), file].map((entry) => relative(root, entry)))
      return

    }

    if (visited.has(file)) {

      return

    }

    visited.add(file)
    stack.push(file)
    onStack.add(file)

    for (const target of graph.edges.get(file) ?? []) {

      visit(target)

    }

    stack.pop()
    onStack.delete(file)

  }

  for (const file of graph.edges.keys()) {

    visit(file)

  }

  return cycles

}
