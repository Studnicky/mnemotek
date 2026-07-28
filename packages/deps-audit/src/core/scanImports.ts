import {readdirSync, readFileSync} from 'node:fs'
import {dirname, extname, join, normalize, relative} from 'node:path'

const IMPORT_PATTERN = /(?:import|export)\s+(?:[\w*{},\s]+\s+from\s+)?['"]([^'"]+)['"]/gu

export interface ModuleGraph {
  readonly edges: ReadonlyMap<string, readonly string[]>
  readonly externalSpecifiers: ReadonlySet<string>
  readonly files: readonly string[]
}

function listSourceFiles (root: string): string[] {

  const result: string[] = []
  const stack = [root]

  while (stack.length > 0) {

    const current = stack.pop()
    if (current === undefined) {

      continue

    }

    for (const entry of readdirSync(current, {withFileTypes: true})) {

      if (entry.name === 'node_modules' || entry.name === 'dist') {

        continue

      }

      const fullPath = join(current, entry.name)

      if (entry.isDirectory()) {

        stack.push(fullPath)
        continue

      }

      if (extname(entry.name) === '.ts') {

        result.push(fullPath)

      }

    }

  }

  return result

}

function packageNameFromSpecifier (specifier: string): string {

  const segments = specifier.split('/')
  const first = segments[0] ?? specifier

  if (specifier.startsWith('@')) {

    const second = segments[1]
    return second === undefined ? first : `${first}/${second}`

  }

  return first

}

function resolveRelativeImport (fromFile: string, specifier: string, allFiles: ReadonlySet<string>): string | undefined {

  const basePath = normalize(join(dirname(fromFile), specifier)).replace(/\.js$/u, '.ts')

  if (allFiles.has(basePath)) {

    return basePath

  }

  const indexPath = normalize(join(basePath.replace(/\.ts$/u, ''), 'index.ts'))

  if (allFiles.has(indexPath)) {

    return indexPath

  }

  return undefined

}

export function buildModuleGraph (root: string): ModuleGraph {

  const files = listSourceFiles(root)
  const fileSet = new Set(files)
  const edges = new Map<string, string[]>()
  const externalSpecifiers = new Set<string>()

  for (const file of files) {

    const content = readFileSync(file, 'utf8')
    const targets: string[] = []

    IMPORT_PATTERN.lastIndex = 0
    for (const match of content.matchAll(IMPORT_PATTERN)) {

      const specifier = match[1]
      if (specifier === undefined) {

        continue

      }

      if (!specifier.startsWith('.')) {

        externalSpecifiers.add(packageNameFromSpecifier(specifier))
        continue

      }

      const resolved = resolveRelativeImport(file, specifier, fileSet)
      if (resolved !== undefined) {

        targets.push(resolved)

      }

    }

    edges.set(file, targets)

  }

  return {
    edges,
    externalSpecifiers,
    files: files.map((file) => relative(root, file))
  }

}
