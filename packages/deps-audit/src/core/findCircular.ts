import {relative} from 'node:path'

import type {ModuleGraphInterface} from '../interfaces/ModuleGraphInterface.js'

export class FindCircular {

  public static findCircularImports (root: string, graph: ModuleGraphInterface): string[][] {

    const cycles: string[][] = []
    const visited = new Set<string>()
    const stack: string[] = []
    const onStack = new Set<string>()

    for (const file of graph.edges.keys()) {

      FindCircular.visit({cycles,
        file,
        graph,
        onStack,
        root,
        stack,
        visited})

    }

    return cycles

  }

  private static visit (context: {cycles: string[][];
    file: string;
    graph: ModuleGraphInterface;
    onStack: Set<string>;
    root: string;
    stack: string[];
    visited: Set<string>;}): void {

    const {cycles, file, graph, onStack, root, stack, visited} = context

    if (onStack.has(file)) {

      const cycleStart = stack.indexOf(file)
      const cycleElements = [
        ...stack.slice(cycleStart),
        file
      ]
      const cyclePath = cycleElements.map((entry) => {

        const relativeEntry = relative(
          root,
          entry
        )
        return relativeEntry

      })

      cycles.push(cyclePath)
      return

    }

    if (visited.has(file)) {

      return

    }

    visited.add(file)
    stack.push(file)
    onStack.add(file)

    const targets = graph.edges.get(file) ?? []

    for (const target of targets) {

      FindCircular.visit({cycles,
        file: target,
        graph,
        onStack,
        root,
        stack,
        visited})

    }

    stack.pop()
    onStack.delete(file)

  }

}
