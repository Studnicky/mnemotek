import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {describe, test} from 'node:test'

import {ConventionalCommits} from '../src/core/conventionalCommits.js'
import {FeatureFlow} from '../src/core/featureFlow.js'
import {GitFlowApp} from '../src/core/gitFlowApp.js'
import {GitPrimitives} from '../src/core/gitPrimitives.js'
import {HotfixFlow} from '../src/core/hotfixFlow.js'
import {ReleaseFlow} from '../src/core/releaseFlow.js'
import {Versioning} from '../src/core/versioning.js'
import {GIT_FLOW_EXPECTED_PATTERNS} from './fixtures/GitFlowExpectedPatterns.js'

class TestSupport {

  public static makeRepository (developmentBranchName = 'develop'): string {

    const dir = mkdtempSync(join(
      tmpdir(),
      'git-flow-test-'
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
    TestSupport.runGit(
      dir,
      TestSupport.toArgumentList(
        'checkout',
        '-q',
        '-b',
        developmentBranchName
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
  'git-flow suite',
  () => {

    void test(
      'bumpVersion: patch/minor/major',
      () => {

        assert.equal(
          Versioning.bumpVersion(
            '1.2.3',
            'patch'
          ),
          '1.2.4'
        )
        assert.equal(
          Versioning.bumpVersion(
            '1.2.3',
            'minor'
          ),
          '1.3.0'
        )
        assert.equal(
          Versioning.bumpVersion(
            '1.2.3',
            'major'
          ),
          '2.0.0'
        )

      }
    )

    void test(
      'updatePackageVersion: writes the new version to package.json',
      () => {

        const dir = mkdtempSync(join(
          tmpdir(),
          'git-flow-test-'
        ))

        try {

          writeFileSync(
            join(
              dir,
              'package.json'
            ),
            JSON.stringify({name: 'x',
              version: '0.1.0'})
          )
          Versioning.updatePackageVersion(
            dir,
            '0.2.0'
          )

          const pkg = JSON.parse(readFileSync(
            join(
              dir,
              'package.json'
            ),
            'utf8'
          )) as {readonly version: string}
          assert.equal(
            pkg.version,
            '0.2.0'
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
      'featureFlow: create mode creates and checks out a feature branch',
      () => {

        const dir = TestSupport.makeRepository()

        try {

          const featureResult = TestSupport.runIn(
            dir,
            () => {

              const result = FeatureFlow.featureFlow({branch: 'thing',
                create: true})
              return result

            }
          )
          assert.equal(
            featureResult.error,
            undefined
          )
          assert.equal(
            featureResult.branch,
            'feature/thing'
          )

          const current = execFileSync(
            'git',
            TestSupport.toArgumentList(
              'rev-parse',
              '--abbrev-ref',
              'HEAD'
            ),
            {cwd: dir,
              encoding: 'utf8'}
          ).trim()
          assert.equal(
            current,
            'feature/thing'
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
      'featureFlow: create mode honors --type for non-feature branch prefixes',
      () => {

        const dir = TestSupport.makeRepository()

        try {

          const featureResult = TestSupport.runIn(
            dir,
            () => {

              const result = FeatureFlow.featureFlow({branch: 'broken-thing',
                create: true,
                type: 'bugfix'})
              return result

            }
          )
          assert.equal(
            featureResult.error,
            undefined
          )
          assert.equal(
            featureResult.branch,
            'bugfix/broken-thing'
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
      'featureFlow: status mode reports the current branch with no error',
      () => {

        const dir = TestSupport.makeRepository()

        try {

          const featureResult = TestSupport.runIn(
            dir,
            () => {

              const result = FeatureFlow.featureFlow({})
              return result

            }
          )
          assert.equal(
            featureResult.error,
            undefined
          )
          assert.equal(
            featureResult.mode,
            'status'
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
      'releaseFlow: dry-run computes a version without touching the repo',
      () => {

        const dir = TestSupport.makeRepository()

        try {

          const releaseResult = TestSupport.runIn(
            dir,
            () => {

              const result = ReleaseFlow.releaseFlow({dryRun: true})
              return result

            }
          )
          assert.equal(
            releaseResult.error,
            undefined
          )
          assert.equal(
            releaseResult.newVersion,
            '0.1.0'
          )
          assert.equal(
            releaseResult.tag,
            'v0.1.0'
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
      'hotfixFlow: dry-run computes a version without touching the repo',
      () => {

        const dir = TestSupport.makeRepository()

        try {

          const hotfixResult = TestSupport.runIn(
            dir,
            () => {

              const result = HotfixFlow.hotfixFlow({dryRun: true})
              return result

            }
          )
          assert.equal(
            hotfixResult.error,
            undefined
          )
          assert.equal(
            hotfixResult.newVersion,
            '0.0.1'
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
      'releaseFlow: resumes an existing release branch from a prior run instead of failing on createBranch',
      () => {

        const bare = mkdtempSync(join(
          tmpdir(),
          'git-flow-test-bare-'
        ))
        const dir = mkdtempSync(join(
          tmpdir(),
          'git-flow-test-clone-'
        ))

        try {

          TestSupport.runGit(
            bare,
            TestSupport.toArgumentList(
              'init',
              '-q',
              '--bare',
              '-b',
              'main'
            )
          )
          execFileSync(
            'git',
            TestSupport.toArgumentList(
              'clone',
              '-q',
              bare,
              dir
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
              'package.json'
            ),
            JSON.stringify({name: 'x',
              version: '0.1.0'})
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
          TestSupport.runGit(
            dir,
            TestSupport.toArgumentList(
              'push',
              '-q',
              '-u',
              'origin',
              'main'
            )
          )

          TestSupport.runGit(
            dir,
            TestSupport.toArgumentList(
              'checkout',
              '-q',
              '-b',
              'develop'
            )
          )
          TestSupport.runGit(
            dir,
            TestSupport.toArgumentList(
              'push',
              '-q',
              '-u',
              'origin',
              'develop'
            )
          )

          const priorVersion = Versioning.getCurrentVersion(dir)
          const expectedNewVersion = Versioning.bumpVersion(
            priorVersion ?? '0.0.0',
            'patch'
          )
          const releaseBranch = `release/${expectedNewVersion}`

          TestSupport.runGit(
            dir,
            TestSupport.toArgumentList(
              'checkout',
              '-q',
              '-b',
              releaseBranch,
              'develop'
            )
          )
          Versioning.updatePackageVersion(
            dir,
            expectedNewVersion
          )
          TestSupport.runIn(
            dir,
            () => {

              GitPrimitives.commitAll('chore(release): prior partial run')

            }
          )

          const releaseResult = TestSupport.runIn(
            dir,
            () => {

              const result = ReleaseFlow.releaseFlow({direct: true})
              return result

            }
          )

          assert.equal(
            releaseResult.error,
            undefined
          )
          assert.equal(
            releaseResult.releaseBranch,
            releaseBranch
          )
          assert.ok(releaseResult.steps.some((step) => {

            const result = step.includes(`resumed existing ${releaseBranch}`); return result

          }))
          assert.ok(!releaseResult.steps.some((step) => {

            const result = step.includes(`created ${releaseBranch}`); return result

          }))

        } finally {

          rmSync(
            bare,
            {force: true,
              recursive: true}
          )
          rmSync(
            dir,
            {force: true,
              recursive: true}
          )

        }

      }
    )

    void test(
      'releaseFlow: resuming a prior partial run computes the same version instead of double-bumping',
      () => {

        const bare = mkdtempSync(join(
          tmpdir(),
          'git-flow-test-bare-'
        ))
        const dir = mkdtempSync(join(
          tmpdir(),
          'git-flow-test-clone-'
        ))

        try {

          TestSupport.runGit(
            bare,
            TestSupport.toArgumentList(
              'init',
              '-q',
              '--bare',
              '-b',
              'main'
            )
          )
          execFileSync(
            'git',
            TestSupport.toArgumentList(
              'clone',
              '-q',
              bare,
              dir
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
              'package.json'
            ),
            JSON.stringify({name: 'x',
              version: '1.4.0'})
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
          TestSupport.runGit(
            dir,
            TestSupport.toArgumentList(
              'push',
              '-q',
              '-u',
              'origin',
              'main'
            )
          )

          TestSupport.runGit(
            dir,
            TestSupport.toArgumentList(
              'checkout',
              '-q',
              '-b',
              'develop'
            )
          )
          TestSupport.runGit(
            dir,
            TestSupport.toArgumentList(
              'push',
              '-q',
              '-u',
              'origin',
              'develop'
            )
          )

          /*
           * Simulate a prior run that created the release branch, bumped the version, and
           * committed, but failed before finishing (e.g. a network blip on push). It leaves
           * the repo checked out on the half-finished release branch, exactly like a real
           * partial run would.
           */
          const expectedNewVersion = Versioning.bumpVersion(
            '1.4.0',
            'patch'
          )
          const releaseBranch = `release/${expectedNewVersion}`

          TestSupport.runGit(
            dir,
            TestSupport.toArgumentList(
              'checkout',
              '-q',
              '-b',
              releaseBranch,
              'develop'
            )
          )
          Versioning.updatePackageVersion(
            dir,
            expectedNewVersion
          )
          TestSupport.runIn(
            dir,
            () => {

              GitPrimitives.commitAll('chore(release): prior partial run')

            }
          )

          const releaseResult = TestSupport.runIn(
            dir,
            () => {

              const result = ReleaseFlow.releaseFlow({direct: true})
              return result

            }
          )

          assert.equal(
            releaseResult.error,
            undefined
          )
          assert.equal(
            releaseResult.previousVersion,
            '1.4.0'
          )
          assert.equal(
            releaseResult.newVersion,
            expectedNewVersion
          )
          assert.equal(
            releaseResult.releaseBranch,
            releaseBranch
          )

        } finally {

          rmSync(
            bare,
            {force: true,
              recursive: true}
          )
          rmSync(
            dir,
            {force: true,
              recursive: true}
          )

        }

      }
    )

    void test(
      'pushBranch: retries after a fast-forward pull when the initial push is rejected',
      () => {

        const bare = mkdtempSync(join(
          tmpdir(),
          'git-flow-test-bare-'
        ))
        const cloneA = mkdtempSync(join(
          tmpdir(),
          'git-flow-test-a-'
        ))
        const cloneB = mkdtempSync(join(
          tmpdir(),
          'git-flow-test-b-'
        ))

        try {

          TestSupport.runGit(
            bare,
            TestSupport.toArgumentList(
              'init',
              '-q',
              '--bare',
              '-b',
              'main'
            )
          )
          execFileSync(
            'git',
            TestSupport.toArgumentList(
              'clone',
              '-q',
              bare,
              cloneA
            )
          )
          execFileSync(
            'git',
            TestSupport.toArgumentList(
              'clone',
              '-q',
              bare,
              cloneB
            )
          )

          TestSupport.runGit(
            cloneA,
            TestSupport.toArgumentList(
              'config',
              'user.email',
              'a@example.com'
            )
          )
          TestSupport.runGit(
            cloneA,
            TestSupport.toArgumentList(
              'config',
              'user.name',
              'A'
            )
          )
          writeFileSync(
            join(
              cloneA,
              'file.txt'
            ),
            'base\n'
          )
          TestSupport.runGit(
            cloneA,
            TestSupport.toArgumentList(
              'add',
              '-A'
            )
          )
          TestSupport.runGit(
            cloneA,
            TestSupport.toArgumentList(
              'commit',
              '-q',
              '-m',
              'base'
            )
          )
          TestSupport.runGit(
            cloneA,
            TestSupport.toArgumentList(
              'push',
              '-q',
              '-u',
              'origin',
              'main'
            )
          )

          TestSupport.runGit(
            cloneB,
            TestSupport.toArgumentList(
              'config',
              'user.email',
              'b@example.com'
            )
          )
          TestSupport.runGit(
            cloneB,
            TestSupport.toArgumentList(
              'config',
              'user.name',
              'B'
            )
          )
          TestSupport.runGit(
            cloneB,
            TestSupport.toArgumentList(
              'pull',
              '-q',
              '--no-rebase',
              'origin',
              'main'
            )
          )

          /*
           * A pushes a second commit that B has not pulled. B's local "main" is now behind
           * origin, so B's push is rejected (non-fast-forward) even though B made no local
           * commits of its own — the same "someone else pushed between my pull and my push"
           * race the retry is meant to recover from.
           */
          writeFileSync(
            join(
              cloneA,
              'file.txt'
            ),
            'from-a\n'
          )
          TestSupport.runGit(
            cloneA,
            TestSupport.toArgumentList(
              'add',
              '-A'
            )
          )
          TestSupport.runGit(
            cloneA,
            TestSupport.toArgumentList(
              'commit',
              '-q',
              '-m',
              'second commit from a'
            )
          )
          TestSupport.runGit(
            cloneA,
            TestSupport.toArgumentList(
              'push',
              '-q',
              'origin',
              'main'
            )
          )

          assert.doesNotThrow(() => {

            TestSupport.runIn(
              cloneB,
              () => {

                GitPrimitives.pushBranch('main')

              }
            )

          })

          const remoteHead = execFileSync(
            'git',
            TestSupport.toArgumentList(
              'rev-parse',
              'main'
            ),
            {cwd: bare,
              encoding: 'utf8'}
          ).trim()
          const localHead = execFileSync(
            'git',
            TestSupport.toArgumentList(
              'rev-parse',
              'main'
            ),
            {cwd: cloneB,
              encoding: 'utf8'}
          ).trim()
          assert.equal(
            localHead,
            remoteHead
          )

        } finally {

          rmSync(
            bare,
            {force: true,
              recursive: true}
          )
          rmSync(
            cloneA,
            {force: true,
              recursive: true}
          )
          rmSync(
            cloneB,
            {force: true,
              recursive: true}
          )

        }

      }
    )

    void test(
      'pullBranch: throws and leaves a clean repo when the pull hits a real conflict',
      () => {

        const bare = mkdtempSync(join(
          tmpdir(),
          'git-flow-test-bare-'
        ))
        const cloneA = mkdtempSync(join(
          tmpdir(),
          'git-flow-test-a-'
        ))
        const cloneB = mkdtempSync(join(
          tmpdir(),
          'git-flow-test-b-'
        ))

        try {

          TestSupport.runGit(
            bare,
            TestSupport.toArgumentList(
              'init',
              '-q',
              '--bare',
              '-b',
              'main'
            )
          )
          execFileSync(
            'git',
            TestSupport.toArgumentList(
              'clone',
              '-q',
              bare,
              cloneA
            )
          )
          execFileSync(
            'git',
            TestSupport.toArgumentList(
              'clone',
              '-q',
              bare,
              cloneB
            )
          )

          TestSupport.runGit(
            cloneA,
            TestSupport.toArgumentList(
              'config',
              'user.email',
              'a@example.com'
            )
          )
          TestSupport.runGit(
            cloneA,
            TestSupport.toArgumentList(
              'config',
              'user.name',
              'A'
            )
          )
          writeFileSync(
            join(
              cloneA,
              'file.txt'
            ),
            'base\n'
          )
          TestSupport.runGit(
            cloneA,
            TestSupport.toArgumentList(
              'add',
              '-A'
            )
          )
          TestSupport.runGit(
            cloneA,
            TestSupport.toArgumentList(
              'commit',
              '-q',
              '-m',
              'base'
            )
          )
          TestSupport.runGit(
            cloneA,
            TestSupport.toArgumentList(
              'push',
              '-q',
              '-u',
              'origin',
              'main'
            )
          )

          TestSupport.runGit(
            cloneB,
            TestSupport.toArgumentList(
              'config',
              'user.email',
              'b@example.com'
            )
          )
          TestSupport.runGit(
            cloneB,
            TestSupport.toArgumentList(
              'config',
              'user.name',
              'B'
            )
          )
          TestSupport.runGit(
            cloneB,
            TestSupport.toArgumentList(
              'pull',
              '-q',
              '--no-rebase',
              'origin',
              'main'
            )
          )

          writeFileSync(
            join(
              cloneA,
              'file.txt'
            ),
            'from-a\n'
          )
          TestSupport.runGit(
            cloneA,
            TestSupport.toArgumentList(
              'add',
              '-A'
            )
          )
          TestSupport.runGit(
            cloneA,
            TestSupport.toArgumentList(
              'commit',
              '-q',
              '-m',
              'edit from a'
            )
          )
          TestSupport.runGit(
            cloneA,
            TestSupport.toArgumentList(
              'push',
              '-q',
              'origin',
              'main'
            )
          )

          writeFileSync(
            join(
              cloneB,
              'file.txt'
            ),
            'from-b\n'
          )
          TestSupport.runGit(
            cloneB,
            TestSupport.toArgumentList(
              'add',
              '-A'
            )
          )
          TestSupport.runGit(
            cloneB,
            TestSupport.toArgumentList(
              'commit',
              '-q',
              '-m',
              'edit from b'
            )
          )

          assert.throws(
            () => {

              TestSupport.runIn(
                cloneB,
                () => {

                  GitPrimitives.pullBranch('main')

                }
              )

            },
            GIT_FLOW_EXPECTED_PATTERNS.PULL_CONFLICT
          )

          const status = execFileSync(
            'git',
            TestSupport.toArgumentList(
              'status',
              '--porcelain'
            ),
            {cwd: cloneB,
              encoding: 'utf8'}
          )
          assert.equal(
            status.trim(),
            ''
          )
          assert.equal(
            existsSync(join(
              cloneB,
              '.git',
              'MERGE_HEAD'
            )),
            false
          )

        } finally {

          rmSync(
            bare,
            {force: true,
              recursive: true}
          )
          rmSync(
            cloneA,
            {force: true,
              recursive: true}
          )
          rmSync(
            cloneB,
            {force: true,
              recursive: true}
          )

        }

      }
    )

    void test(
      'pullBranch: does not throw when the remote has no matching branch yet',
      () => {

        const bare = mkdtempSync(join(
          tmpdir(),
          'git-flow-test-bare-'
        ))
        const clone = mkdtempSync(join(
          tmpdir(),
          'git-flow-test-clone-'
        ))

        try {

          TestSupport.runGit(
            bare,
            TestSupport.toArgumentList(
              'init',
              '-q',
              '--bare',
              '-b',
              'main'
            )
          )
          execFileSync(
            'git',
            TestSupport.toArgumentList(
              'clone',
              '-q',
              bare,
              clone
            )
          )

          TestSupport.runGit(
            clone,
            TestSupport.toArgumentList(
              'config',
              'user.email',
              'x@example.com'
            )
          )
          TestSupport.runGit(
            clone,
            TestSupport.toArgumentList(
              'config',
              'user.name',
              'X'
            )
          )
          writeFileSync(
            join(
              clone,
              'file.txt'
            ),
            'base\n'
          )
          TestSupport.runGit(
            clone,
            TestSupport.toArgumentList(
              'add',
              '-A'
            )
          )
          TestSupport.runGit(
            clone,
            TestSupport.toArgumentList(
              'commit',
              '-q',
              '-m',
              'base'
            )
          )
          TestSupport.runGit(
            clone,
            TestSupport.toArgumentList(
              'push',
              '-q',
              '-u',
              'origin',
              'main'
            )
          )

          TestSupport.runGit(
            clone,
            TestSupport.toArgumentList(
              'checkout',
              '-q',
              '-b',
              'feature/new-thing'
            )
          )

          assert.doesNotThrow(() => {

            TestSupport.runIn(
              clone,
              () => {

                GitPrimitives.pullBranch('feature/new-thing')

              }
            )

          })

        } finally {

          rmSync(
            bare,
            {force: true,
              recursive: true}
          )
          rmSync(
            clone,
            {force: true,
              recursive: true}
          )

        }

      }
    )

    void test(
      'mergeBranch: throws and aborts cleanly on a real merge conflict',
      () => {

        const dir = TestSupport.makeRepository()

        try {

          TestSupport.runGit(
            dir,
            TestSupport.toArgumentList(
              'checkout',
              '-q',
              'main'
            )
          )
          writeFileSync(
            join(
              dir,
              'file.txt'
            ),
            'base\n'
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
              'base'
            )
          )

          TestSupport.runGit(
            dir,
            TestSupport.toArgumentList(
              'checkout',
              '-q',
              '-b',
              'branch-a'
            )
          )
          writeFileSync(
            join(
              dir,
              'file.txt'
            ),
            'from-a\n'
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
              'edit a'
            )
          )

          TestSupport.runGit(
            dir,
            TestSupport.toArgumentList(
              'checkout',
              '-q',
              'main'
            )
          )
          TestSupport.runGit(
            dir,
            TestSupport.toArgumentList(
              'checkout',
              '-q',
              '-b',
              'branch-b'
            )
          )
          writeFileSync(
            join(
              dir,
              'file.txt'
            ),
            'from-b\n'
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
              'edit b'
            )
          )

          assert.throws(
            () => {

              TestSupport.runIn(
                dir,
                () => {

                  GitPrimitives.mergeBranch(
                    'branch-a',
                    'branch-b'
                  )

                }
              )

            },
            GIT_FLOW_EXPECTED_PATTERNS.MERGE_CONFLICT
          )

          const status = execFileSync(
            'git',
            TestSupport.toArgumentList(
              'status',
              '--porcelain'
            ),
            {cwd: dir,
              encoding: 'utf8'}
          )
          assert.equal(
            status.trim(),
            ''
          )
          assert.equal(
            existsSync(join(
              dir,
              '.git',
              'MERGE_HEAD'
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
      'assertCleanRepositoryState: releaseFlow/hotfixFlow/featureFlow refuse to run against a mid-merge repo',
      () => {

        const dir = TestSupport.makeRepository()

        try {

          TestSupport.runGit(
            dir,
            TestSupport.toArgumentList(
              'checkout',
              '-q',
              'main'
            )
          )
          writeFileSync(
            join(
              dir,
              'file.txt'
            ),
            'base\n'
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
              'base'
            )
          )

          TestSupport.runGit(
            dir,
            TestSupport.toArgumentList(
              'checkout',
              '-q',
              '-b',
              'branch-a'
            )
          )
          writeFileSync(
            join(
              dir,
              'file.txt'
            ),
            'from-a\n'
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
              'edit a'
            )
          )

          TestSupport.runGit(
            dir,
            TestSupport.toArgumentList(
              'checkout',
              '-q',
              'main'
            )
          )
          TestSupport.runGit(
            dir,
            TestSupport.toArgumentList(
              'checkout',
              '-q',
              '-b',
              'branch-b'
            )
          )
          writeFileSync(
            join(
              dir,
              'file.txt'
            ),
            'from-b\n'
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
              'edit b'
            )
          )

          try {

            execFileSync(
              'git',
              TestSupport.toArgumentList(
                'merge',
                'branch-a'
              ),
              {cwd: dir,
                stdio: 'ignore'}
            )

          } catch {

            // expected: the merge conflicts and leaves the repo mid-merge

          }

          assert.equal(
            existsSync(join(
              dir,
              '.git',
              'MERGE_HEAD'
            )),
            true
          )

          const releaseResult = TestSupport.runIn(
            dir,
            () => {

              const result = ReleaseFlow.releaseFlow({})
              return result

            }
          )
          assert.match(
            releaseResult.error ?? '',
            GIT_FLOW_EXPECTED_PATTERNS.MID_MERGE_OR_REBASE
          )

          const hotfixResult = TestSupport.runIn(
            dir,
            () => {

              const result = HotfixFlow.hotfixFlow({})
              return result

            }
          )
          assert.match(
            hotfixResult.error ?? '',
            GIT_FLOW_EXPECTED_PATTERNS.MID_MERGE_OR_REBASE
          )

          const featureResult = TestSupport.runIn(
            dir,
            () => {

              const result = FeatureFlow.featureFlow({})
              return result

            }
          )
          assert.match(
            featureResult.error ?? '',
            GIT_FLOW_EXPECTED_PATTERNS.MID_MERGE_OR_REBASE
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
      'acquireLock/releaseLock: acquiring twice throws, releasing then acquiring succeeds',
      () => {

        const dir = TestSupport.makeRepository()

        try {

          TestSupport.runIn(
            dir,
            () => {

              GitPrimitives.acquireLock()

            }
          )
          assert.throws(
            () => {

              TestSupport.runIn(
                dir,
                () => {

                  GitPrimitives.acquireLock()

                }
              )

            },
            GIT_FLOW_EXPECTED_PATTERNS.LOCK_CONFLICT
          )

          TestSupport.runIn(
            dir,
            () => {

              GitPrimitives.releaseLock()

            }
          )
          assert.doesNotThrow(() => {

            TestSupport.runIn(
              dir,
              () => {

                GitPrimitives.acquireLock()

              }
            )

          })

          TestSupport.runIn(
            dir,
            () => {

              GitPrimitives.releaseLock()

            }
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
      'withLock: releases the lock even when the wrapped function throws',
      () => {

        const dir = TestSupport.makeRepository()

        try {

          assert.throws(
            () => {

              TestSupport.runIn(
                dir,
                () => {

                  GitPrimitives.withLock(() => {

                    throw new Error('boom')

                  })

                }
              )

            },
            GIT_FLOW_EXPECTED_PATTERNS.THROWN_BOOM
          )

          assert.doesNotThrow(() => {

            TestSupport.runIn(
              dir,
              () => {

                GitPrimitives.acquireLock()

              }
            )

          })

          TestSupport.runIn(
            dir,
            () => {

              GitPrimitives.releaseLock()

            }
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
      'withLock: passes through the wrapped function\'s return value unchanged',
      () => {

        const dir = TestSupport.makeRepository()

        try {

          const lockResult = TestSupport.runIn(
            dir,
            () => {

              const withLockResult = GitPrimitives.withLock(() => {

                const literalAnswer = 42
                return literalAnswer

              })
              return withLockResult

            }
          )
          assert.equal(
            lockResult,
            42
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
      'detectBranchStructure: detects "development" as well as "develop"',
      () => {

        const dir = TestSupport.makeRepository('development')

        try {

          const structure = TestSupport.runIn(
            dir,
            () => {

              const result = GitPrimitives.detectBranchStructure()
              return result

            }
          )
          assert.equal(
            structure.development,
            'development'
          )
          assert.equal(
            structure.production,
            'main'
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
      'branchPrefixToConventionalType: maps feature/bugfix to feat/fix, passes through the rest',
      () => {

        assert.equal(
          ConventionalCommits.branchPrefixToConventionalType('feature'),
          'feat'
        )
        assert.equal(
          ConventionalCommits.branchPrefixToConventionalType('bugfix'),
          'fix'
        )
        assert.equal(
          ConventionalCommits.branchPrefixToConventionalType('chore'),
          'chore'
        )
        assert.equal(
          ConventionalCommits.branchPrefixToConventionalType('docs'),
          'docs'
        )
        assert.equal(
          ConventionalCommits.branchPrefixToConventionalType('nonsense'),
          'chore'
        )

      }
    )

    void test(
      'validateCommitMessage: accepts a well-formed Conventional Commits subject',
      () => {

        const validationResult = ConventionalCommits.validateCommitMessage({message: 'fix(cli): correct the exit code'})
        assert.equal(
          validationResult.valid,
          true
        )
        assert.equal(
          validationResult.type,
          'fix'
        )
        assert.equal(
          validationResult.scope,
          'cli'
        )

      }
    )

    void test(
      'validateCommitMessage: rejects a subject with no type prefix',
      () => {

        const validationResult = ConventionalCommits.validateCommitMessage({message: 'correct the exit code'})
        assert.equal(
          validationResult.valid,
          false
        )

      }
    )

    void test(
      'validateCommitMessage: exempts Merge/Revert/Squashed subjects',
      () => {

        assert.equal(
          ConventionalCommits.validateCommitMessage({message: "Merge branch 'develop'"}).exempt,
          true
        )
        assert.equal(
          ConventionalCommits.validateCommitMessage({message: 'Revert "feat: broken thing"'}).exempt,
          true
        )

      }
    )

    void test(
      'validateCommitMessage: exempts chore/backmerge-* branches regardless of subject',
      () => {

        const validationResult = ConventionalCommits.validateCommitMessage({branch: 'chore/backmerge-v1.2.3',
          message: 'whatever this is'})
        assert.equal(
          validationResult.exempt,
          true
        )
        assert.equal(
          validationResult.valid,
          true
        )

      }
    )

    void test(
      'commit-check command: validates via --file the way git invokes commit-msg',
      async () => {

        const dir = mkdtempSync(join(
          tmpdir(),
          'git-flow-test-'
        ))

        try {

          const messagePath = join(
            dir,
            'COMMIT_EDITMSG'
          )
          writeFileSync(
            messagePath,
            'feat: add the thing\n'
          )

          const app = GitFlowApp.createGitFlowApp()
          const commandResult = await app.run(
            'commit-check',
            {branch: 'feature/x',
              file: messagePath}
          ) as Record<string, unknown> | undefined

          assert.equal(
            commandResult?.valid,
            true
          )
          assert.equal(
            commandResult?.type,
            'feat'
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
      'commit-check command: throws by default (non-zero CLI exit) instead of returning valid:false',
      async () => {

        const app = GitFlowApp.createGitFlowApp()
        await assert.rejects(
          async () => {

            const result = app.run(
              'commit-check',
              {branch: 'feature/x',
                message: 'did a thing wrong'}
            ); return result

          },
          GIT_FLOW_EXPECTED_PATTERNS.INVALID_COMMIT_MESSAGE
        )

      }
    )

    void test(
      'commit-check command: --lenient returns valid:false instead of throwing',
      async () => {

        const app = GitFlowApp.createGitFlowApp()
        const commandResult = await app.run(
          'commit-check',
          {branch: 'feature/x',
            lenient: true,
            message: 'did a thing wrong'}
        ) as Record<string, unknown> | undefined

        assert.equal(
          commandResult?.valid,
          false
        )

      }
    )

    void test(
      'commit-type command: derives the conventional type from the current branch',
      async () => {

        const dir = TestSupport.makeRepository()
        execFileSync(
          'git',
          TestSupport.toArgumentList(
            'checkout',
            '-q',
            '-b',
            'bugfix/thing'
          ),
          {cwd: dir}
        )

        try {

          const app = GitFlowApp.createGitFlowApp()
          const commandResult = await TestSupport.runIn(
            dir,
            async () => {

              const result = app.run(
                'commit-type',
                {}
              ); return result

            }
          ) as Record<string, unknown> | undefined

          assert.equal(
            commandResult?.type,
            'fix'
          )
          assert.equal(
            commandResult?.prefix,
            'bugfix'
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
      'manifest: exposes all commands',
      () => {

        const app = GitFlowApp.createGitFlowApp()
        const names = app.manifest().commands.map((command) => {

          const result = command.name; return result

        }).sort()
        assert.deepEqual(
          names,
          [
            'commit-check',
            'commit-type',
            'feature',
            'hotfix',
            'release',
            'sync'
          ]
        )

      }
    )

  }
)
