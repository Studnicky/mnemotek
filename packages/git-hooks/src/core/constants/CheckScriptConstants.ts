export const CHECK_SCRIPTS = {
  'pre-commit-large-file': `#!/bin/sh
max_bytes=\${GIT_HOOKS_MAX_FILE_SIZE_BYTES:-5242880}
status=0

for f in $(git diff --cached --name-only --diff-filter=ACM); do
  if [ -f "$f" ]; then
    size=$(wc -c < "$f" | tr -d ' ')
    if [ "$size" -gt "$max_bytes" ]; then
      echo "git-hooks: staged file '$f' is $size bytes, exceeding the $max_bytes byte limit (set GIT_HOOKS_MAX_FILE_SIZE_BYTES to override)." >&2
      status=1
    fi
  fi
done

exit $status
`,
  'pre-commit-protected-branch': `#!/bin/sh
branch=$(git rev-parse --abbrev-ref HEAD)

for protected in main develop; do
  if [ "$branch" = "$protected" ]; then
    echo "git-hooks: direct commits to '$branch' are blocked. Use a feature branch, or bypass with 'git commit --no-verify'." >&2
    exit 1
  fi
done

exit 0
`,
  'pre-commit-secret-scan': `#!/bin/sh
echo "git-hooks: built-in regex secret scan — no dedicated secret-scanning tool is installed on PATH, coverage is limited to common patterns" >&2

pattern='AKIA[0-9A-Z]{16}|-----BEGIN[A-Z ]*PRIVATE KEY-----|(secret|api[_-]?key|token|password)[[:space:]]*[:=][[:space:]]*["\\x27]?[^"\\x27[:space:]]{12,}'

if git diff --cached -U0 | grep -Eiq "$pattern"; then
  echo "git-hooks: possible secret detected in the staged diff." >&2
  exit 1
fi

exit 0
`
} as const
