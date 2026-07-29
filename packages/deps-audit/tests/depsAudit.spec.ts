import assert from 'node:assert/strict'
import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {describe, test} from 'node:test'

import {DepsAuditApp} from '../src/core/depsAuditApp.js'
import {FindCircular} from '../src/core/findCircular.js'
import {FindOrphans} from '../src/core/findOrphans.js'
import {FindUnusedDeps} from '../src/core/findUnusedDeps.js'
import {ScanImports} from '../src/core/scanImports.js'

class TestSupport {

  public static createFixtureRoot (): string {

    const root = mkdtempSync(join(
      tmpdir(),
      'deps-audit-test-'
    ))
    const sourceDirectory = join(
      root,
      'src'
    )

    mkdirSync(
      sourceDirectory,
      {recursive: true}
    )

    writeFileSync(
      join(
        sourceDirectory,
        'a.ts'
      ),
      "import {bValue} from './b.js'\nexport const aValue = bValue\n"
    )
    writeFileSync(
      join(
        sourceDirectory,
        'b.ts'
      ),
      "import {aValue} from './a.js'\nexport const bValue = aValue\n"
    )
    writeFileSync(
      join(
        sourceDirectory,
        'index.ts'
      ),
      "import {aValue} from './a.js'\nconsole.log(aValue)\n"
    )
    writeFileSync(
      join(
        sourceDirectory,
        'orphan.ts'
      ),
      'export const orphanValue = 1\n'
    )
    writeFileSync(
      join(
        root,
        'package.json'
      ),
      JSON.stringify({dependencies: {lodash: '1.0.0'}})
    )

    return root

  }

}

void describe(
  'deps-audit suite',
  () => {

    void test(
      'findCircularImports: detects an a<->b cycle',
      () => {

        const root = TestSupport.createFixtureRoot()

        try {

          const graph = ScanImports.buildModuleGraph(join(
            root,
            'src'
          ))
          const cycles = FindCircular.findCircularImports(
            join(
              root,
              'src'
            ),
            graph
          )

          assert.ok(cycles.length > 0)

        } finally {

          rmSync(
            root,
            {force: true,
              recursive: true}
          )

        }

      }
    )

    void test(
      'findOrphanModules: flags orphan.ts, not index.ts',
      () => {

        const root = TestSupport.createFixtureRoot()

        try {

          const graph = ScanImports.buildModuleGraph(join(
            root,
            'src'
          ))
          const orphans = FindOrphans.findOrphanModules(
            join(
              root,
              'src'
            ),
            graph
          )

          assert.deepEqual(
            orphans,
            ['orphan.ts']
          )

        } finally {

          rmSync(
            root,
            {force: true,
              recursive: true}
          )

        }

      }
    )

    void test(
      'findUnusedDependencies: flags a declared dep never imported',
      () => {

        const root = TestSupport.createFixtureRoot()

        try {

          const graph = ScanImports.buildModuleGraph(root)
          const unused = FindUnusedDeps.findUnusedDependencies(
            root,
            graph
          )

          assert.deepEqual(
            unused,
            ['lodash']
          )

        } finally {

          rmSync(
            root,
            {force: true,
              recursive: true}
          )

        }

      }
    )

    void test(
      'manifest: exposes all three commands',
      () => {

        const app = DepsAuditApp.createDepsAuditApp()
        const names = app.manifest().commands.map((command) => {

          const commandName = command.name
          return commandName

        }).sort()

        assert.deepEqual(
          names,
          [
            'circular',
            'orphans',
            'unused-deps'
          ]
        )

      }
    )

  }
)
