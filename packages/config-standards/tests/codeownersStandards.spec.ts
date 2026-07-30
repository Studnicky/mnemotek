import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {describe, test} from 'node:test'

import {CodeownersStandards} from '../src/core/codeownersStandards.js'

class CodeownersTestFixture {

  public static initRepositoryWithFiles (dir: string, codeownersContent: string): void {

    CodeownersTestFixture.runGit(
      dir,
      'init'
    )
    CodeownersTestFixture.runGit(
      dir,
      'config',
      'user.email',
      'test@example.com'
    )
    CodeownersTestFixture.runGit(
      dir,
      'config',
      'user.name',
      'Test'
    )
    writeFileSync(
      join(
        dir,
        'CODEOWNERS'
      ),
      codeownersContent
    )
    writeFileSync(
      join(
        dir,
        'src.ts'
      ),
      '// tracked file\n'
    )
    CodeownersTestFixture.runGit(
      dir,
      'add',
      '-A'
    )
    CodeownersTestFixture.runGit(
      dir,
      'commit',
      '-m',
      'init'
    )

  }

  private static runGit (dir: string, ...argumentList: string[]): void {

    execFileSync(
      'git',
      argumentList,
      {cwd: dir}
    )

  }

}

void describe(
  'CodeownersStandards',
  () => {

    void test(
      'check: reports a tracked path not matched by any CODEOWNERS pattern, network skipped by default',
      () => {

        const dir = mkdtempSync(join(
          tmpdir(),
          'config-standards-test-'
        ))

        try {

          CodeownersTestFixture.initRepositoryWithFiles(
            dir,
            'docs/* @docteam\n'
          )

          const result = CodeownersStandards.check(dir)
          assert.equal(
            result.networkSkipped,
            true
          )
          assert.ok(result.uncoveredPaths.includes('src.ts'))
          assert.equal(
            result.ok,
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
      'check: ok when every tracked path is covered',
      () => {

        const dir = mkdtempSync(join(
          tmpdir(),
          'config-standards-test-'
        ))

        try {

          CodeownersTestFixture.initRepositoryWithFiles(
            dir,
            '* @everyone\n'
          )

          const result = CodeownersStandards.check(dir)
          assert.deepEqual(
            result.uncoveredPaths,
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

  }
)
