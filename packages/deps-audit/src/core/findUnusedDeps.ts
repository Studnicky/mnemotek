import {existsSync, readFileSync} from 'node:fs'
import {join} from 'node:path'

import type {ModuleGraphInterface} from '../interfaces/ModuleGraphInterface.js'

export class FindUnusedDeps {

  public static findUnusedDependencies (root: string, graph: ModuleGraphInterface): string[] {

    const packageJsonPath = join(
      root,
      'package.json'
    )

    if (!existsSync(packageJsonPath)) {

      return []

    }

    const packageData = JSON.parse(readFileSync(
      packageJsonPath,
      'utf8'
    )) as {readonly dependencies?: Record<string, string>}

    const declared = Object.keys(packageData.dependencies ?? {})

    return declared.filter((dependency) => {

      const isUnused = !graph.externalSpecifiers.has(dependency)
      return isUnused

    })

  }

}
