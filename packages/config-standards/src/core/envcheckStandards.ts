import {existsSync, readdirSync, readFileSync, statSync} from 'node:fs'
import {extname, join, sep} from 'node:path'

import type {EnvcheckResultEntity} from '../entities/index.js'

import {ENVCHECK_SKIPPED_DIRECTORIES, ENVCHECK_SOURCE_EXTENSIONS, ENVIRONMENT_EXAMPLE_KEY_PATTERN, ENVIRONMENT_VARIABLE_REFERENCE_PATTERN} from './constants/ConfigStandardsConstants.js'

/*
 * A plain recursive fs walk + regex scan, not a shell-out to ripgrep — simpler to
 * test and equally correct for this scope (no need to respect .gitignore semantics
 * beyond the fixed node_modules/dist/.git skip list).
 */
export class EnvcheckStandards {

  public static check (root: string): EnvcheckResultEntity.Type {

    const discovered = EnvcheckStandards.discoverEnvironmentVariables(root)
    const documented = EnvcheckStandards.readEnvironmentExampleKeys(root)

    const undocumented = [...discovered].filter((name) => {

      return !documented.has(name)

    }).sort()

    const unused = [...documented].filter((name) => {

      return !discovered.has(name)

    }).sort()

    return {ok: undocumented.length === 0 && unused.length === 0,
      undocumented,
      unused}

  }

  private static discoverEnvironmentVariables (root: string): Set<string> {

    const discovered = new Set<string>()

    for (const filePath of EnvcheckStandards.walkSourceFiles(root)) {

      const content = readFileSync(
        filePath,
        'utf8'
      )

      for (const match of content.matchAll(ENVIRONMENT_VARIABLE_REFERENCE_PATTERN)) {

        const [, name] = match

        if (name !== undefined) {

          discovered.add(name)

        }

      }

    }

    return discovered

  }

  private static readEnvironmentExampleKeys (root: string): Set<string> {

    const filePath = join(
      root,
      '.env.example'
    )

    if (!existsSync(filePath)) {

      return new Set()

    }

    const keys = new Set<string>()
    const content = readFileSync(
      filePath,
      'utf8'
    )

    for (const match of content.matchAll(ENVIRONMENT_EXAMPLE_KEY_PATTERN)) {

      const [, name] = match

      if (name !== undefined) {

        keys.add(name)

      }

    }

    return keys

  }

  private static walkSourceFiles (root: string): string[] {

    if (!existsSync(root)) {

      return []

    }

    const skippedDirectories = new Set<string>(ENVCHECK_SKIPPED_DIRECTORIES)
    const sourceExtensions = new Set<string>(ENVCHECK_SOURCE_EXTENSIONS)
    const relativePaths = readdirSync(
      root,
      {recursive: true}
    ) as string[]
    const files: string[] = []

    for (const relativePath of relativePaths) {

      const segments = relativePath.split(sep)
      const isSkipped = segments.some((segment) => {

        const result = skippedDirectories.has(segment)
        return result

      })

      if (isSkipped || !sourceExtensions.has(extname(relativePath))) {

        continue

      }

      const fullPath = join(
        root,
        relativePath
      )

      if (statSync(fullPath).isFile()) {

        files.push(fullPath)

      }

    }

    return files

  }

}
