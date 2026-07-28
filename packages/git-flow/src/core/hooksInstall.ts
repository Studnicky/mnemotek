import {execFileSync} from 'node:child_process'
import {chmodSync, existsSync, mkdirSync, writeFileSync} from 'node:fs'
import {join} from 'node:path'

const PRE_COMMIT_TEMPLATE = `#!/bin/sh
set -e

echo "Running pre-commit checks..."

FORBIDDEN_STAGED=$(git diff --cached --name-only | grep -E '^(dist/|\\.env)' || true)
if [ -n "$FORBIDDEN_STAGED" ]; then
  echo "ERROR: staged files under a generated/secret-shaped path:"
  echo "$FORBIDDEN_STAGED"
  exit 1
fi

echo "Pre-commit checks passed"
exit 0
`

const PRE_PUSH_TEMPLATE = `#!/bin/sh
set -e

current_branch=$(git rev-parse --abbrev-ref HEAD)

case "$current_branch" in
  main|master|develop)
    echo ""
    echo "ERROR: direct push to '$current_branch' is not allowed."
    echo "Open a pull request instead."
    exit 1
    ;;
esac

echo "Pre-push checks passed"
exit 0
`

export interface HooksInstallResult {
  readonly [key: string]: unknown
  readonly hooksPath: string
  readonly installed: readonly string[]
  readonly targetDir: string
}

export function hooksInstall (input: {
  readonly force?: boolean
  readonly targetDir?: string
}): HooksInstallResult {

  const targetDir = input.targetDir ?? process.cwd()
  const hooksDir = join(targetDir, '.githooks')
  const installed: string[] = []

  mkdirSync(hooksDir, {recursive: true})

  for (const [fileName, content] of [
    ['pre-commit', PRE_COMMIT_TEMPLATE],
    ['pre-push', PRE_PUSH_TEMPLATE]
  ] as const) {

    const filePath = join(hooksDir, fileName)

    if (existsSync(filePath) && input.force !== true) {

      continue

    }

    writeFileSync(filePath, content, {mode: 0o755})
    chmodSync(filePath, 0o755)
    installed.push(fileName)

  }

  execFileSync(
    'git',
    ['config', 'core.hooksPath', '.githooks'],
    {cwd: targetDir}
  )

  return {
    hooksPath: '.githooks',
    installed: Object.freeze(installed),
    targetDir
  }

}
