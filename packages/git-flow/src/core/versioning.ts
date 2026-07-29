import {existsSync, readFileSync, writeFileSync} from 'node:fs'
import {join} from 'node:path'

import type {VersionBumpEntity} from '../entities/index.js'

export class Versioning {

  public static bumpVersion (currentVersion: string, bump: VersionBumpEntity.Type): string {

    const parts = currentVersion.split('.').map((part) => {

      const result = Number.parseInt(
        part,
        10
      )
      return result

    })
    const major = parts[0] ?? 0
    const minor = parts[1] ?? 0
    const patch = parts[2] ?? 0

    if (bump === 'major') {

      return `${String(major + 1)}.0.0`

    }

    if (bump === 'minor') {

      return `${String(major)}.${String(minor + 1)}.0`

    }

    return `${String(major)}.${String(minor)}.${String(patch + 1)}`

  }

  public static computeVersion (input: {bump: VersionBumpEntity.Type;
    defaultVersion: string;
    requestedVersion: string | undefined;
    root: string;}): {newVersion: string;
    previousVersion: string | undefined;} {

    const {bump, defaultVersion, requestedVersion, root} = input
    const previousVersion = Versioning.getCurrentVersion(root)
    const newVersion = requestedVersion ?? (previousVersion === undefined
      ? defaultVersion
      : Versioning.bumpVersion(
        previousVersion,
        bump
      ))
    return {newVersion,
      previousVersion}

  }

  public static getCurrentVersion (root: string): string | undefined {

    const packageJsonPath = join(
      root,
      'package.json'
    )

    if (!existsSync(packageJsonPath)) {

      return undefined

    }

    const packageData = JSON.parse(readFileSync(
      packageJsonPath,
      'utf8'
    )) as {readonly version?: string}
    return packageData.version

  }

  public static updatePackageVersion (root: string, newVersion: string): void {

    const packageJsonPath = join(
      root,
      'package.json'
    )
    const packageData = JSON.parse(readFileSync(
      packageJsonPath,
      'utf8'
    )) as Record<string, unknown>

    packageData.version = newVersion
    writeFileSync(
      packageJsonPath,
      `${JSON.stringify(
        packageData,
        null,
        2
      )}\n`
    )

  }

}
