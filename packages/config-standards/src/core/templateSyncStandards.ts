import {existsSync, readFileSync} from 'node:fs'
import {join} from 'node:path'

import type {TemplateSyncResultEntity} from '../entities/index.js'

import {ExecCliTool} from './execCliTool.js'

const UPSTREAM_GITIGNORE_PATH = 'repos/github/gitignore/contents/Node.gitignore'

export class TemplateSyncStandards {

  public static check (root: string, options: {networked?: boolean} = {}): TemplateSyncResultEntity.Type {

    const networked = options.networked ?? false

    if (!networked) {

      return {networkSkipped: true,
        ok: true,
        staleness: 'unknown'}

    }

    const upstreamContent = TemplateSyncStandards.fetchUpstreamGitignore()

    if (upstreamContent === undefined) {

      return {networkSkipped: true,
        ok: true,
        staleness: 'unknown'}

    }

    const localContent = TemplateSyncStandards.readLocalGitignore(root)
    const staleness = localContent.trim() === upstreamContent.trim()
      ? 'current'
      : 'behind'

    return {networkSkipped: false,
      ok: staleness === 'current',
      staleness}

  }

  private static fetchUpstreamGitignore (): string | undefined {

    const raw = ExecCliTool.run(
      'gh',
      TemplateSyncStandards.toArgumentList(
        'api',
        UPSTREAM_GITIGNORE_PATH
      ),
      {allowFail: true}
    )

    if (raw.length === 0) {

      return undefined

    }

    try {

      const parsed = JSON.parse(raw) as {content?: string}

      return parsed.content === undefined
        ? undefined
        : Buffer.from(
          parsed.content,
          'base64'
        ).toString('utf8')

    } catch {

      return undefined

    }

  }

  private static readLocalGitignore (root: string): string {

    const filePath = join(
      root,
      '.gitignore'
    )

    return existsSync(filePath)
      ? readFileSync(
        filePath,
        'utf8'
      )
      : ''

  }

  /** Variadic wrapper so an order-sensitive CLI argument list isn't a sortable array literal. */
  private static toArgumentList (...parts: string[]): string[] {

    const result = parts
    return result

  }

}
