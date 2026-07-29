import assert from 'node:assert/strict'
import {describe, test} from 'node:test'

import {InspectApp} from '../src/core/inspectApp.js'
import {RunLocalTool} from '../src/core/runLocalTool.js'
import {INSPECT_EXPECTED_PATTERNS} from './fixtures/InspectExpectedPatterns.js'

void describe(
  'inspect suite',
  () => {

    void test(
      'runLocalTool: resolves a walked-up node_modules/.bin binary and runs it',
      () => {

        const result = RunLocalTool.run({argumentList: RunLocalTool.toArgumentList('--version'),
          binaryName: 'tsc',
          root: process.cwd()})
        assert.equal(
          result.exitCode,
          0
        )
        assert.match(
          result.output,
          INSPECT_EXPECTED_PATTERNS.VERSION_OUTPUT
        )

      }
    )

    void test(
      'runLocalTool: falls back to a bare PATH lookup for an unknown local binary',
      () => {

        const result = RunLocalTool.run({argumentList: RunLocalTool.toArgumentList('--version'),
          binaryName: 'node',
          root: process.cwd()})
        assert.equal(
          result.exitCode,
          0
        )

      }
    )

    void test(
      'typecheck command: reports ok=true for this package\'s own clean tsc run',
      async () => {

        const app = InspectApp.createInspectApp()
        const result = await app.run(
          'typecheck',
          {root: process.cwd()}
        ) as Record<string, unknown>
        assert.equal(
          result.ok,
          true
        )
        assert.equal(
          result.errorCount,
          0
        )

      }
    )

    void test(
      'manifest: exposes typecheck and lint commands',
      () => {

        const app = InspectApp.createInspectApp()
        const names = app.manifest().commands.map((command) => {

          const result = command.name; return result

        }).sort()
        assert.deepEqual(
          names,
          [
            'lint',
            'typecheck'
          ]
        )

      }
    )

  }
)
