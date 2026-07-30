import {existsSync, readFileSync} from 'node:fs'
import {join} from 'node:path'

import type {VersionPinCheckResultEntity, VersionPinFixResultEntity} from '../entities/index.js'

import {AtomicWrite} from './atomicWrite.js'
import {TOOL_VERSIONS_NODE_LINE_PATTERN, TOOL_VERSIONS_NODE_VALUE_PATTERN, VERSION_PIN_FILES} from './constants/ConfigStandardsConstants.js'

const PACKAGE_JSON_ENGINES_LABEL = 'package.json#engines.node'

export class VersionPinStandards {

  public static check (root: string): VersionPinCheckResultEntity.Type {

    const versions = VersionPinStandards.readVersions(root)
    const distinctValues = new Set(Object.values(versions))

    if (distinctValues.size <= 1) {

      return {disagreements: [],
        ok: true}

    }

    const disagreements = Object.entries(versions).map(([
      file,
      value
    ]) => {

      return {file,
        value}

    })

    return {disagreements,
      ok: false}

  }

  public static fix (root: string, from?: string): VersionPinFixResultEntity.Type {

    const versions = VersionPinStandards.readVersions(root)
    const sourceLabel = from ?? Object.keys(versions)[0]

    if (sourceLabel === undefined) {

      return {propagated: []}

    }

    const sourceValue = versions[sourceLabel]

    if (sourceValue === undefined) {

      throw new Error(`VersionPinStandards.fix: no version source found for "${sourceLabel}".`)

    }

    const propagated: string[] = []

    for (const [
      label,
      value
    ] of Object.entries(versions)) {

      if (label === sourceLabel || value === sourceValue) {

        continue

      }

      VersionPinStandards.writeVersion(
        root,
        label,
        sourceValue
      )
      propagated.push(label)

    }

    return {propagated}

  }

  private static readToolVersionsNode (content: string): string | undefined {

    const match = TOOL_VERSIONS_NODE_VALUE_PATTERN.exec(content)
    return match?.[1]

  }

  private static readVersions (root: string): Record<string, string> {

    const versions: Record<string, string> = {}

    for (const fileName of VERSION_PIN_FILES) {

      const filePath = join(
        root,
        fileName
      )

      if (!existsSync(filePath)) {

        continue

      }

      const content = readFileSync(
        filePath,
        'utf8'
      ).trim()

      if (fileName === '.tool-versions') {

        const nodeVersion = VersionPinStandards.readToolVersionsNode(content)

        if (nodeVersion !== undefined) {

          versions[fileName] = nodeVersion

        }

        continue

      }

      if (content.length > 0) {

        versions[fileName] = content

      }

    }

    const packageJsonPath = join(
      root,
      'package.json'
    )

    if (existsSync(packageJsonPath)) {

      const packageData = JSON.parse(readFileSync(
        packageJsonPath,
        'utf8'
      )) as {engines?: {node?: string}}
      const nodeEngine = packageData.engines?.node

      if (nodeEngine !== undefined) {

        versions[PACKAGE_JSON_ENGINES_LABEL] = nodeEngine

      }

    }

    return versions

  }

  private static writeVersion (root: string, label: string, value: string): void {

    if (label === PACKAGE_JSON_ENGINES_LABEL) {

      const packageJsonPath = join(
        root,
        'package.json'
      )
      const packageData = JSON.parse(readFileSync(
        packageJsonPath,
        'utf8'
      )) as Record<string, unknown>
      const engines = (packageData.engines ?? {}) as Record<string, unknown>

      engines.node = value
      packageData.engines = engines

      AtomicWrite.write(
        packageJsonPath,
        `${JSON.stringify(
          packageData,
          null,
          2
        )}\n`
      )
      return

    }

    if (label === '.tool-versions') {

      const filePath = join(
        root,
        label
      )
      const existing = readFileSync(
        filePath,
        'utf8'
      )
      const hasNodeLine = TOOL_VERSIONS_NODE_LINE_PATTERN.test(existing)
      const updated = hasNodeLine
        ? existing.replace(
          TOOL_VERSIONS_NODE_LINE_PATTERN,
          `nodejs ${value}`
        )
        : `${existing}${existing.endsWith('\n') || existing.length === 0
          ? ''
          : '\n'}nodejs ${value}\n`

      AtomicWrite.write(
        filePath,
        updated
      )
      return

    }

    AtomicWrite.write(
      join(
        root,
        label
      ),
      `${value}\n`
    )

  }

}
