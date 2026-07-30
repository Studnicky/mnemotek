import assert from 'node:assert/strict'
import {existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {describe, test} from 'node:test'

import type {LabelEntity} from '../src/entities/index.js'

import {AtomicWrite} from '../src/core/atomicWrite.js'
import {GithubLabelsPrimitives} from '../src/core/githubLabelsPrimitives.js'
import {LabelsDiff} from '../src/core/labelsDiff.js'
import {LabelsSyncApp} from '../src/core/labelsSyncApp.js'

void describe(
  'labels-sync suite',
  () => {

    void test(
      'LabelsDiff.computePlanned: returns file labels absent (by name) from current labels',
      () => {

        const fileLabels: LabelEntity.Type[] = [
          {color: '00ff00',
            name: 'enhancement'},
          {color: '0000ff',
            name: 'question'},
          {color: 'ff0000',
            name: 'bug'}
        ]
        const currentLabels: LabelEntity.Type[] = [
          {color: 'ff0000',
            name: 'bug'}
        ]

        const planned = LabelsDiff.computePlanned(
          fileLabels,
          currentLabels
        )
        assert.deepEqual(
          planned.map((label) => {

            const result = label.name; return result

          }),
          [
            'enhancement',
            'question'
          ]
        )

      }
    )

    void test(
      'LabelsDiff.computePlanned: returns empty when every file label already exists on GitHub',
      () => {

        const fileLabels: LabelEntity.Type[] = [
          {color: '00ff00',
            name: 'enhancement'},
          {color: 'ff0000',
            name: 'bug'}
        ]
        const currentLabels: LabelEntity.Type[] = [
          {color: '00ff00',
            name: 'enhancement'},
          {color: 'ff0000',
            name: 'bug'}
        ]

        const planned = LabelsDiff.computePlanned(
          fileLabels,
          currentLabels
        )
        assert.deepEqual(
          planned,
          []
        )

      }
    )

    void test(
      'LabelsDiff.computePlanned: returns every file label when none exist on GitHub',
      () => {

        const fileLabels: LabelEntity.Type[] = [
          {color: '00ff00',
            name: 'enhancement'},
          {color: 'ff0000',
            name: 'bug'}
        ]
        const currentLabels: LabelEntity.Type[] = []

        const planned = LabelsDiff.computePlanned(
          fileLabels,
          currentLabels
        )
        assert.deepEqual(
          planned.map((label) => {

            const result = label.name; return result

          }).sort(),
          [
            'bug',
            'enhancement'
          ]
        )

      }
    )

    void test(
      'labels push with apply omitted never invokes GithubLabelsPrimitives.createLabel',
      async () => {

        const dir = mkdtempSync(join(
          tmpdir(),
          'labels-sync-test-'
        ))
        const filePath = join(
          dir,
          'labels.json'
        )

        writeFileSync(
          filePath,
          JSON.stringify({labels: [
            {color: '00ff00',
              name: 'enhancement'},
            {color: 'ff0000',
              name: 'bug'}
          ]})
        )

        const originalFetchLabels = GithubLabelsPrimitives.fetchLabels
        const originalCreateLabel = GithubLabelsPrimitives.createLabel
        let createLabelCallCount = 0

        GithubLabelsPrimitives.fetchLabels = (): LabelEntity.Type[] => {

          return [
            {color: 'ff0000',
              name: 'bug'}
          ]

        }
        GithubLabelsPrimitives.createLabel = (): void => {

          createLabelCallCount += 1

        }

        try {

          const app = LabelsSyncApp.createLabelsSyncApp()
          const result = await app.run(
            'labels',
            {action: 'push',
              apply: false,
              file: filePath,
              repository: 'studnicky/mnemotek'}
          )

          assert.deepEqual(
            result,
            {created: [],
              planned: ['enhancement'],
              repository: 'studnicky/mnemotek'}
          )
          assert.equal(
            createLabelCallCount,
            0
          )

        } finally {

          GithubLabelsPrimitives.fetchLabels = originalFetchLabels
          GithubLabelsPrimitives.createLabel = originalCreateLabel
          rmSync(
            dir,
            {force: true,
              recursive: true}
          )

        }

      }
    )

    void test(
      'labels push with apply true invokes GithubLabelsPrimitives.createLabel for each planned label',
      async () => {

        const dir = mkdtempSync(join(
          tmpdir(),
          'labels-sync-test-'
        ))
        const filePath = join(
          dir,
          'labels.json'
        )

        writeFileSync(
          filePath,
          JSON.stringify({labels: [
            {color: '00ff00',
              name: 'enhancement'},
            {color: 'ff0000',
              name: 'bug'}
          ]})
        )

        const originalFetchLabels = GithubLabelsPrimitives.fetchLabels
        const originalCreateLabel = GithubLabelsPrimitives.createLabel
        const createdNames: string[] = []

        GithubLabelsPrimitives.fetchLabels = (): LabelEntity.Type[] => {

          return [
            {color: 'ff0000',
              name: 'bug'}
          ]

        }
        GithubLabelsPrimitives.createLabel = (_repository: string, label: LabelEntity.Type): void => {

          createdNames.push(label.name)

        }

        try {

          const app = LabelsSyncApp.createLabelsSyncApp()
          const result = await app.run(
            'labels',
            {action: 'push',
              apply: true,
              file: filePath,
              repository: 'studnicky/mnemotek'}
          )

          assert.deepEqual(
            result,
            {created: ['enhancement'],
              planned: ['enhancement'],
              repository: 'studnicky/mnemotek'}
          )
          assert.deepEqual(
            createdNames,
            ['enhancement']
          )

        } finally {

          GithubLabelsPrimitives.fetchLabels = originalFetchLabels
          GithubLabelsPrimitives.createLabel = originalCreateLabel
          rmSync(
            dir,
            {force: true,
              recursive: true}
          )

        }

      }
    )

    void test(
      'AtomicWrite.write: content lands at target path and no .tmp-* file remains',
      () => {

        const dir = mkdtempSync(join(
          tmpdir(),
          'labels-sync-test-'
        ))
        const targetPath = join(
          dir,
          'labels.json'
        )

        try {

          AtomicWrite.write(
            targetPath,
            '{"labels":[]}\n'
          )

          assert.equal(
            existsSync(targetPath),
            true
          )
          assert.equal(
            readFileSync(
              targetPath,
              'utf8'
            ),
            '{"labels":[]}\n'
          )

          const leftoverTempFiles = readdirSync(dir).filter((entry) => {

            const result = entry.includes('.tmp-'); return result

          })
          assert.deepEqual(
            leftoverTempFiles,
            []
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
      'manifest: exposes exactly the labels command',
      () => {

        const app = LabelsSyncApp.createLabelsSyncApp()
        const names = app.manifest().commands.map((command) => {

          const result = command.name; return result

        }).sort()
        assert.deepEqual(
          names,
          ['labels']
        )

      }
    )

  }
)
