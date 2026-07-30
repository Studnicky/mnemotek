import {Mnemotek, MnemotekAppFactory} from '@studnicky/mnemotek'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import process from 'node:process'

import type {LabelEntity, LabelPullResultEntity, LabelPushResultEntity} from '../entities/index.js'

import {LabelsActionEntity} from '../entities/index.js'
import {AtomicWrite} from './atomicWrite.js'
import {GithubLabelsPrimitives} from './githubLabelsPrimitives.js'
import {LabelsDiff} from './labelsDiff.js'

const DEFAULT_LABELS_FILE = '.github/labels.json'

export class LabelsSyncApp {

  public static createLabelsSyncApp (): Mnemotek {

    const app = new Mnemotek({
      description: 'GitHub-only labels sync: pull repository labels into a JSON file, and push new labels from that file back to GitHub (add-only, dry-run by default). No Jira integration.',
      name: 'labels-sync-tool',
      version: '0.1.0'
    })

    MnemotekAppFactory.registerCommands(
      app,
      {
        description: 'Pull GitHub repository labels into a JSON file, or push new labels from that file back to GitHub (add-only, dry-run by default).',
        name: 'labels',
        runner: LabelsSyncApp.labelsRunner,
        schema: {
          additionalProperties: false,
          properties: {
            action: {description: 'pull reads GitHub labels into the file. push creates labels from the file that are missing on GitHub.',
              enum: LabelsActionEntity.Schema.enum,
              type: 'string'},
            apply: {description: 'For push: actually create the planned labels on GitHub. Defaults to false (dry-run, plan only).',
              type: 'boolean'},
            file: {description: 'Path to the labels JSON file, resolved relative to the current directory. Defaults to \'.github/labels.json\'.',
              type: 'string'},
            repository: {description: 'owner/repository. Defaults to the current repository.',
              type: 'string'}
          },
          required: ['action'],
          type: 'object'
        }
      }
    )
    return app

  }

  private static readonly labelsRunner = (payload: Record<string, unknown>): LabelPullResultEntity.Type | LabelPushResultEntity.Type => {

    const action = LabelsSyncApp.resolveAction(payload)
    const filePath = LabelsSyncApp.resolveFilePath(payload)
    const repositoryOption = typeof payload.repository === 'string'
      ? payload.repository
      : undefined

    if (action === 'pull') {

      return LabelsSyncApp.pull(
        repositoryOption,
        filePath
      )

    }

    return LabelsSyncApp.push(
      repositoryOption,
      filePath,
      payload.apply === true
    )

  }

  private static pull (repositoryOption: string | undefined, filePath: string): LabelPullResultEntity.Type {

    const repository = GithubLabelsPrimitives.resolveRepository(repositoryOption)
    const labels = GithubLabelsPrimitives.fetchLabels(repository)

    AtomicWrite.write(
      filePath,
      `${JSON.stringify(
        {labels},
        null,
        2
      )}\n`
    )

    return {labels}

  }

  private static push (repositoryOption: string | undefined, filePath: string, apply: boolean): LabelPushResultEntity.Type {

    const repository = GithubLabelsPrimitives.resolveRepository(repositoryOption)
    const fileLabels = LabelsSyncApp.readLabelsFile(filePath)
    const currentLabels = GithubLabelsPrimitives.fetchLabels(repository)
    const planned = LabelsDiff.computePlanned(
      fileLabels,
      currentLabels
    )

    if (!apply) {

      return {created: [],
        planned: planned.map((label) => {

          const result = label.name; return result

        }),
        repository}

    }

    const created: string[] = []

    for (const label of planned) {

      GithubLabelsPrimitives.createLabel(
        repository,
        label
      )
      created.push(label.name)

    }

    return {created,
      planned: planned.map((label) => {

        const result = label.name; return result

      }),
      repository}

  }

  private static readLabelsFile (filePath: string): LabelEntity.Type[] {

    let raw: string

    try {

      raw = readFileSync(
        filePath,
        'utf8'
      )

    } catch {

      throw new Error(`Labels file not found at ${filePath}. Run the "pull" action first, or create it with a {"labels": [...]} shape.`)

    }

    let parsed: unknown

    try {

      parsed = JSON.parse(raw)

    } catch {

      throw new Error(`Labels file at ${filePath} is not valid JSON.`)

    }

    if (typeof parsed !== 'object' || parsed === null || !Array.isArray((parsed as Record<string, unknown>).labels)) {

      throw new Error(`Labels file at ${filePath} must have the shape {"labels": [...]}.`)

    }

    return (parsed as Record<string, unknown>).labels as LabelEntity.Type[]

  }

  private static resolveAction (payload: Record<string, unknown>): LabelsActionEntity.Type {

    if (typeof payload.action !== 'string' || !LabelsActionEntity.validate(payload.action)) {

      throw new TypeError(`labels requires "action" to be one of ${LabelsActionEntity.Schema.enum.join(', ')}.`)

    }

    return payload.action

  }

  private static resolveFilePath (payload: Record<string, unknown>): string {

    const file = typeof payload.file === 'string'
      ? payload.file
      : DEFAULT_LABELS_FILE
    return resolve(
      process.cwd(),
      file
    )

  }

}
