import assert from 'node:assert/strict'
import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {describe, test} from 'node:test'

import {createDepsAuditApp} from '../src/core/depsAuditApp.js'
import {findCircularImports} from '../src/core/findCircular.js'
import {findOrphanModules} from '../src/core/findOrphans.js'
import {findUnusedDependencies} from '../src/core/findUnusedDeps.js'
import {buildModuleGraph} from '../src/core/scanImports.js'

function makeFixture (): string {

  const root = mkdtempSync(join(tmpdir(), 'deps-audit-test-'))
  const srcDir = join(root, 'src')
  mkdirSync(srcDir, {recursive: true})

  writeFileSync(join(srcDir, 'a.ts'), "import {bValue} from './b.js'\nexport const aValue = bValue\n")
  writeFileSync(join(srcDir, 'b.ts'), "import {aValue} from './a.js'\nexport const bValue = aValue\n")
  writeFileSync(join(srcDir, 'index.ts'), "import {aValue} from './a.js'\nconsole.log(aValue)\n")
  writeFileSync(join(srcDir, 'orphan.ts'), 'export const orphanValue = 1\n')
  writeFileSync(join(root, 'package.json'), JSON.stringify({dependencies: {lodash: '1.0.0'}}))

  return root

}

describe('deps-audit suite', () => {

  test('findCircularImports: detects an a<->b cycle', () => {

    const root = makeFixture()

    try {

      const graph = buildModuleGraph(join(root, 'src'))
      const cycles = findCircularImports(join(root, 'src'), graph)
      assert.ok(cycles.length > 0)

    } finally {

      rmSync(root, {force: true, recursive: true})

    }

  })

  test('findOrphanModules: flags orphan.ts, not index.ts', () => {

    const root = makeFixture()

    try {

      const graph = buildModuleGraph(join(root, 'src'))
      const orphans = findOrphanModules(join(root, 'src'), graph)
      assert.deepEqual(orphans, ['orphan.ts'])

    } finally {

      rmSync(root, {force: true, recursive: true})

    }

  })

  test('findUnusedDependencies: flags a declared dep never imported', () => {

    const root = makeFixture()

    try {

      const graph = buildModuleGraph(root)
      const unused = findUnusedDependencies(root, graph)
      assert.deepEqual(unused, ['lodash'])

    } finally {

      rmSync(root, {force: true, recursive: true})

    }

  })

  test('manifest: exposes all three commands', () => {

    const app = createDepsAuditApp()
    const names = app.manifest().commands.map((command) => command.name).sort()
    assert.deepEqual(names, ['circular', 'orphans', 'unused-deps'])

  })

})
