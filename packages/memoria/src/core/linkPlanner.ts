import {isAbsolute, join} from 'node:path'

import type {EntryFilterOverridesEntity, HostFactsEntity} from '../entities/index.js'
import type {LinkPlanEntryInterface} from '../interfaces/LinkPlanEntryInterface.js'
import type {MemoriaManifestInterface} from '../interfaces/MemoriaManifestInterface.js'

import {EntryFilter} from './entryFilter.js'
import {ManifestStore} from './manifestStore.js'

/**
 * Resolves each applicable manifest entry into a concrete filesystem action
 * description for apply/adopt. Re-checks the home-root descendant guard
 * (belt-and-suspenders with ManifestStore's load-time check) for callers
 * that might bypass ManifestStore.
 */
export class LinkPlanner {

  public static plan (manifest: MemoriaManifestInterface, host: HostFactsEntity.Type, overrides: EntryFilterOverridesEntity.Type = {}): readonly LinkPlanEntryInterface[] {

    const plans: LinkPlanEntryInterface[] = []

    for (const resolved of manifest.entries) {

      if (!EntryFilter.applies(
        resolved.entry,
        host,
        overrides
      )) {

        continue

      }

      if (!ManifestStore.isDescendant(
        manifest.homeRoot,
        resolved.resolvedTarget
      )) {

        throw new Error(`Refusing to plan entry with target "${resolved.resolvedTarget}" outside home root "${manifest.homeRoot}".`)

      }

      const resolvedSource = isAbsolute(resolved.entry.source)
        ? resolved.entry.source
        : join(
          manifest.manifestDir,
          resolved.entry.source
        )

      plans.push({
        entry: resolved.entry,
        mode: resolved.entry.mode,
        resolvedSource,
        resolvedTarget: resolved.resolvedTarget
      })

    }

    return plans

  }

}
