import {Mnemotek, MnemotekAppFactory, PayloadOptions} from '@studnicky/mnemotek'

import type {CircularResultEntity, OrphansResultEntity, UnusedDepsResultEntity} from '../entities/index.js'
import type {ModuleGraphInterface} from '../interfaces/ModuleGraphInterface.js'

import {FindCircular} from './findCircular.js'
import {FindOrphans} from './findOrphans.js'
import {FindUnusedDeps} from './findUnusedDeps.js'
import {ScanImports} from './scanImports.js'

const SOURCE_ROOT_OPTION_SCHEMA = {
  description: 'Source root to scan (e.g. "src"). Defaults to the current directory.',
  type: 'string'
}

export class DepsAuditApp {

  public static createDepsAuditApp (): Mnemotek {

    const app = new Mnemotek({
      description: 'Static import-graph analysis: circular deps, orphan modules, unused package.json dependencies. No server.',
      name: 'deps-audit-tool',
      version: '0.1.0'
    })

    MnemotekAppFactory.registerCommands(
      app,
      {
        description: 'Find circular import chains within a TypeScript source root.',
        name: 'circular',
        runner: DepsAuditApp.circularRunner,
        schema: {
          additionalProperties: false,
          properties: {
            root: SOURCE_ROOT_OPTION_SCHEMA
          },
          type: 'object'
        }
      },
      {
        description: 'Find source files never imported by any other file in the scanned tree.',
        name: 'orphans',
        runner: DepsAuditApp.orphansRunner,
        schema: {
          additionalProperties: false,
          properties: {
            root: SOURCE_ROOT_OPTION_SCHEMA
          },
          type: 'object'
        }
      },
      {
        description: 'Find package.json dependencies never referenced by a bare-specifier import in the scanned tree.',
        name: 'unused-deps',
        runner: DepsAuditApp.unusedDepsRunner,
        schema: {
          additionalProperties: false,
          properties: {
            root: {description: 'Project root containing package.json and the source tree. Defaults to the current directory.',
              type: 'string'}
          },
          type: 'object'
        }
      }
    )
    return app

  }

  private static readonly circularRunner = (payload: Record<string, unknown>): CircularResultEntity.Type => {

    const {graph, root} = DepsAuditApp.resolveGraph(payload)
    const cycles = FindCircular.findCircularImports(
      root,
      graph
    )

    return {cycleCount: cycles.length,
      cycles,
      ok: cycles.length === 0}

  }

  private static readonly orphansRunner = (payload: Record<string, unknown>): OrphansResultEntity.Type => {

    const {graph, root} = DepsAuditApp.resolveGraph(payload)
    const orphans = FindOrphans.findOrphanModules(
      root,
      graph
    )

    return {ok: orphans.length === 0,
      orphanCount: orphans.length,
      orphans}

  }

  private static resolveGraph (payload: Record<string, unknown>): {graph: ModuleGraphInterface;
    root: string;} {

    const root = PayloadOptions.resolveRoot(payload)
    const graph = ScanImports.buildModuleGraph(root)

    return {graph,
      root}

  }

  private static readonly unusedDepsRunner = (payload: Record<string, unknown>): UnusedDepsResultEntity.Type => {

    const {graph, root} = DepsAuditApp.resolveGraph(payload)
    const unused = FindUnusedDeps.findUnusedDependencies(
      root,
      graph
    )

    return {ok: unused.length === 0,
      unused,
      unusedCount: unused.length}

  }

}
