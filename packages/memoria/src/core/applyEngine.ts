import {existsSync, readFileSync} from 'node:fs'

import type {HostFactsEntity, MemoriaApplyResultEntity} from '../entities/index.js'
import type {ApplyEngineOptionsInterface} from '../interfaces/ApplyEngineOptionsInterface.js'
import type {MemoriaManifestInterface} from '../interfaces/MemoriaManifestInterface.js'

import {AtomicWrite} from './atomicWrite.js'
import {LinkPlanner} from './linkPlanner.js'
import {ManifestStore} from './manifestStore.js'
import {TemplateRenderer} from './templateRenderer.js'

/** Renders and writes each applicable manifest entry. Shared by `apply`, `verify`, and `bootstrap --apply`. */
export class ApplyEngine {

  public static run (manifest: MemoriaManifestInterface, host: HostFactsEntity.Type, options: ApplyEngineOptionsInterface): MemoriaApplyResultEntity.Type {

    const plans = LinkPlanner.plan(
      manifest,
      host,
      options.overrides
    )

    const written: string[] = []
    const skipped: string[] = []
    const consumed: string[] = []

    for (const plan of plans) {

      if (plan.entry.seedOnce === true && manifest.consumed.has(plan.resolvedTarget)) {

        skipped.push(plan.resolvedTarget)
        continue

      }

      const templateText = readFileSync(
        plan.resolvedSource,
        'utf8'
      )
      const expected = TemplateRenderer.render(
        templateText,
        manifest.data,
        host
      )
      const alreadyMatches = existsSync(plan.resolvedTarget) && readFileSync(
        plan.resolvedTarget,
        'utf8'
      ) === expected

      if (alreadyMatches) {

        skipped.push(plan.resolvedTarget)

      } else {

        if (!options.dryRun) {

          AtomicWrite.write(
            plan.resolvedTarget,
            expected
          )

        }

        written.push(plan.resolvedTarget)

      }

      if (plan.entry.seedOnce === true && !options.dryRun && options.trackConsumed !== false) {

        ManifestStore.markConsumed(
          options.manifestPathInput,
          plan.resolvedTarget
        )
        consumed.push(plan.resolvedTarget)

      }

    }

    return {adopted: [],
      consumed,
      skipped,
      written}

  }

}
