import {existsSync, readFileSync} from 'node:fs'
import {join} from 'node:path'

import type {CatalogResolvedEntryInterface} from '../../interfaces/CatalogResolvedEntryInterface.js'

import {AtomicWrite} from '../atomicWrite.js'

/** Mutation accumulator for a single applyGitignore run — an internal implementation detail, not a public contract. */
class GitignoreMergeState {

  public readonly added: string[] = []

  public readonly existingSet: Set<string>

  public readonly outputLines: string[]

  public constructor (existingLines: readonly string[]) {

    this.existingSet = new Set<string>()
    this.outputLines = [...existingLines]

    for (const line of existingLines) {

      const trimmed = line.trim()

      if (trimmed.length > 0) {

        this.existingSet.add(trimmed)

      }

    }

  }

}

/**
 * Writes catalog resource content to a project. gitignore entries merge
 * (dedupe, append missing lines) into `.gitignore`. git-domain entries merge
 * into a diffable local fragment file rather than being executed through
 * `git config` directly — see the catalog supply-chain-risk pitfall.
 */
export class CatalogWriter {

  public static applyGitFragment (root: string, resolvedEntries: readonly CatalogResolvedEntryInterface[]): readonly string[] {

    const fragmentPath = join(
      root,
      '.git-catalog-applied.gitconfig'
    )
    const existingContent = existsSync(fragmentPath)
      ? readFileSync(
        fragmentPath,
        'utf8'
      )
      : ''

    let nextContent = existingContent
    const added: string[] = []

    for (const resolvedEntry of resolvedEntries) {

      const marker = `# memoria catalog: git/${resolvedEntry.name}`

      if (existingContent.includes(marker)) {

        continue

      }

      const separator = nextContent.length > 0 && !nextContent.endsWith('\n\n')
        ? '\n'
        : ''
      nextContent += `${separator}${marker}\n${resolvedEntry.content.trimEnd()}\n\n`
      added.push(resolvedEntry.name)

    }

    if (added.length > 0) {

      AtomicWrite.write(
        fragmentPath,
        nextContent
      )

    }

    return added

  }

  public static applyGitignore (root: string, resolvedEntries: readonly CatalogResolvedEntryInterface[]): readonly string[] {

    const gitignorePath = join(
      root,
      '.gitignore'
    )
    const existingLines = existsSync(gitignorePath)
      ? readFileSync(
        gitignorePath,
        'utf8'
      ).split('\n')
      : []
    const state = new GitignoreMergeState(existingLines)

    for (const resolvedEntry of resolvedEntries) {

      CatalogWriter.appendGitignoreEntry(
        resolvedEntry,
        state
      )

    }

    if (state.added.length > 0) {

      AtomicWrite.write(
        gitignorePath,
        `${CatalogWriter.stripTrailingNewlines(state.outputLines.join('\n'))}\n`
      )

    }

    return state.added

  }

  private static appendGitignoreEntry (resolvedEntry: CatalogResolvedEntryInterface, state: GitignoreMergeState): void {

    const newLines: string[] = []

    for (const rawLine of resolvedEntry.content.split('\n')) {

      const trimmed = rawLine.trim()

      if (trimmed.length > 0 && !state.existingSet.has(trimmed)) {

        newLines.push(trimmed)

      }

    }

    if (newLines.length === 0) {

      return

    }

    if (state.outputLines.length > 0 && state.outputLines[state.outputLines.length - 1] !== '') {

      state.outputLines.push('')

    }

    state.outputLines.push(`# memoria catalog: gitignore/${resolvedEntry.name}`)

    for (const line of newLines) {

      state.outputLines.push(line)
      state.existingSet.add(line)
      state.added.push(line)

    }

  }

  /**
   * Linear character scan, not a regex — CodeQL flags `/\n+$/`-style
   * patterns applied to library-derived content as a potential polynomial
   * ReDoS on pathological input. A scan has no backtracking to blow up.
   */
  private static stripTrailingNewlines (value: string): string {

    let end = value.length

    while (end > 0 && value[end - 1] === '\n') {

      end -= 1

    }

    return value.slice(
      0,
      end
    )

  }

}
