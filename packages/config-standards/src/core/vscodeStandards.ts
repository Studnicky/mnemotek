import {existsSync, mkdirSync, readFileSync} from 'node:fs'
import {dirname, join} from 'node:path'

import type {VscodeCheckResultEntity, VscodeFixResultEntity} from '../entities/index.js'

import {AtomicWrite} from './atomicWrite.js'
import {VSCODE_EXTENSION_RECOMMENDATIONS, VSCODE_EXTENSIONS_FILE, VSCODE_RECOMMENDED_SETTINGS, VSCODE_SETTINGS_FILE} from './constants/ConfigStandardsConstants.js'

export class VscodeStandards {

  public static check (root: string): VscodeCheckResultEntity.Type {

    const expectedExtensionIds = VscodeStandards.expectedExtensionIds(root)
    const expectedSettingKeys = VscodeStandards.expectedSettingKeys(expectedExtensionIds)

    const currentRecommendations = new Set(VscodeStandards.readExtensionsFile(root).recommendations ?? [])
    const missingRecommendations = expectedExtensionIds.filter((extensionId) => {

      return !currentRecommendations.has(extensionId)

    })

    const currentSettings = VscodeStandards.readSettingsFile(root)
    const missingSettings = expectedSettingKeys.filter((key) => {

      return JSON.stringify(currentSettings[key]) !== JSON.stringify(VSCODE_RECOMMENDED_SETTINGS[key as keyof typeof VSCODE_RECOMMENDED_SETTINGS])

    })

    return {
      missingRecommendations,
      missingSettings,
      ok: missingRecommendations.length === 0 && missingSettings.length === 0
    }

  }

  public static fix (root: string): VscodeFixResultEntity.Type {

    const {missingRecommendations, missingSettings} = VscodeStandards.check(root)

    if (missingRecommendations.length > 0) {

      const extensionsFile = VscodeStandards.readExtensionsFile(root)
      const recommendations = [
        ...new Set([
          ...extensionsFile.recommendations ?? [],
          ...missingRecommendations
        ])
      ]
      const extensionsPath = join(
        root,
        VSCODE_EXTENSIONS_FILE
      )

      mkdirSync(
        dirname(extensionsPath),
        {recursive: true}
      )
      AtomicWrite.write(
        extensionsPath,
        `${JSON.stringify(
          {...extensionsFile,
            recommendations},
          null,
          2
        )}\n`
      )

    }

    if (missingSettings.length > 0) {

      const settings = VscodeStandards.readSettingsFile(root)

      for (const key of missingSettings) {

        settings[key] = VSCODE_RECOMMENDED_SETTINGS[key as keyof typeof VSCODE_RECOMMENDED_SETTINGS]

      }

      const settingsPath = join(
        root,
        VSCODE_SETTINGS_FILE
      )

      mkdirSync(
        dirname(settingsPath),
        {recursive: true}
      )
      AtomicWrite.write(
        settingsPath,
        `${JSON.stringify(
          settings,
          null,
          2
        )}\n`
      )

    }

    return {addedRecommendations: missingRecommendations,
      addedSettings: missingSettings}

  }

  private static expectedExtensionIds (root: string): string[] {

    const extensionIds: string[] = []

    for (const rule of Object.values(VSCODE_EXTENSION_RECOMMENDATIONS)) {

      const configPresent = rule.configGlobs.some((glob) => {

        const exists = existsSync(join(
          root,
          glob
        ))
        return exists

      })

      if (configPresent) {

        extensionIds.push(rule.extensionId)

      }

    }

    return extensionIds

  }

  private static expectedSettingKeys (expectedExtensionIds: string[]): string[] {

    const hasFormatter = expectedExtensionIds.includes(VSCODE_EXTENSION_RECOMMENDATIONS.eslint.extensionId) || expectedExtensionIds.includes(VSCODE_EXTENSION_RECOMMENDATIONS.prettier.extensionId)

    return hasFormatter
      ? Object.keys(VSCODE_RECOMMENDED_SETTINGS)
      : []

  }

  private static readExtensionsFile (root: string): {recommendations?: string[]} {

    const filePath = join(
      root,
      VSCODE_EXTENSIONS_FILE
    )

    if (!existsSync(filePath)) {

      return {}

    }

    return JSON.parse(readFileSync(
      filePath,
      'utf8'
    )) as {recommendations?: string[]}

  }

  private static readSettingsFile (root: string): Record<string, unknown> {

    const filePath = join(
      root,
      VSCODE_SETTINGS_FILE
    )

    if (!existsSync(filePath)) {

      return {}

    }

    return JSON.parse(readFileSync(
      filePath,
      'utf8'
    )) as Record<string, unknown>

  }

}
