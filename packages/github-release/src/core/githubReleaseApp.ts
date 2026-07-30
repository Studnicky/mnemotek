import {Mnemotek, MnemotekAppFactory} from '@studnicky/mnemotek'

import type {GithubReleaseResultEntity} from '../entities/index.js'

import {ExecCliTool} from './execCliTool.js'
import {GithubReleaseArgumentList} from './githubReleaseArgumentList.js'

export class GithubReleaseApp {

  public static createGithubReleaseApp (): Mnemotek {

    const app = new Mnemotek({
      description: 'GitHub Release driver: creates a release via `gh release create`, with auto-generated or explicit notes. Local-only, shells to gh directly — no server, no proxy.',
      name: 'github-release-tool',
      version: '0.1.0'
    })

    MnemotekAppFactory.registerCommands(
      app,
      {
        description: 'Create a GitHub release via `gh release create`. Always pass "tag" for non-interactive/agent use: omitting it leaves gh to prompt for a tag interactively, which hangs a caller with no terminal attached. When "notes" is omitted, gh\'s own auto-generated release notes (--generate-notes) are used instead of an explicit body.',
        name: 'release',
        runner: GithubReleaseApp.releaseRunner,
        schema: {
          additionalProperties: false,
          properties: {
            notes: {description: 'Release notes body. Omit to use gh\'s auto-generated notes (--generate-notes).',
              type: 'string'},
            tag: {description: 'Git tag for the release (e.g. v1.2.3). Always pass this for non-interactive/agent use — gh prompts interactively when omitted.',
              type: 'string'}
          },
          type: 'object'
        }
      }
    )
    return app

  }

  private static readonly releaseRunner = (payload: Record<string, unknown>): GithubReleaseResultEntity.Type => {

    const tag = typeof payload.tag === 'string'
      ? payload.tag
      : undefined
    const notes = typeof payload.notes === 'string'
      ? payload.notes
      : undefined

    const url = ExecCliTool.run(
      'gh',
      GithubReleaseArgumentList.build({notes,
        tag})
    )

    return {url}

  }

}
