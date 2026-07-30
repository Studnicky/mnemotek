import assert from 'node:assert/strict'
import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {describe, test} from 'node:test'

import {IssueTemplatesStandards} from '../src/core/issueTemplatesStandards.js'

void describe(
  'IssueTemplatesStandards',
  () => {

    void test(
      'check: reports a template missing required front matter',
      () => {

        const dir = mkdtempSync(join(
          tmpdir(),
          'config-standards-test-'
        ))

        try {

          const templateDir = join(
            dir,
            '.github',
            'ISSUE_TEMPLATE'
          )

          mkdirSync(
            templateDir,
            {recursive: true}
          )
          writeFileSync(
            join(
              templateDir,
              'bug_report.md'
            ),
            '---\nname: Bug report\nabout: File a bug\n---\nBody\n'
          )
          writeFileSync(
            join(
              templateDir,
              'feature_request.md'
            ),
            '# No front matter here\n'
          )

          const result = IssueTemplatesStandards.check(dir)
          assert.equal(
            result.ok,
            false
          )
          assert.ok(result.missingFrontMatter.includes('feature_request.md'))
          assert.ok(!result.missingFrontMatter.includes('bug_report.md'))

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
      'check: reports a broken reference in config.yml',
      () => {

        const dir = mkdtempSync(join(
          tmpdir(),
          'config-standards-test-'
        ))

        try {

          const templateDir = join(
            dir,
            '.github',
            'ISSUE_TEMPLATE'
          )

          mkdirSync(
            templateDir,
            {recursive: true}
          )
          writeFileSync(
            join(
              templateDir,
              'config.yml'
            ),
            'blank_issues_enabled: false\ntemplate: missing_template.md\n'
          )

          const result = IssueTemplatesStandards.check(dir)
          assert.deepEqual(
            result.brokenReferences,
            ['missing_template.md']
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
      'check: ok when no ISSUE_TEMPLATE directory exists',
      () => {

        const dir = mkdtempSync(join(
          tmpdir(),
          'config-standards-test-'
        ))

        try {

          const result = IssueTemplatesStandards.check(dir)
          assert.equal(
            result.ok,
            true
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
