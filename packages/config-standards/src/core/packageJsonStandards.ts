import {existsSync, readFileSync, writeFileSync} from 'node:fs'
import {join} from 'node:path'

import type {PackageJsonFixResultEntity, StandardsCheckResultEntity} from '../entities/index.js'

import {AUTO_FILLABLE_PACKAGE_DEFAULTS, REQUIRED_PACKAGE_FIELDS} from './constants/ConfigStandardsConstants.js'

export class PackageJsonStandards {

  public static check (root: string): StandardsCheckResultEntity.Type {

    const filePath = PackageJsonStandards.packageJsonPath(root)

    if (!existsSync(filePath)) {

      return {missing: [...REQUIRED_PACKAGE_FIELDS],
        ok: false}

    }

    const packageData = JSON.parse(readFileSync(
      filePath,
      'utf8'
    )) as Record<string, unknown>
    const missing = REQUIRED_PACKAGE_FIELDS.filter((field) => {

      return !(field in packageData)

    })

    return {missing,
      ok: missing.length === 0}

  }

  public static fix (root: string): PackageJsonFixResultEntity.Type {

    const {missing} = PackageJsonStandards.check(root)

    if (missing.length === 0) {

      return {added: [],
        remaining: []}

    }

    const filePath = PackageJsonStandards.packageJsonPath(root)

    if (!existsSync(filePath)) {

      return {added: [],
        remaining: missing}

    }

    const packageData = JSON.parse(readFileSync(
      filePath,
      'utf8'
    )) as Record<string, unknown>
    const added: string[] = []
    const remaining: string[] = []
    const autoFillableFields = new Set(Object.keys(AUTO_FILLABLE_PACKAGE_DEFAULTS))

    for (const field of missing) {

      if (autoFillableFields.has(field)) {

        packageData[field] = AUTO_FILLABLE_PACKAGE_DEFAULTS[field as keyof typeof AUTO_FILLABLE_PACKAGE_DEFAULTS]
        added.push(field)

      } else {

        remaining.push(field)

      }

    }

    if (added.length > 0) {

      writeFileSync(
        filePath,
        `${JSON.stringify(
          packageData,
          null,
          2
        )}\n`
      )

    }

    return {added,
      remaining}

  }

  private static packageJsonPath (root: string): string {

    const result = join(
      root,
      'package.json'
    )
    return result

  }

}
