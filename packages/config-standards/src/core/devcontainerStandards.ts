import {existsSync, readFileSync} from 'node:fs'
import {join} from 'node:path'

import type {DevcontainerResultEntity} from '../entities/index.js'

import {DEVCONTAINER_CANDIDATE_PATHS, DEVCONTAINER_LOCK_CANDIDATE_PATHS, JSONC_BLOCK_COMMENT_PATTERN, JSONC_LINE_COMMENT_PATTERN} from './constants/ConfigStandardsConstants.js'

export class DevcontainerStandards {

  public static check (root: string): DevcontainerResultEntity.Type {

    const devcontainer = DevcontainerStandards.readJsonc(
      root,
      DEVCONTAINER_CANDIDATE_PATHS
    )

    if (devcontainer === undefined) {

      return {ok: true,
        staleLock: false,
        unpinnedFeatures: []}

    }

    const featureKeys = Object.keys(devcontainer.features ?? {})
    const unpinnedFeatures = featureKeys.filter((key) => {

      const isUnpinned = DevcontainerStandards.isUnpinned(key)
      return isUnpinned

    })

    const lock = DevcontainerStandards.readJsonc(
      root,
      DEVCONTAINER_LOCK_CANDIDATE_PATHS
    )
    const staleLock = lock !== undefined && !DevcontainerStandards.featureBaseIds(featureKeys).
      every((baseId) => {

        const isInLock = DevcontainerStandards.featureBaseIds(Object.keys(lock.features ?? {})).includes(baseId)
        return isInLock

      })

    return {
      ok: unpinnedFeatures.length === 0 && !staleLock,
      staleLock,
      unpinnedFeatures
    }

  }

  private static featureBaseId (featureKey: string): string {

    const lastColonIndex = featureKey.lastIndexOf(':')
    const lastSlashIndex = featureKey.lastIndexOf('/')

    return lastColonIndex > lastSlashIndex
      ? featureKey.slice(
        0,
        lastColonIndex
      )
      : featureKey

  }

  private static featureBaseIds (keys: string[]): string[] {

    const baseIds = keys.map((key) => {

      const baseId = DevcontainerStandards.featureBaseId(key)
      return baseId

    })
    return baseIds

  }

  private static isUnpinned (featureKey: string): boolean {

    const lastColonIndex = featureKey.lastIndexOf(':')
    const lastSlashIndex = featureKey.lastIndexOf('/')

    if (lastColonIndex <= lastSlashIndex) {

      return true

    }

    return featureKey.slice(lastColonIndex + 1) === 'latest'

  }

  private static readJsonc (root: string, candidates: readonly string[]): {features?: Record<string, unknown>} | undefined {

    const filePath = candidates.
      map((candidate) => {

        const resolved = join(
          root,
          candidate
        )
        return resolved

      }).
      find((candidate) => {

        const found = existsSync(candidate)
        return found

      })

    if (filePath === undefined) {

      return undefined

    }

    const raw = readFileSync(
      filePath,
      'utf8'
    )
    const withoutComments = raw.
      replace(
        JSONC_BLOCK_COMMENT_PATTERN,
        ''
      ).
      replace(
        JSONC_LINE_COMMENT_PATTERN,
        ''
      )

    try {

      return JSON.parse(withoutComments) as {features?: Record<string, unknown>}

    } catch {

      return undefined

    }

  }

}
