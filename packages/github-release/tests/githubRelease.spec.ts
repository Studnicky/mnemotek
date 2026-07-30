import assert from 'node:assert/strict'
import {describe, test} from 'node:test'

import {ExecCliTool} from '../src/core/execCliTool.js'
import {GithubReleaseApp} from '../src/core/githubReleaseApp.js'
import {GithubReleaseArgumentList} from '../src/core/githubReleaseArgumentList.js'

class TestSupport {

  public static toArgumentList (...parts: string[]): string[] {

    const result = parts
    return result

  }

}

void describe(
  'github-release suite',
  () => {

    void test(
      'GithubReleaseArgumentList.build: includes the tag and uses --generate-notes when notes is omitted',
      () => {

        const argumentList = GithubReleaseArgumentList.build({tag: 'v1.2.3'})
        assert.deepEqual(
          argumentList,
          TestSupport.toArgumentList(
            'release',
            'create',
            'v1.2.3',
            '--generate-notes'
          )
        )

      }
    )

    void test(
      'GithubReleaseArgumentList.build: uses --notes <value> when notes is given',
      () => {

        const argumentList = GithubReleaseArgumentList.build({notes: 'Fixes a bug',
          tag: 'v1.2.3'})
        assert.deepEqual(
          argumentList,
          TestSupport.toArgumentList(
            'release',
            'create',
            'v1.2.3',
            '--notes',
            'Fixes a bug'
          )
        )

      }
    )

    void test(
      'GithubReleaseArgumentList.build: omits the tag argument when tag is not given',
      () => {

        const argumentList = GithubReleaseArgumentList.build({notes: 'Fixes a bug'})
        assert.deepEqual(
          argumentList,
          TestSupport.toArgumentList(
            'release',
            'create',
            '--notes',
            'Fixes a bug'
          )
        )

      }
    )

    void test(
      'ExecCliTool.run: throws a clear error when the binary does not exist',
      () => {

        assert.throws(() => {

          ExecCliTool.run(
            'github-release-tool-definitely-missing-binary',
            TestSupport.toArgumentList(
              'release',
              'create'
            )
          )

        })

      }
    )

    void test(
      'manifest: exposes the release command',
      () => {

        const app = GithubReleaseApp.createGithubReleaseApp()
        const names = app.manifest().commands.map((command) => {

          const result = command.name; return result

        })
        assert.deepEqual(
          names,
          TestSupport.toArgumentList('release')
        )

      }
    )

  }
)
