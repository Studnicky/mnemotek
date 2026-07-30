import {SchemaValidator} from '@studnicky/json'
import {existsSync, readFileSync, realpathSync} from 'node:fs'
import {basename, dirname, isAbsolute, join, relative, resolve} from 'node:path'

import type {MemoriaManifestInterface} from '../interfaces/MemoriaManifestInterface.js'
import type {MemoriaResolvedEntryInterface} from '../interfaces/MemoriaResolvedEntryInterface.js'

import {MemoriaManifestEntryEntity} from '../entities/index.js'
import {AtomicWrite} from './atomicWrite.js'
import {HostFacts} from './hostFacts.js'

interface RawManifestInterface {
  consumed?: readonly string[];
  data?: Record<string, unknown>;
  entries?: readonly unknown[];
  watchGlobs?: readonly string[];
}

/**
 * Reads/writes memoria.manifest.json. Load-time validation resolves every
 * entry's target (expanding a leading `~` against the effective home root)
 * and rejects the whole manifest if any resolved target escapes that root.
 */
export class ManifestStore {

  public static appendEntry (manifestPath: string, entry: MemoriaManifestEntryEntity.Type): void {

    if (!MemoriaManifestEntryEntity.validate(entry)) {

      throw new Error(`Refusing to append invalid manifest entry: ${SchemaValidator.formatErrors(MemoriaManifestEntryEntity.validate.errors)}`)

    }

    const absoluteManifestPath = resolve(manifestPath)
    const raw = ManifestStore.readRaw(absoluteManifestPath)
    const entries = [
      ...raw.entries ?? [],
      entry
    ]

    ManifestStore.writeRaw(
      absoluteManifestPath,
      {...raw,
        entries}
    )

  }

  /**
   * Lexical path comparison alone is fooled by a symlinked intermediate
   * directory under homeRoot (e.g. ~/.config -> /etc): the candidate reads
   * as contained while the real write lands outside homeRoot. Resolving
   * both sides through the deepest EXISTING ancestor's realpath before
   * comparing closes that gap without requiring the candidate itself to
   * exist yet (it usually doesn't — that's what `apply` is about to create).
   */
  public static isDescendant (homeRoot: string, candidate: string): boolean {

    const realHomeRoot = existsSync(homeRoot)
      ? realpathSync(homeRoot)
      : homeRoot
    const realCandidate = ManifestStore.resolveRealPath(candidate)

    const relativePath = relative(
      realHomeRoot,
      realCandidate
    )
    const result = relativePath.length > 0 && !relativePath.startsWith('..') && !isAbsolute(relativePath)
    return result

  }

  public static load (manifestPath: string, homeRootOverride?: string): MemoriaManifestInterface {

    const absoluteManifestPath = resolve(manifestPath)
    const manifestDir = dirname(absoluteManifestPath)
    const homeRoot = HostFacts.resolveHomeRoot(homeRootOverride)

    if (!existsSync(absoluteManifestPath)) {

      throw new Error(`Manifest not found at "${absoluteManifestPath}".`)

    }

    const raw = ManifestStore.readRaw(absoluteManifestPath)
    const rawEntries = raw.entries ?? []

    const entries = rawEntries.map((rawEntry, index): MemoriaResolvedEntryInterface => {

      if (!MemoriaManifestEntryEntity.validate(rawEntry)) {

        throw new Error(`Manifest entry at index ${String(index)} is invalid: ${SchemaValidator.formatErrors(MemoriaManifestEntryEntity.validate.errors)}`)

      }

      const resolvedTarget = ManifestStore.resolveTarget(
        rawEntry.target,
        homeRoot
      )

      if (!ManifestStore.isDescendant(
        homeRoot,
        resolvedTarget
      )) {

        throw new Error(`Manifest entry target "${rawEntry.target}" resolves to "${resolvedTarget}", which is outside home root "${homeRoot}".`)

      }

      return {entry: rawEntry,
        resolvedTarget}

    })

    return {
      consumed: new Set(raw.consumed ?? []),
      data: raw.data ?? {},
      entries,
      homeRoot,
      manifestDir,
      manifestPath: absoluteManifestPath,
      watchGlobs: raw.watchGlobs ?? []
    }

  }

  public static markConsumed (manifestPath: string, target: string): void {

    const absoluteManifestPath = resolve(manifestPath)
    const raw = ManifestStore.readRaw(absoluteManifestPath)
    const consumedSet = new Set(raw.consumed ?? [])
    consumedSet.add(target)

    ManifestStore.writeRaw(
      absoluteManifestPath,
      {...raw,
        consumed: [...consumedSet].sort()}
    )

  }

  public static resolveTarget (target: string, homeRoot: string): string {

    if (target === '~') {

      return homeRoot

    }

    if (target.startsWith('~/')) {

      return join(
        homeRoot,
        target.slice(2)
      )

    }

    if (isAbsolute(target)) {

      return target

    }

    return join(
      homeRoot,
      target
    )

  }

  private static readRaw (absoluteManifestPath: string): RawManifestInterface {

    if (!existsSync(absoluteManifestPath)) {

      return {}

    }

    return JSON.parse(readFileSync(
      absoluteManifestPath,
      'utf8'
    )) as RawManifestInterface

  }

  private static resolveRealPath (candidate: string): string {

    let current = candidate
    const suffixParts: string[] = []

    while (!existsSync(current)) {

      const parent = dirname(current)

      if (parent === current) {

        return candidate

      }

      suffixParts.unshift(basename(current))
      current = parent

    }

    const realBase = realpathSync(current)
    return suffixParts.length > 0
      ? join(
        realBase,
        ...suffixParts
      )
      : realBase

  }

  private static writeRaw (absoluteManifestPath: string, raw: RawManifestInterface): void {

    AtomicWrite.write(
      absoluteManifestPath,
      `${JSON.stringify(
        raw,
        null,
        2
      )}\n`
    )

  }

}
