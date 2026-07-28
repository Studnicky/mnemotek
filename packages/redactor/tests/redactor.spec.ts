import assert from 'node:assert/strict'
import {mkdtempSync, rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {describe, test} from 'node:test'

import {createRedactorApp} from '../src/core/redactorApp.js'
import {readGain, recordGain} from '../src/core/gainTracker.js'
import {runRedacted} from '../src/core/runRedacted.js'
import {redactText, stripAnsi} from '../src/core/stripAnsi.js'

describe('redactor suite', () => {

  test('stripAnsi: removes SGR escape sequences', () => {

    const esc = String.fromCharCode(27)
    const input = `${esc}[31mred${esc}[0m plain`
    assert.equal(stripAnsi(input), 'red plain')

  })

  test('redactText: collapses runs of blank lines', () => {

    const result = redactText('a\n\n\n\n\nb')
    assert.equal(result, 'a\n\nb')

  })

  test('gainTracker: records and summarizes savings', () => {

    const dir = mkdtempSync(join(tmpdir(), 'redactor-test-'))

    try {

      recordGain({bytesAfter: 40, bytesBefore: 100, command: 'git status', root: dir, timestamp: new Date().toISOString()})
      recordGain({bytesAfter: 10, bytesBefore: 50, command: 'git status', root: dir, timestamp: new Date().toISOString()})

      const summary = readGain({root: dir})
      assert.equal(summary.entryCount, 2)
      assert.equal(summary.totalBytesSaved, 100)
      assert.equal(summary.topCommands[0]?.command, 'git status')

    } finally {

      rmSync(dir, {force: true, recursive: true})

    }

  })

  test('runRedacted: runs a real command and redacts its output', () => {

    const dir = mkdtempSync(join(tmpdir(), 'redactor-test-'))

    try {

      const result = runRedacted({args: ['hello'], command: 'echo', root: dir})
      assert.equal(result.exitCode, 0)
      assert.match(result.output, /hello/u)

    } finally {

      rmSync(dir, {force: true, recursive: true})

    }

  })

  test('manifest: exposes all three commands', () => {

    const app = createRedactorApp()
    const names = app.manifest().commands.map((command) => command.name).sort()
    assert.deepEqual(names, ['gain', 'run', 'text'])

  })

})
