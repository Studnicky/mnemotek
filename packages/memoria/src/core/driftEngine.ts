import type {Dirent} from 'node:fs'

import {existsSync, readdirSync, readFileSync} from 'node:fs'
import {isAbsolute, join, relative, sep} from 'node:path'

import type {EntryFilterOverridesEntity, HostFactsEntity} from '../entities/index.js'
import type {DriftClassificationInterface} from '../interfaces/DriftClassificationInterface.js'
import type {MemoriaManifestInterface} from '../interfaces/MemoriaManifestInterface.js'

import {DRIFT_ENGINE_PATTERNS} from './constants/DriftEngineConstants.js'
import {EntryFilter} from './entryFilter.js'
import {TemplateRenderer} from './templateRenderer.js'

const DOUBLESTAR_PLACEHOLDER = ' DOUBLESTAR '

/** Three-state drift classification (missing/modified/managed) plus watchGlobs-derived unmanaged detection. */
export class DriftEngine {

  public static compare (manifest: MemoriaManifestInterface, host: HostFactsEntity.Type, overrides: EntryFilterOverridesEntity.Type = {}): DriftClassificationInterface {

    const managed: string[] = []
    const missing: string[] = []
    const modified: string[] = []

    for (const resolved of manifest.entries) {

      if (!EntryFilter.applies(
        resolved.entry,
        host,
        overrides
      )) {

        continue

      }

      const sourcePath = isAbsolute(resolved.entry.source)
        ? resolved.entry.source
        : join(
          manifest.manifestDir,
          resolved.entry.source
        )
      const templateText = readFileSync(
        sourcePath,
        'utf8'
      )
      const expected = TemplateRenderer.render(
        templateText,
        manifest.data,
        host
      )

      if (!existsSync(resolved.resolvedTarget)) {

        missing.push(resolved.resolvedTarget)
        continue

      }

      const actual = readFileSync(
        resolved.resolvedTarget,
        'utf8'
      )

      if (actual === expected) {

        managed.push(resolved.resolvedTarget)

      } else {

        modified.push(resolved.resolvedTarget)

      }

    }

    return {managed,
      missing,
      modified}

  }

  public static unmanaged (manifest: MemoriaManifestInterface): readonly string[] {

    const expandedPaths = new Set<string>()

    for (const glob of manifest.watchGlobs) {

      for (const match of DriftEngine.expandGlob(
        manifest.homeRoot,
        glob
      )) {

        expandedPaths.add(match)

      }

    }

    for (const resolved of manifest.entries) {

      expandedPaths.delete(resolved.resolvedTarget)

    }

    const result = [...expandedPaths].sort()
    return result

  }

  private static expandGlob (root: string, pattern: string): string[] {

    if (!existsSync(root)) {

      return []

    }

    const regex = DriftEngine.globToRegExp(pattern)
    const results: string[] = []

    const walk = (dir: string): void => {

      let entries: Dirent[]

      try {

        entries = readdirSync(
          dir,
          {withFileTypes: true}
        )

      } catch {

        return

      }

      for (const dirEntry of entries) {

        const fullPath = join(
          dir,
          dirEntry.name
        )

        if (dirEntry.isDirectory()) {

          walk(fullPath)
          continue

        }

        if (!dirEntry.isFile()) {

          continue

        }

        const relativePath = relative(
          root,
          fullPath
        ).
          split(sep).
          join('/')

        if (regex.test(relativePath)) {

          results.push(fullPath)

        }

      }

    }

    walk(root)
    return results

  }

  private static globToRegExp (pattern: string): RegExp {

    const segments = pattern.split('/').map((segment) => {

      if (segment === '**') {

        const result = DOUBLESTAR_PLACEHOLDER
        return result

      }

      const escaped = segment.replace(
        DRIFT_ENGINE_PATTERNS.GLOB_ESCAPE,
        '\\$&'
      )
      const result = escaped.replace(
        DRIFT_ENGINE_PATTERNS.GLOB_WILDCARD,
        '[^/]*'
      )
      return result

    })

    const joined = segments.join('/').
      replaceAll(
        `/${DOUBLESTAR_PLACEHOLDER}/`,
        '/(?:.*/)?'
      ).
      replaceAll(
        `${DOUBLESTAR_PLACEHOLDER}/`,
        '(?:.*/)?'
      ).
      replaceAll(
        `/${DOUBLESTAR_PLACEHOLDER}`,
        '(?:/.*)?'
      ).
      replaceAll(
        DOUBLESTAR_PLACEHOLDER,
        '.*'
      )

    return new RegExp(
      `^${joined}$`,
      'u'
    )

  }

}
