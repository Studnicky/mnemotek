import {Mnemotek} from '@studnicky/mnemotek'

import {findCircularImports} from './findCircular.js'
import {findOrphanModules} from './findOrphans.js'
import {findUnusedDependencies} from './findUnusedDeps.js'
import {buildModuleGraph} from './scanImports.js'

function resolveRoot (payload: Record<string, unknown>): string {

  return typeof payload.root === 'string' ? payload.root : process.cwd()

}

export function createDepsAuditApp (): Mnemotek {

  const app = new Mnemotek({
    description: 'Static import-graph analysis: circular deps, orphan modules, unused package.json dependencies. No server.',
    name: 'deps-audit-tool',
    version: '0.1.0'
  })

  app.command({
    description: 'Find circular import chains within a TypeScript source root.',
    name: 'circular',
    runner: (payload) => {

      const root = resolveRoot(payload)
      const graph = buildModuleGraph(root)
      const cycles = findCircularImports(root, graph)

      return {cycleCount: cycles.length, cycles, ok: cycles.length === 0}

    },
    schema: {
      additionalProperties: false,
      properties: {
        root: {description: 'Source root to scan (e.g. "src"). Defaults to the current directory.', type: 'string'}
      },
      type: 'object'
    }
  })

  app.command({
    description: 'Find source files never imported by any other file in the scanned tree.',
    name: 'orphans',
    runner: (payload) => {

      const root = resolveRoot(payload)
      const graph = buildModuleGraph(root)
      const orphans = findOrphanModules(root, graph)

      return {ok: orphans.length === 0, orphanCount: orphans.length, orphans}

    },
    schema: {
      additionalProperties: false,
      properties: {
        root: {description: 'Source root to scan (e.g. "src"). Defaults to the current directory.', type: 'string'}
      },
      type: 'object'
    }
  })

  app.command({
    description: 'Find package.json dependencies never referenced by a bare-specifier import in the scanned tree.',
    name: 'unused-deps',
    runner: (payload) => {

      const root = resolveRoot(payload)
      const graph = buildModuleGraph(root)
      const unused = findUnusedDependencies(root, graph)

      return {ok: unused.length === 0, unused, unusedCount: unused.length}

    },
    schema: {
      additionalProperties: false,
      properties: {
        root: {description: 'Project root containing package.json and the source tree. Defaults to the current directory.', type: 'string'}
      },
      type: 'object'
    }
  })

  return app

}
