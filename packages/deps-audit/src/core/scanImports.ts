import {readdirSync, readFileSync} from 'node:fs'
import {dirname, extname, join, normalize, relative} from 'node:path'

import type {ModuleGraphInterface} from '../interfaces/ModuleGraphInterface.js'

import {SCAN_IMPORTS_PATTERNS} from './constants/ScanImportsConstants.js'

export class ScanImports {

  public static buildModuleGraph (root: string): ModuleGraphInterface {

    const files = ScanImports.listSourceFiles(root)
    const fileSet = new Set(files)
    const edges = new Map<string, string[]>()
    const externalSpecifiers = new Set<string>()

    for (const file of files) {

      const targets = ScanImports.scanFileImports({externalSpecifiers,
        file,
        fileSet})

      edges.set(
        file,
        targets
      )

    }

    return {
      edges,
      externalSpecifiers,
      files: files.map((file) => {

        const relativeFile = relative(
          root,
          file
        )
        return relativeFile

      })
    }

  }

  private static listSourceFiles (root: string): string[] {

    const result: string[] = []
    const stack = [root]

    while (stack.length > 0) {

      const current = stack.pop()

      if (current === undefined) {

        continue

      }

      ScanImports.scanDirectory({current,
        result,
        stack})

    }

    return result

  }

  private static packageNameFromSpecifier (specifier: string): string {

    const segments = specifier.split('/')
    const first = segments[0] ?? specifier

    if (specifier.startsWith('@')) {

      const second = segments[1]
      return second === undefined
        ? first
        : `${first}/${second}`

    }

    return first

  }

  private static resolveRelativeImport (fromFile: string, specifier: string, allFiles: ReadonlySet<string>): string | undefined {

    const basePath = normalize(join(
      dirname(fromFile),
      specifier
    )).replace(
      SCAN_IMPORTS_PATTERNS.JS_EXTENSION,
      '.ts'
    )

    if (allFiles.has(basePath)) {

      return basePath

    }

    const indexPath = normalize(join(
      basePath.replace(
        SCAN_IMPORTS_PATTERNS.TS_EXTENSION,
        ''
      ),
      'index.ts'
    ))

    if (allFiles.has(indexPath)) {

      return indexPath

    }

    return undefined

  }

  private static scanDirectory (context: {current: string;
    result: string[];
    stack: string[];}): void {

    const {current, result, stack} = context
    const entries = readdirSync(
      current,
      {withFileTypes: true}
    )
    for (const entry of entries) {

      if (entry.name === 'node_modules' || entry.name === 'dist') {

        continue

      }

      const fullPath = join(
        current,
        entry.name
      )

      if (entry.isDirectory()) {

        stack.push(fullPath)
        continue

      }

      if (extname(entry.name) === '.ts') {

        result.push(fullPath)

      }

    }

  }

  private static scanFileImports (context: {externalSpecifiers: Set<string>;
    file: string;
    fileSet: ReadonlySet<string>;}): string[] {

    const {externalSpecifiers, file, fileSet} = context
    const content = readFileSync(
      file,
      'utf8'
    )
    const targets: string[] = []

    SCAN_IMPORTS_PATTERNS.IMPORT_STATEMENT.lastIndex = 0
    for (const match of content.matchAll(SCAN_IMPORTS_PATTERNS.IMPORT_STATEMENT)) {

      const specifier = match[1]

      if (specifier === undefined) {

        continue

      }

      if (!specifier.startsWith('.')) {

        externalSpecifiers.add(ScanImports.packageNameFromSpecifier(specifier))
        continue

      }

      const resolved = ScanImports.resolveRelativeImport(
        file,
        specifier,
        fileSet
      )

      if (resolved !== undefined) {

        targets.push(resolved)

      }

    }

    return targets

  }

}
