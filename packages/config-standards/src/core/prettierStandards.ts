import {existsSync, readFileSync} from 'node:fs'
import {join} from 'node:path'

import type {PrettierCheckResultEntity, PrettierFixResultEntity} from '../entities/index.js'

import {AtomicWrite} from './atomicWrite.js'
import {PRETTIER_CONFIG_FILES, PRETTIER_DEFAULT_CONFIG} from './constants/ConfigStandardsConstants.js'

/*
 * Writes a fixed default config rather than prompting interactively, so fix() stays
 * deterministic and scriptable/testable.
 */
export class PrettierStandards {

  public static check (root: string): PrettierCheckResultEntity.Type {

    return {ok: PrettierStandards.hasValidConfig(root)}

  }

  public static fix (root: string): PrettierFixResultEntity.Type {

    if (PrettierStandards.hasValidConfig(root)) {

      return {created: false}

    }

    AtomicWrite.write(
      join(
        root,
        '.prettierrc.json'
      ),
      `${JSON.stringify(
        PRETTIER_DEFAULT_CONFIG,
        null,
        2
      )}\n`
    )

    return {created: true}

  }

  private static hasConfigFile (root: string): boolean {

    const hasConfig = PRETTIER_CONFIG_FILES.some((fileName) => {

      const exists = existsSync(join(
        root,
        fileName
      ))
      return exists

    })
    return hasConfig

  }

  private static hasPackageJsonConfig (root: string): boolean {

    const filePath = join(
      root,
      'package.json'
    )

    if (!existsSync(filePath)) {

      return false

    }

    const packageData = JSON.parse(readFileSync(
      filePath,
      'utf8'
    )) as Record<string, unknown>

    return 'prettier' in packageData

  }

  private static hasValidConfig (root: string): boolean {

    return PrettierStandards.hasConfigFile(root) || PrettierStandards.hasPackageJsonConfig(root)

  }

}
