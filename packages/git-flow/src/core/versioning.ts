import {existsSync, readFileSync, writeFileSync} from 'node:fs'
import {join} from 'node:path'

export type VersionBump = 'major' | 'minor' | 'patch'

export function getCurrentVersion (root: string): string | undefined {

  const packageJsonPath = join(root, 'package.json')

  if (!existsSync(packageJsonPath)) {

    return undefined

  }

  const packageData = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {readonly version?: string}
  return packageData.version

}

export function bumpVersion (currentVersion: string, bump: VersionBump): string {

  const parts = currentVersion.split('.').map((part) => Number.parseInt(part, 10))
  const [major, minor, patch] = [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0]

  if (bump === 'major') {

    return `${String(major + 1)}.0.0`

  }

  if (bump === 'minor') {

    return `${String(major)}.${String(minor + 1)}.0`

  }

  return `${String(major)}.${String(minor)}.${String(patch + 1)}`

}

export function updatePackageVersion (root: string, newVersion: string): void {

  const packageJsonPath = join(root, 'package.json')
  const packageData = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as Record<string, unknown>

  packageData.version = newVersion
  writeFileSync(packageJsonPath, `${JSON.stringify(packageData, null, 2)}\n`)

}

export function updateChangelog (input: {
  readonly newVersion: string
  readonly root: string
  readonly summary: string
}): void {

  const changelogPath = join(input.root, 'CHANGELOG.md')
  const date = new Date().toISOString().slice(0, 10)
  const entry = `## [${input.newVersion}] - ${date}\n\n${input.summary}\n\n`

  if (!existsSync(changelogPath)) {

    writeFileSync(changelogPath, `# Changelog\n\n${entry}`)
    return

  }

  const existing = readFileSync(changelogPath, 'utf8')
  const headingMatch = /^#\s+Changelog\s*\n/mu.exec(existing)

  if (headingMatch === null) {

    writeFileSync(changelogPath, `# Changelog\n\n${entry}${existing}`)
    return

  }

  const insertAt = headingMatch.index + headingMatch[0].length
  const updated = `${existing.slice(0, insertAt)}\n${entry}${existing.slice(insertAt)}`

  writeFileSync(changelogPath, updated)

}
