import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {existsSync, mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {describe, test} from 'node:test'

import {GitHooksApp} from '../src/core/gitHooksApp.js'
import {HookInstaller} from '../src/core/hookInstaller.js'
import {GIT_HOOKS_EXPECTED_PATTERNS} from './fixtures/GitHooksExpectedPatterns.js'

const BUNDLED_CHECK_NAMES = [
  'pre-commit-large-file',
  'pre-commit-protected-branch',
  'pre-commit-secret-scan'
]

class TestSupport {

  public static isExecutable (path: string): boolean {

    const result = (statSync(path).mode & 0o111) !== 0; return result

  }

  public static makeRepository (): string {

    const dir = mkdtempSync(join(
      tmpdir(),
      'git-hooks-test-'
    ))

    TestSupport.runGit(
      dir,
      TestSupport.toArgumentList(
        'init',
        '-q',
        '-b',
        'main'
      )
    )
    TestSupport.runGit(
      dir,
      TestSupport.toArgumentList(
        'config',
        'user.email',
        'test@example.com'
      )
    )
    TestSupport.runGit(
      dir,
      TestSupport.toArgumentList(
        'config',
        'user.name',
        'Test'
      )
    )
    writeFileSync(
      join(
        dir,
        'README.md'
      ),
      '# test\n'
    )
    TestSupport.runGit(
      dir,
      TestSupport.toArgumentList(
        'add',
        '-A'
      )
    )
    TestSupport.runGit(
      dir,
      TestSupport.toArgumentList(
        'commit',
        '-q',
        '-m',
        'initial'
      )
    )

    return dir

  }

  public static runGit (dir: string, argumentList: readonly string[]): void {

    execFileSync(
      'git',
      [...argumentList],
      {cwd: dir}
    )

  }

  public static runIn<T> (dir: string, callback: () => T): T {

    const originalCwd = process.cwd()
    process.chdir(dir)

    try {

      return callback()

    } finally {

      process.chdir(originalCwd)

    }

  }

  public static toArgumentList (...parts: string[]): string[] {

    const result = parts
    return result

  }

}

void describe(
  'git-hooks suite',
  () => {

    void test(
      'install: writes core.hooksPath and the dispatcher + bundled check files into a fresh repo',
      () => {

        const dir = TestSupport.makeRepository()

        try {

          const installResult = TestSupport.runIn(
            dir,
            () => {

              const result = HookInstaller.install({dir: '.githooks',
                force: false,
                hooks: ['pre-commit']}); return result

            }
          )

          assert.deepEqual(
            installResult.installed,
            ['pre-commit']
          )
          assert.equal(
            installResult.hooksPath,
            '.githooks'
          )

          const configuredHooksPath = execFileSync(
            'git',
            TestSupport.toArgumentList(
              'config',
              '--get',
              'core.hooksPath'
            ),
            {cwd: dir,
              encoding: 'utf8'}
          ).trim()
          assert.equal(
            configuredHooksPath,
            '.githooks'
          )

          const dispatcherPath = join(
            dir,
            '.githooks',
            'pre-commit'
          )
          assert.equal(
            existsSync(dispatcherPath),
            true
          )
          assert.equal(
            TestSupport.isExecutable(dispatcherPath),
            true
          )

          BUNDLED_CHECK_NAMES.forEach((checkName) => {

            const checkPath = join(
              dir,
              '.githooks',
              checkName
            )
            assert.equal(
              existsSync(checkPath),
              true
            )
            assert.equal(
              TestSupport.isExecutable(checkPath),
              true
            )

          })

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
      'install: refuses when a conflicting .husky/ directory exists without force',
      () => {

        const dir = TestSupport.makeRepository()

        try {

          mkdirSync(join(
            dir,
            '.husky'
          ))

          assert.throws(
            () => {

              TestSupport.runIn(
                dir,
                () => {

                  HookInstaller.install({dir: '.githooks',
                    force: false,
                    hooks: ['pre-commit']})

                }
              )

            },
            GIT_HOOKS_EXPECTED_PATTERNS.CONFLICTING_HOOK_SETUP
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
      'install: proceeds when force:true is passed despite a conflicting .husky/ directory',
      () => {

        const dir = TestSupport.makeRepository()

        try {

          mkdirSync(join(
            dir,
            '.husky'
          ))

          const installResult = TestSupport.runIn(
            dir,
            () => {

              const result = HookInstaller.install({dir: '.githooks',
                force: true,
                hooks: ['pre-commit']}); return result

            }
          )

          assert.deepEqual(
            installResult.installed,
            ['pre-commit']
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
      'list: reports hooks installed under the configured directory',
      () => {

        const dir = TestSupport.makeRepository()

        try {

          TestSupport.runIn(
            dir,
            () => {

              HookInstaller.install({dir: '.githooks',
                force: false,
                hooks: ['pre-commit']})

            }
          )

          const listResult = TestSupport.runIn(
            dir,
            () => {

              const result = HookInstaller.list({dir: '.githooks'}); return result

            }
          )

          assert.deepEqual(
            listResult.hooks,
            ['pre-commit']
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
      'list: reports no hooks when the configured directory does not exist',
      () => {

        const dir = TestSupport.makeRepository()

        try {

          const listResult = TestSupport.runIn(
            dir,
            () => {

              const result = HookInstaller.list({dir: '.githooks'}); return result

            }
          )

          assert.deepEqual(
            listResult.hooks,
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
      'pre-commit-protected-branch: blocks the check on main and allows it on a feature branch',
      () => {

        const dir = TestSupport.makeRepository()

        try {

          TestSupport.runIn(
            dir,
            () => {

              HookInstaller.install({dir: '.githooks',
                force: false,
                hooks: ['pre-commit']})

            }
          )

          const checkPath = join(
            dir,
            '.githooks',
            'pre-commit-protected-branch'
          )

          assert.throws(() => {

            execFileSync(
              checkPath,
              [],
              {cwd: dir,
                stdio: 'pipe'}
            )

          })

          TestSupport.runGit(
            dir,
            TestSupport.toArgumentList(
              'checkout',
              '-q',
              '-b',
              'feature/thing'
            )
          )

          assert.doesNotThrow(() => {

            execFileSync(
              checkPath,
              [],
              {cwd: dir,
                stdio: 'pipe'}
            )

          })

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
      'hooks command: install then list round-trip through the app runner',
      async () => {

        const dir = TestSupport.makeRepository()

        try {

          const app = GitHooksApp.createGitHooksApp()

          const installResult = await TestSupport.runIn(
            dir,
            async () => {

              const result = app.run(
                'hooks',
                {action: 'install'}
              ); return result

            }
          ) as Record<string, unknown> | undefined

          assert.deepEqual(
            installResult?.installed,
            ['pre-commit']
          )

          const listResult = await TestSupport.runIn(
            dir,
            async () => {

              const result = app.run(
                'hooks',
                {action: 'list'}
              ); return result

            }
          ) as Record<string, unknown> | undefined

          assert.deepEqual(
            listResult?.hooks,
            ['pre-commit']
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
      'manifest: exposes the hooks command',
      () => {

        const app = GitHooksApp.createGitHooksApp()
        const names = app.manifest().commands.map((command) => {

          const result = command.name; return result

        })
        assert.deepEqual(
          names,
          ['hooks']
        )

      }
    )

  }
)
