import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, readlinkSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import process from 'node:process'
import {describe, test} from 'node:test'

/** Variadic wrapper so ordered git CLI argument lists used by fixtures aren't subject to array-literal sort ordering. */
class GitFixture {

  public static run (...argumentList: string[]): void {

    execFileSync(
      'git',
      argumentList
    )

  }

}

import type {MemoriaManifestInterface} from '../src/interfaces/MemoriaManifestInterface.js'

import {AtomicWrite} from '../src/core/atomicWrite.js'
import {DriftEngine} from '../src/core/driftEngine.js'
import {HostFacts} from '../src/core/hostFacts.js'
import {LockFile} from '../src/core/lockFile.js'
import {MemoriaApp} from '../src/core/memoriaApp.js'

void describe(
  'memoria suite',
  () => {

    void test(
      'LockFile.acquire: a second acquire on an already-held lock throws',
      () => {

        const dir = mkdtempSync(join(
          tmpdir(),
          'memoria-test-'
        ))

        try {

          const lockPath = join(
            dir,
            'held.lock'
          )
          LockFile.acquire(lockPath)

          try {

            assert.throws(() => {

              LockFile.acquire(lockPath)

            })

          } finally {

            LockFile.release(lockPath)

          }

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
      'LockFile.acquire: reclaims a stale lock left by a dead pid',
      () => {

        const dir = mkdtempSync(join(
          tmpdir(),
          'memoria-test-'
        ))

        try {

          const lockPath = join(
            dir,
            'stale.lock'
          )
          writeFileSync(
            lockPath,
            '999999'
          )

          LockFile.acquire(lockPath)
          assert.equal(
            readFileSync(
              lockPath,
              'utf8'
            ),
            String(process.pid)
          )
          LockFile.release(lockPath)

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
      'AtomicWrite.write: full content lands byte-for-byte and no tmp file is left behind',
      () => {

        const dir = mkdtempSync(join(
          tmpdir(),
          'memoria-test-'
        ))

        try {

          const target = join(
            dir,
            'out.txt'
          )
          const content = 'x'.repeat(200_000)
          AtomicWrite.write(
            target,
            content
          )

          assert.equal(
            readFileSync(
              target,
              'utf8'
            ),
            content
          )

          const leftoverTemps = readdirSync(dir).filter((name): boolean => {

            const result = name.startsWith('out.txt.tmp-')
            return result

          })
          assert.deepEqual(
            leftoverTemps,
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
      'DriftEngine.compare: classifies missing, modified, and managed entries',
      () => {

        const dir = mkdtempSync(join(
          tmpdir(),
          'memoria-test-'
        ))

        try {

          writeFileSync(
            join(
              dir,
              'missing.tmpl'
            ),
            'missing content'
          )
          writeFileSync(
            join(
              dir,
              'modified.tmpl'
            ),
            'expected content'
          )
          writeFileSync(
            join(
              dir,
              'modified-target'
            ),
            'different content'
          )
          writeFileSync(
            join(
              dir,
              'managed.tmpl'
            ),
            'same content'
          )
          writeFileSync(
            join(
              dir,
              'managed-target'
            ),
            'same content'
          )

          const host = HostFacts.collect()
          const manifest: MemoriaManifestInterface = {
            consumed: new Set(),
            data: {},
            entries: [
              {entry: {mode: 'copy',
                source: 'managed.tmpl',
                target: join(
                  dir,
                  'managed-target'
                )},
              resolvedTarget: join(
                dir,
                'managed-target'
              )},
              {entry: {mode: 'copy',
                source: 'missing.tmpl',
                target: join(
                  dir,
                  'missing-target'
                )},
              resolvedTarget: join(
                dir,
                'missing-target'
              )},
              {entry: {mode: 'copy',
                source: 'modified.tmpl',
                target: join(
                  dir,
                  'modified-target'
                )},
              resolvedTarget: join(
                dir,
                'modified-target'
              )}
            ],
            homeRoot: dir,
            manifestDir: dir,
            manifestPath: join(
              dir,
              'memoria.manifest.json'
            ),
            watchGlobs: []
          }

          const result = DriftEngine.compare(
            manifest,
            host
          )

          assert.deepEqual(
            result.missing,
            [
              join(
                dir,
                'missing-target'
              )
            ]
          )
          assert.deepEqual(
            result.modified,
            [
              join(
                dir,
                'modified-target'
              )
            ]
          )
          assert.deepEqual(
            result.managed,
            [
              join(
                dir,
                'managed-target'
              )
            ]
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
      'apply: repeated runs against unchanged content report the entry in skipped, not written',
      async () => {

        const dir = mkdtempSync(join(
          tmpdir(),
          'memoria-test-'
        ))
        const previousMemoriaHome = process.env.MEMORIA_HOME

        try {

          const homeRoot = join(
            dir,
            'home'
          )
          const manifestDir = join(
            dir,
            'manifest'
          )
          mkdirSync(
            homeRoot,
            {recursive: true}
          )
          mkdirSync(
            join(
              manifestDir,
              'sources'
            ),
            {recursive: true}
          )
          writeFileSync(
            join(
              manifestDir,
              'sources',
              'test.txt'
            ),
            'hello world\n'
          )

          const manifestPath = join(
            manifestDir,
            'memoria.manifest.json'
          )
          writeFileSync(
            manifestPath,
            JSON.stringify({
              entries: [
                {mode: 'copy',
                  source: 'sources/test.txt',
                  target: '~/test-target.txt'}
              ]
            })
          )

          process.env.MEMORIA_HOME = homeRoot

          const app = MemoriaApp.createMemoriaApp()
          const targetPath = join(
            homeRoot,
            'test-target.txt'
          )

          const firstRun = await app.run(
            'apply',
            {manifest: manifestPath}
          ) as Record<string, unknown> | undefined
          assert.deepEqual(
            firstRun?.written,
            [targetPath]
          )
          assert.deepEqual(
            firstRun?.skipped,
            []
          )

          const secondRun = await app.run(
            'apply',
            {manifest: manifestPath}
          ) as Record<string, unknown> | undefined
          assert.deepEqual(
            secondRun?.written,
            []
          )
          assert.deepEqual(
            secondRun?.skipped,
            [targetPath]
          )

        } finally {

          if (previousMemoriaHome === undefined) {

            Reflect.deleteProperty(
              process.env,
              'MEMORIA_HOME'
            )

          } else {

            process.env.MEMORIA_HOME = previousMemoriaHome

          }

          rmSync(
            dir,
            {force: true,
              recursive: true}
          )

        }

      }
    )

    void test(
      'adopt: replaces the original with a symlink into managed storage only after a verified copy and a durable manifest write',
      async () => {

        const dir = mkdtempSync(join(
          tmpdir(),
          'memoria-test-'
        ))
        const previousMemoriaHome = process.env.MEMORIA_HOME

        try {

          const homeRoot = join(
            dir,
            'home'
          )
          const manifestDir = join(
            dir,
            'manifest'
          )
          mkdirSync(
            homeRoot,
            {recursive: true}
          )
          mkdirSync(
            manifestDir,
            {recursive: true}
          )

          const originalPath = join(
            homeRoot,
            '.testrc'
          )
          const originalContent = 'original content\n'
          writeFileSync(
            originalPath,
            originalContent
          )

          process.env.MEMORIA_HOME = homeRoot

          const manifestPath = join(
            manifestDir,
            'memoria.manifest.json'
          )
          const app = MemoriaApp.createMemoriaApp()

          const result = await app.run(
            'adopt',
            {manifest: manifestPath,
              path: originalPath}
          ) as Record<string, unknown> | undefined
          assert.deepEqual(
            result?.adopted,
            [originalPath]
          )

          const stats = lstatSync(originalPath)
          assert.equal(
            stats.isSymbolicLink(),
            true
          )

          const managedPath = join(
            manifestDir,
            'sources',
            '.testrc'
          )
          assert.equal(
            readlinkSync(originalPath),
            managedPath
          )
          assert.equal(
            readFileSync(
              managedPath,
              'utf8'
            ),
            originalContent
          )
          assert.equal(
            readFileSync(
              originalPath,
              'utf8'
            ),
            originalContent
          )

          const manifestContent = JSON.parse(readFileSync(
            manifestPath,
            'utf8'
          )) as {entries: Array<{source: string;
            target: string;}>;}
          assert.equal(
            manifestContent.entries.length,
            1
          )
          assert.equal(
            manifestContent.entries[0]?.target,
            '~/.testrc'
          )

        } finally {

          if (previousMemoriaHome === undefined) {

            Reflect.deleteProperty(
              process.env,
              'MEMORIA_HOME'
            )

          } else {

            process.env.MEMORIA_HOME = previousMemoriaHome

          }

          rmSync(
            dir,
            {force: true,
              recursive: true}
          )

        }

      }
    )

    void test(
      'adopt: refuses to run while another memoria operation already holds the manifest-dir lock',
      async () => {

        const dir = mkdtempSync(join(
          tmpdir(),
          'memoria-test-'
        ))
        const previousMemoriaHome = process.env.MEMORIA_HOME

        try {

          const homeRoot = join(
            dir,
            'home'
          )
          const manifestDir = join(
            dir,
            'manifest'
          )
          mkdirSync(
            homeRoot,
            {recursive: true}
          )
          mkdirSync(
            manifestDir,
            {recursive: true}
          )

          const originalPath = join(
            homeRoot,
            '.testrc'
          )
          writeFileSync(
            originalPath,
            'original content\n'
          )

          process.env.MEMORIA_HOME = homeRoot

          const manifestPath = join(
            manifestDir,
            'memoria.manifest.json'
          )
          const lockPath = join(
            manifestDir,
            '.memoria.lock'
          )
          LockFile.acquire(lockPath)

          try {

            const app = MemoriaApp.createMemoriaApp()

            await assert.rejects(async () => {

              await app.run(
                'adopt',
                {manifest: manifestPath,
                  path: originalPath}
              )

            })

            assert.equal(
              existsSync(originalPath),
              true
            )
            assert.equal(
              lstatSync(originalPath).isSymbolicLink(),
              false
            )

          } finally {

            LockFile.release(lockPath)

          }

        } finally {

          if (previousMemoriaHome === undefined) {

            Reflect.deleteProperty(
              process.env,
              'MEMORIA_HOME'
            )

          } else {

            process.env.MEMORIA_HOME = previousMemoriaHome

          }

          rmSync(
            dir,
            {force: true,
              recursive: true}
          )

        }

      }
    )

    void test(
      'manifest: exposes exactly the adopt, apply, bootstrap, catalog, diff, doctor, secrets, status, and verify commands',
      () => {

        const app = MemoriaApp.createMemoriaApp()
        const names = app.manifest().commands.map((command) => {

          const result = command.name; return result

        }).sort()
        assert.deepEqual(
          names,
          [
            'adopt',
            'apply',
            'bootstrap',
            'catalog',
            'diff',
            'doctor',
            'secrets',
            'status',
            'verify'
          ]
        )

      }
    )

    void test(
      'catalog: list reports bundled entries, optionally filtered by domain',
      async () => {

        const app = MemoriaApp.createMemoriaApp()

        const allEntries = await app.run(
          'catalog',
          {action: 'list'}
        ) as string[] | undefined
        assert.equal(
          allEntries?.includes('gitignore/node'),
          true
        )
        assert.equal(
          allEntries?.includes('gitignore/macos'),
          true
        )
        assert.equal(
          allEntries?.includes('git/aliases-core'),
          true
        )

        const gitignoreOnly = await app.run(
          'catalog',
          {action: 'list',
            domain: 'gitignore'}
        ) as string[] | undefined
        assert.deepEqual(
          gitignoreOnly,
          [
            'gitignore/macos',
            'gitignore/node'
          ]
        )

      }
    )

    void test(
      'catalog: apply for the gitignore domain writes the real bundled content into .gitignore, deduped',
      async () => {

        const dir = mkdtempSync(join(
          tmpdir(),
          'memoria-test-'
        ))

        try {

          const gitignorePath = join(
            dir,
            '.gitignore'
          )
          writeFileSync(
            gitignorePath,
            'node_modules/\n'
          )

          const app = MemoriaApp.createMemoriaApp()
          const result = await app.run(
            'catalog',
            {action: 'apply',
              entry: 'gitignore/node,macos',
              root: dir}
          ) as Record<string, unknown> | undefined
          assert.deepEqual(
            result?.written,
            [gitignorePath]
          )

          const content = readFileSync(
            gitignorePath,
            'utf8'
          )
          assert.equal(
            content.split('node_modules/').length - 1,
            1
          )
          assert.ok(content.includes('.DS_Store'))
          assert.ok(content.includes('*.tsbuildinfo'))

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
      'catalog: apply for the git domain merges into a diffable local fragment file, never through git config',
      async () => {

        const dir = mkdtempSync(join(
          tmpdir(),
          'memoria-test-'
        ))

        try {

          const app = MemoriaApp.createMemoriaApp()
          const result = await app.run(
            'catalog',
            {action: 'apply',
              entry: 'git/aliases-core',
              root: dir}
          ) as Record<string, unknown> | undefined

          const fragmentPath = join(
            dir,
            '.git-catalog-applied.gitconfig'
          )
          assert.deepEqual(
            result?.written,
            [fragmentPath]
          )

          const content = readFileSync(
            fragmentPath,
            'utf8'
          )
          assert.ok(content.includes('co = checkout'))
          assert.equal(
            existsSync(join(
              dir,
              '.git',
              'config'
            )),
            false
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
      'doctor: runs the default checks and reports findings for a deliberately-broken rc fixture',
      async () => {

        const dir = mkdtempSync(join(
          tmpdir(),
          'memoria-test-'
        ))
        const previousMemoriaHome = process.env.MEMORIA_HOME

        try {

          const homeRoot = join(
            dir,
            'home'
          )
          mkdirSync(
            homeRoot,
            {recursive: true}
          )
          const brokenRcContent = `alias gs='git status'
alias gs='git switch'
export PATH=/opt/broken/bin:$PATH
export MY_API_TOKEN=sk-live-abcdef1234567890
`
          writeFileSync(
            join(
              homeRoot,
              '.zshrc'
            ),
            brokenRcContent
          )

          process.env.MEMORIA_HOME = homeRoot

          const app = MemoriaApp.createMemoriaApp()
          const result = await app.run(
            'doctor',
            {}
          ) as {results: Array<{check: string;
            findings: string[];
            ok: boolean;}>;} | undefined

          const checkNames = result?.results.map((entry) => {

            const name = entry.check
            return name

          }).sort()
          assert.deepEqual(
            checkNames,
            [
              'archive-tools',
              'envrc-audit',
              'rc-hygiene',
              'secrets-scan'
            ]
          )

          const rcHygiene = result?.results.find((entry) => {

            const matches = entry.check === 'rc-hygiene'
            return matches

          })
          assert.equal(
            rcHygiene?.ok,
            false
          )
          assert.ok((rcHygiene?.findings.length ?? 0) > 0)

          const secretsScan = result?.results.find((entry) => {

            const matches = entry.check === 'secrets-scan'
            return matches

          })
          assert.equal(
            secretsScan?.ok,
            false
          )

        } finally {

          if (previousMemoriaHome === undefined) {

            Reflect.deleteProperty(
              process.env,
              'MEMORIA_HOME'
            )

          } else {

            process.env.MEMORIA_HOME = previousMemoriaHome

          }

          rmSync(
            dir,
            {force: true,
              recursive: true}
          )

        }

      }
    )

    void test(
      'verify: rejects a manifest entry whose target resolves outside the fresh sandbox root',
      async () => {

        const dir = mkdtempSync(join(
          tmpdir(),
          'memoria-test-'
        ))

        try {

          const outsideTarget = join(
            tmpdir(),
            `memoria-verify-outside-${String(process.pid)}.txt`
          )
          mkdirSync(
            join(
              dir,
              'sources'
            ),
            {recursive: true}
          )
          writeFileSync(
            join(
              dir,
              'sources',
              'test.txt'
            ),
            'content\n'
          )

          const manifestPath = join(
            dir,
            'memoria.manifest.json'
          )
          writeFileSync(
            manifestPath,
            JSON.stringify({
              entries: [
                {mode: 'copy',
                  source: 'sources/test.txt',
                  target: outsideTarget}
              ]
            })
          )

          const app = MemoriaApp.createMemoriaApp()
          const result = await app.run(
            'verify',
            {manifest: manifestPath}
          ) as Record<string, unknown> | undefined

          assert.equal(
            result?.ok,
            false
          )
          assert.ok(((result?.failures as string[] | undefined)?.length ?? 0) > 0)
          assert.equal(
            existsSync(outsideTarget),
            false
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
      'verify: reports ok for a valid manifest applied against the sandbox',
      async () => {

        const dir = mkdtempSync(join(
          tmpdir(),
          'memoria-test-'
        ))

        try {

          mkdirSync(
            join(
              dir,
              'sources'
            ),
            {recursive: true}
          )
          writeFileSync(
            join(
              dir,
              'sources',
              'test.txt'
            ),
            'content\n'
          )

          const manifestPath = join(
            dir,
            'memoria.manifest.json'
          )
          writeFileSync(
            manifestPath,
            JSON.stringify({
              entries: [
                {mode: 'copy',
                  source: 'sources/test.txt',
                  target: '~/verified-target.txt'}
              ]
            })
          )

          const app = MemoriaApp.createMemoriaApp()
          const result = await app.run(
            'verify',
            {manifest: manifestPath}
          ) as Record<string, unknown> | undefined

          assert.deepEqual(
            result,
            {failures: [],
              ok: true}
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
      'verify: never durably marks a seed-once entry consumed on the real manifest file',
      async () => {

        const dir = mkdtempSync(join(
          tmpdir(),
          'memoria-test-'
        ))

        try {

          mkdirSync(
            join(
              dir,
              'sources'
            ),
            {recursive: true}
          )
          writeFileSync(
            join(
              dir,
              'sources',
              'test.txt'
            ),
            'content\n'
          )

          const manifestPath = join(
            dir,
            'memoria.manifest.json'
          )
          const rawManifest = {
            entries: [
              {mode: 'copy',
                seedOnce: true,
                source: 'sources/test.txt',
                target: '~/seeded-target.txt'}
            ]
          }
          writeFileSync(
            manifestPath,
            JSON.stringify(rawManifest)
          )

          const app = MemoriaApp.createMemoriaApp()
          const result = await app.run(
            'verify',
            {manifest: manifestPath}
          ) as Record<string, unknown> | undefined

          assert.deepEqual(
            result,
            {failures: [],
              ok: true}
          )

          const manifestAfterVerify = JSON.parse(readFileSync(
            manifestPath,
            'utf8'
          )) as Record<string, unknown>

          assert.deepEqual(
            manifestAfterVerify,
            rawManifest
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
      'bootstrap: defaults to preview-only and writes nothing outside the temp clone',
      async () => {

        const dir = mkdtempSync(join(
          tmpdir(),
          'memoria-test-'
        ))
        const previousMemoriaHome = process.env.MEMORIA_HOME

        try {

          const remoteRepository = join(
            dir,
            'remote-repository'
          )
          mkdirSync(
            remoteRepository,
            {recursive: true}
          )
          GitFixture.run(
            'init',
            '-q',
            remoteRepository
          )
          mkdirSync(
            join(
              remoteRepository,
              'sources'
            ),
            {recursive: true}
          )
          writeFileSync(
            join(
              remoteRepository,
              'sources',
              'test.txt'
            ),
            'bootstrapped content\n'
          )
          writeFileSync(
            join(
              remoteRepository,
              'memoria.manifest.json'
            ),
            JSON.stringify({
              entries: [
                {mode: 'copy',
                  source: 'sources/test.txt',
                  target: '~/bootstrap-preview.txt'}
              ]
            })
          )
          GitFixture.run(
            '-C',
            remoteRepository,
            'add',
            '-A'
          )
          GitFixture.run(
            '-C',
            remoteRepository,
            '-c',
            'user.email=test@example.com',
            '-c',
            'user.name=test',
            'commit',
            '-q',
            '-m',
            'init'
          )

          const homeRoot = join(
            dir,
            'home'
          )
          mkdirSync(
            homeRoot,
            {recursive: true}
          )
          process.env.MEMORIA_HOME = homeRoot

          const app = MemoriaApp.createMemoriaApp()
          const result = await app.run(
            'bootstrap',
            {remote: remoteRepository}
          ) as Record<string, unknown> | undefined

          assert.deepEqual(
            result?.added,
            [
              join(
                homeRoot,
                'bootstrap-preview.txt'
              )
            ]
          )
          assert.equal(
            'written' in (result ?? {}),
            false
          )
          assert.equal(
            existsSync(join(
              homeRoot,
              'bootstrap-preview.txt'
            )),
            false
          )

        } finally {

          if (previousMemoriaHome === undefined) {

            Reflect.deleteProperty(
              process.env,
              'MEMORIA_HOME'
            )

          } else {

            process.env.MEMORIA_HOME = previousMemoriaHome

          }

          rmSync(
            dir,
            {force: true,
              recursive: true}
          )

        }

      }
    )

    void test(
      'bootstrap: apply writes for real when explicitly requested',
      async () => {

        const dir = mkdtempSync(join(
          tmpdir(),
          'memoria-test-'
        ))
        const previousMemoriaHome = process.env.MEMORIA_HOME

        try {

          const remoteRepository = join(
            dir,
            'remote-repository'
          )
          mkdirSync(
            remoteRepository,
            {recursive: true}
          )
          GitFixture.run(
            'init',
            '-q',
            remoteRepository
          )
          mkdirSync(
            join(
              remoteRepository,
              'sources'
            ),
            {recursive: true}
          )
          writeFileSync(
            join(
              remoteRepository,
              'sources',
              'test.txt'
            ),
            'bootstrapped for real\n'
          )
          writeFileSync(
            join(
              remoteRepository,
              'memoria.manifest.json'
            ),
            JSON.stringify({
              entries: [
                {mode: 'copy',
                  source: 'sources/test.txt',
                  target: '~/bootstrap-applied.txt'}
              ]
            })
          )
          GitFixture.run(
            '-C',
            remoteRepository,
            'add',
            '-A'
          )
          GitFixture.run(
            '-C',
            remoteRepository,
            '-c',
            'user.email=test@example.com',
            '-c',
            'user.name=test',
            'commit',
            '-q',
            '-m',
            'init'
          )

          const homeRoot = join(
            dir,
            'home'
          )
          mkdirSync(
            homeRoot,
            {recursive: true}
          )
          process.env.MEMORIA_HOME = homeRoot

          const app = MemoriaApp.createMemoriaApp()
          const result = await app.run(
            'bootstrap',
            {apply: true,
              remote: remoteRepository}
          ) as Record<string, unknown> | undefined

          const targetPath = join(
            homeRoot,
            'bootstrap-applied.txt'
          )
          assert.deepEqual(
            result?.written,
            [targetPath]
          )
          assert.equal(
            readFileSync(
              targetPath,
              'utf8'
            ),
            'bootstrapped for real\n'
          )

        } finally {

          if (previousMemoriaHome === undefined) {

            Reflect.deleteProperty(
              process.env,
              'MEMORIA_HOME'
            )

          } else {

            process.env.MEMORIA_HOME = previousMemoriaHome

          }

          rmSync(
            dir,
            {force: true,
              recursive: true}
          )

        }

      }
    )

    void test(
      'secrets: reports "none" when no broker binary is on PATH',
      async () => {

        const app = MemoriaApp.createMemoriaApp()
        const previousPath = process.env.PATH
        const emptyBinDir = mkdtempSync(join(
          tmpdir(),
          'memoria-test-empty-bin-'
        ))

        try {

          process.env.PATH = emptyBinDir

          const result = await app.run(
            'secrets',
            {}
          ) as Record<string, unknown> | undefined
          assert.deepEqual(
            result,
            {broker: 'none',
              sessionValid: false}
          )

        } finally {

          process.env.PATH = previousPath

          rmSync(
            emptyBinDir,
            {force: true,
              recursive: true}
          )

        }

      }
    )

  }
)
