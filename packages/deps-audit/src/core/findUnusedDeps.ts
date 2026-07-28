import {existsSync, readFileSync} from 'node:fs'
import {join} from 'node:path'

import type {ModuleGraph} from './scanImports.js'

export function findUnusedDependencies (root: string, graph: ModuleGraph): readonly string[] {

  const packageJsonPath = join(root, 'package.json')

  if (!existsSync(packageJsonPath)) {

    return []

  }

  const packageData = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
    readonly dependencies?: Record<string, string>
  }

  const declared = Object.keys(packageData.dependencies ?? {})

  return declared.filter((dependency) => !graph.externalSpecifiers.has(dependency))

}
