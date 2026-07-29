import assert from 'node:assert/strict'
import {mkdtempSync, rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {describe, test} from 'node:test'

import {GAIN_TRACKER_LIMITS} from '../src/core/constants/GainTrackerConstants.js'
import {GainTracker} from '../src/core/gainTracker.js'
import {RedactorApp} from '../src/core/redactorApp.js'
import {RunRedacted} from '../src/core/runRedacted.js'
import {StripAnsi} from '../src/core/stripAnsi.js'
import {REDACTOR_EXPECTED_PATTERNS} from './fixtures/RedactorExpectedPatterns.js'

void describe(
  'redactor suite',
  () => {

    void test(
      'stripAnsi: removes SGR escape sequences',
      () => {

        const escapeCharacter = String.fromCharCode(27)
        const input = `${escapeCharacter}[31mred${escapeCharacter}[0m plain`
        assert.equal(
          StripAnsi.stripAnsi(input),
          'red plain'
        )

      }
    )

    void test(
      'redactText: collapses runs of blank lines',
      () => {

        const result = StripAnsi.redactText('a\n\n\n\n\nb')
        assert.equal(
          result,
          'a\n\nb'
        )

      }
    )

    void test(
      'gainTracker: records and summarizes savings',
      () => {

        const dir = mkdtempSync(join(
          tmpdir(),
          'redactor-test-'
        ))

        try {

          GainTracker.recordGain({bytesAfter: 40,
            bytesBefore: 100,
            command: 'git status',
            root: dir,
            timestamp: new Date().toISOString()})
          GainTracker.recordGain({bytesAfter: 10,
            bytesBefore: 50,
            command: 'git status',
            root: dir,
            timestamp: new Date().toISOString()})

          const summary = GainTracker.readGain({root: dir})
          assert.equal(
            summary.entryCount,
            2
          )
          assert.equal(
            summary.totalBytesSaved,
            100
          )
          assert.equal(
            summary.topCommands[0]?.command,
            'git status'
          )

        } finally {

          rmSync(
            dir,
            {force: true,
              recursive: true}
          )

        }

      }
    )

    void test(
      'gainTracker: caps the log at GAIN_TRACKER_LIMITS.MAXIMUM_ENTRIES, dropping the oldest entries',
      () => {

        const dir = mkdtempSync(join(
          tmpdir(),
          'redactor-test-'
        ))

        try {

          const totalRecorded = GAIN_TRACKER_LIMITS.MAXIMUM_ENTRIES + 5

          for (let index = 0; index < totalRecorded; index += 1) {

            GainTracker.recordGain({bytesAfter: 0,
              bytesBefore: 1,
              command: `command-${String(index)}`,
              root: dir,
              timestamp: new Date().toISOString()})

          }

          const summary = GainTracker.readGain({root: dir})
          assert.equal(
            summary.entryCount,
            GAIN_TRACKER_LIMITS.MAXIMUM_ENTRIES
          )

        } finally {

          rmSync(
            dir,
            {force: true,
              recursive: true}
          )

        }

      }
    )

    void test(
      'runRedacted: runs a real command and redacts its output',
      () => {

        const dir = mkdtempSync(join(
          tmpdir(),
          'redactor-test-'
        ))

        try {

          const result = RunRedacted.runRedacted({argumentList: ['hello'],
            command: 'echo',
            root: dir})
          assert.equal(
            result.exitCode,
            0
          )
          assert.match(
            result.output,
            REDACTOR_EXPECTED_PATTERNS.HELLO_OUTPUT
          )

        } finally {

          rmSync(
            dir,
            {force: true,
              recursive: true}
          )

        }

      }
    )

    void test(
      'manifest: exposes all three commands',
      () => {

        const app = RedactorApp.createRedactorApp()
        const names = app.manifest().commands.map((command) => {

          const result = command.name
          return result

        }).sort()
        assert.deepEqual(
          names,
          [
            'gain',
            'run',
            'text'
          ]
        )

      }
    )

  }
)
