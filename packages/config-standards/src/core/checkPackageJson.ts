import {existsSync, readFileSync} from 'node:fs'
import {join} from 'node:path'

import {REQUIRED_PACKAGE_FIELDS} from './rules.js'

export interface PackageJsonCheckResult {
  readonly [key: string]: unknown
  readonly missing: readonly string[]
  readonly ok: boolean
}

export function checkPackageJson (root: string): PackageJsonCheckResult {

  const filePath = join(root, 'package.json')

  if (!existsSync(filePath)) {

    return {missing: [...REQUIRED_PACKAGE_FIELDS], ok: false}

  }

  const packageData = JSON.parse(readFileSync(filePath, 'utf8')) as Record<string, unknown>
  const missing = REQUIRED_PACKAGE_FIELDS.filter((field) => !(field in packageData))

  return {missing, ok: missing.length === 0}

}
