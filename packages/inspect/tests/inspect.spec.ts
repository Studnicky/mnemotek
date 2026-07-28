import assert from 'node:assert/strict'
import {describe, test} from 'node:test'

import {createInspectApp} from '../src/core/inspectApp.js'
import {runLocalTool} from '../src/core/runLocalTool.js'

describe('inspect suite', () => {

  test('runLocalTool: resolves a walked-up node_modules/.bin binary and runs it', () => {

    const result = runLocalTool({args: ['--version'], binaryName: 'tsc', root: process.cwd()})
    assert.equal(result.exitCode, 0)
    assert.match(result.output, /Version/u)

  })

  test('runLocalTool: falls back to a bare PATH lookup for an unknown local binary', () => {

    const result = runLocalTool({args: ['--version'], binaryName: 'node', root: process.cwd()})
    assert.equal(result.exitCode, 0)

  })

  test('typecheck command: reports ok=true for this package\'s own clean tsc run', async () => {

    const app = createInspectApp()
    const result = await app.run('typecheck', {root: process.cwd()}) as Record<string, unknown>
    assert.equal(result.ok, true)
    assert.equal(result.errorCount, 0)

  })

  test('manifest: exposes typecheck and lint commands', () => {

    const app = createInspectApp()
    const names = app.manifest().commands.map((command) => command.name).sort()
    assert.deepEqual(names, ['lint', 'typecheck'])

  })

})
