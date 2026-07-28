import {existsSync, readFileSync, writeFileSync} from 'node:fs'
import {join} from 'node:path'

import {checkPackageJson} from './checkPackageJson.js'

export interface FixPackageJsonResult {
  readonly [key: string]: unknown
  readonly added: readonly string[]
  readonly remaining: readonly string[]
}

const AUTO_FILLABLE_DEFAULTS: Readonly<Record<string, unknown>> = Object.freeze({
  license: 'MIT'
})

export function fixPackageJson (root: string): FixPackageJsonResult {

  const {missing} = checkPackageJson(root)

  if (missing.length === 0) {

    return {added: [], remaining: []}

  }

  const filePath = join(root, 'package.json')

  if (!existsSync(filePath)) {

    return {added: [], remaining: missing}

  }

  const packageData = JSON.parse(readFileSync(filePath, 'utf8')) as Record<string, unknown>
  const added: string[] = []
  const remaining: string[] = []

  for (const field of missing) {

    if (field in AUTO_FILLABLE_DEFAULTS) {

      packageData[field] = AUTO_FILLABLE_DEFAULTS[field]
      added.push(field)

    } else {

      remaining.push(field)

    }

  }

  if (added.length > 0) {

    writeFileSync(filePath, `${JSON.stringify(packageData, null, 2)}\n`)

  }

  return {added, remaining}

}
