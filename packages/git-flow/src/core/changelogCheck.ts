import {existsSync, readdirSync, readFileSync} from 'node:fs'
import {join} from 'node:path'

export interface ChangelogCheckResult {
  readonly [key: string]: unknown
  readonly changesetCount: number
  readonly detail: string
  readonly ok: boolean
}

export function changelogCheck (input: {
  readonly root?: string
}): ChangelogCheckResult {

  const root = input.root ?? process.cwd()
  const changesetDir = join(root, '.changeset')

  if (!existsSync(changesetDir)) {

    return {
      changesetCount: 0,
      detail: 'No .changeset directory found.',
      ok: false
    }

  }

  const changesetCount = readdirSync(changesetDir).
    filter((name) => name.endsWith('.md') && name !== 'README.md').
    length

  if (changesetCount > 0) {

    return {
      changesetCount,
      detail: `Found ${String(changesetCount)} changeset(s).`,
      ok: true
    }

  }

  const changelogPath = join(root, 'CHANGELOG.md')

  if (!existsSync(changelogPath)) {

    return {
      changesetCount: 0,
      detail: 'No changesets and no CHANGELOG.md found.',
      ok: false
    }

  }

  const changelog = readFileSync(changelogPath, 'utf8')
  const hasUnreleased = /^##\s*\[?unreleased\]?/imu.test(changelog)

  return {
    changesetCount: 0,
    detail: hasUnreleased
      ? 'No changesets, but CHANGELOG.md has an Unreleased section.'
      : 'No changesets and no Unreleased section in CHANGELOG.md.',
    ok: hasUnreleased
  }

}
