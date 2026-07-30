import assert from 'node:assert/strict'
import {describe, test} from 'node:test'

import {ExecCliTool} from '../src/core/execCliTool.js'
import {GitStackApp} from '../src/core/gitStackApp.js'
import {StackArgvBuilder} from '../src/core/stackArgvBuilder.js'

void describe(
  'git-stack suite',
  () => {

    void test(
      'StackArgvBuilder.buildArgv: builds argv as [stack, action, ...passthrough] in order',
      () => {

        const argumentList = StackArgvBuilder.buildArgv({action: 'create',
          argumentList: [
            '--branch',
            'foo'
          ]})
        assert.equal(
          argumentList.join(' '),
          'stack create --branch foo'
        )

      }
    )

    void test(
      'StackArgvBuilder.buildArgv: defaults to no passthrough arguments',
      () => {

        const argumentList = StackArgvBuilder.buildArgv({action: 'sync'})
        assert.equal(
          argumentList.join(' '),
          'stack sync'
        )

      }
    )

    void test(
      'ExecCliTool.run: throws the underlying error when the binary is missing',
      () => {

        assert.throws(() => {

          ExecCliTool.run(
            'git-stack-tool-definitely-does-not-exist',
            [
              'create',
              'stack'
            ]
          )

        })

      }
    )

    void test(
      'ExecCliTool.run: allowFail returns empty string instead of throwing',
      () => {

        const result = ExecCliTool.run(
          'git-stack-tool-definitely-does-not-exist',
          [
            'create',
            'stack'
          ],
          {allowFail: true}
        )
        assert.equal(
          result,
          ''
        )

      }
    )

    void test(
      'manifest: exposes the stack command',
      () => {

        const app = GitStackApp.createGitStackApp()
        const names = app.manifest().commands.map((command) => {

          const result = command.name; return result

        })
        assert.deepEqual(
          names,
          ['stack']
        )

      }
    )

  }
)
