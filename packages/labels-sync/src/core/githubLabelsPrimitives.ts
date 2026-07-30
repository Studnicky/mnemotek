import type {LabelEntity} from '../entities/index.js'

import {ExecCliTool} from './execCliTool.js'

export class GithubLabelsPrimitives {

  public static createLabel = (repository: string, label: LabelEntity.Type): void => {

    const argumentList = GithubLabelsPrimitives.toArgumentList(
      'label',
      'create',
      label.name,
      '--color',
      label.color,
      '--repo',
      repository
    )

    if (label.description !== undefined) {

      argumentList.push(
        '--description',
        label.description
      )

    }

    ExecCliTool.run(
      'gh',
      argumentList
    )

  }

  public static fetchLabels = (repository: string): LabelEntity.Type[] => {

    const rawResponse = ExecCliTool.run(
      'gh',
      GithubLabelsPrimitives.toArgumentList(
        'api',
        `repos/${repository}/labels`,
        '--paginate'
      )
    )
    const parsedLabels = GithubLabelsPrimitives.parseLabelsResponse(rawResponse)
    return parsedLabels.map((label) => {

      const result = GithubLabelsPrimitives.toLabel(label); return result

    })

  }

  public static resolveRepository = (repository?: string): string => {

    if (repository !== undefined) {

      return repository

    }

    const result = ExecCliTool.run(
      'gh',
      GithubLabelsPrimitives.toArgumentList(
        'repo',
        'view',
        '--json',
        'nameWithOwner',
        '-q',
        '.nameWithOwner'
      )
    )
    return result.trim()

  }

  private static parseLabelsResponse (raw: string): unknown[] {

    const trimmed = raw.trim()

    if (trimmed.length === 0) {

      return []

    }

    try {

      return JSON.parse(trimmed) as unknown[]

    } catch {

      const pages: unknown[] = []

      for (const line of trimmed.split('\n')) {

        const trimmedLine = line.trim()

        if (trimmedLine.length === 0) {

          continue

        }

        pages.push(...JSON.parse(trimmedLine) as unknown[])

      }

      return pages

    }

  }

  private static toArgumentList (...parts: string[]): string[] {

    const result = parts
    return result

  }

  private static toLabel (raw: unknown): LabelEntity.Type {

    if (typeof raw !== 'object' || raw === null) {

      throw new Error('Unexpected GitHub label payload shape.')

    }

    const candidate = raw as Record<string, unknown>
    const name = typeof candidate.name === 'string'
      ? candidate.name
      : ''
    const color = typeof candidate.color === 'string'
      ? candidate.color
      : ''
    const result: LabelEntity.Type = {color,
      name}

    if (typeof candidate.description === 'string' && candidate.description.length > 0) {

      result.description = candidate.description

    }

    return result

  }

}
