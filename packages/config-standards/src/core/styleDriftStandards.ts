import {existsSync, readFileSync} from 'node:fs'
import {join} from 'node:path'

import type {StyleDriftCheckResultEntity} from '../entities/index.js'

import {EDITORCONFIG_INDENT_SIZE_PATTERN, EDITORCONFIG_INDENT_STYLE_PATTERN, ESLINT_CONFIG_FILES, PRETTIER_CONFIG_FILES} from './constants/ConfigStandardsConstants.js'

/*
 * Only JSON-shaped config files are parsed (.editorconfig's ini-like format, and
 * .json/extension-less variants of .prettierrc/.eslintrc). JS/CJS/MJS config files
 * would require executing arbitrary code to read, which is out of scope for a
 * read-only drift check — a documented v1 limitation, not an oversight.
 */
export class StyleDriftStandards {

  public static check (root: string): StyleDriftCheckResultEntity.Type {

    const sourcesByFile: Record<string, {indentSize?: number;
      indentStyle?: 'space' | 'tab';
      quoteStyle?: 'double' | 'single';}> = {
      '.editorconfig': StyleDriftStandards.readEditorconfig(root),
      eslint: StyleDriftStandards.readEslintConfig(root),
      prettier: StyleDriftStandards.readPrettierConfig(root)
    }

    const fieldNames = [
      'indentSize',
      'indentStyle',
      'quoteStyle'
    ] as const
    const conflicts: StyleDriftCheckResultEntity.Type['conflicts'] = []

    for (const field of fieldNames) {

      const sources: Record<string, unknown> = {}

      for (const [
        fileName,
        fields
      ] of Object.entries(sourcesByFile)) {

        if (fields[field] !== undefined) {

          sources[fileName] = fields[field]

        }

      }

      if (new Set(Object.values(sources)).size > 1) {

        conflicts.push({field,
          sources})

      }

    }

    return {conflicts,
      ok: conflicts.length === 0}

  }

  private static readEditorconfig (root: string): {indentSize?: number;
    indentStyle?: 'space' | 'tab';
    quoteStyle?: 'double' | 'single';} {

    const filePath = join(
      root,
      '.editorconfig'
    )

    if (!existsSync(filePath)) {

      return {}

    }

    const content = readFileSync(
      filePath,
      'utf8'
    )
    const fields: {indentSize?: number;
      indentStyle?: 'space' | 'tab';
      quoteStyle?: 'double' | 'single';} = {}
    const indentStyleMatch = EDITORCONFIG_INDENT_STYLE_PATTERN.exec(content)
    const indentSizeMatch = EDITORCONFIG_INDENT_SIZE_PATTERN.exec(content)

    if (indentStyleMatch?.[1] === 'space' || indentStyleMatch?.[1] === 'tab') {

      fields.indentStyle = indentStyleMatch[1]

    }

    if (indentSizeMatch?.[1] !== undefined) {

      fields.indentSize = Number(indentSizeMatch[1])

    }

    return fields

  }

  private static readEslintConfig (root: string): {indentSize?: number;
    indentStyle?: 'space' | 'tab';
    quoteStyle?: 'double' | 'single';} {

    const config = StyleDriftStandards.readFirstJsonFile(
      root,
      ESLINT_CONFIG_FILES
    )

    if (config === undefined) {

      return {}

    }

    const rules = (config.rules ?? {}) as Record<string, unknown>
    const fields: {indentSize?: number;
      indentStyle?: 'space' | 'tab';
      quoteStyle?: 'double' | 'single';} = {}
    const indentRule = rules.indent

    if (Array.isArray(indentRule)) {

      const [, indentValue] = indentRule

      if (indentValue === 'tab') {

        fields.indentStyle = 'tab'

      } else if (typeof indentValue === 'number') {

        fields.indentStyle = 'space'
        fields.indentSize = indentValue

      }

    }

    const quotesRule = rules.quotes

    if (Array.isArray(quotesRule)) {

      const [, quoteValue] = quotesRule

      if (quoteValue === 'single' || quoteValue === 'double') {

        fields.quoteStyle = quoteValue

      }

    }

    return fields

  }

  private static readFirstJsonFile (root: string, fileNames: readonly string[]): Record<string, unknown> | undefined {

    for (const fileName of fileNames) {

      const filePath = join(
        root,
        fileName
      )

      if (!existsSync(filePath)) {

        continue

      }

      const parsed = StyleDriftStandards.tryParseJsonFile(filePath)

      if (parsed !== undefined) {

        return parsed

      }

    }

    return undefined

  }

  private static readPrettierConfig (root: string): {indentSize?: number;
    indentStyle?: 'space' | 'tab';
    quoteStyle?: 'double' | 'single';} {

    const config = StyleDriftStandards.readFirstJsonFile(
      root,
      PRETTIER_CONFIG_FILES
    )

    if (config === undefined) {

      return {}

    }

    const fields: {indentSize?: number;
      indentStyle?: 'space' | 'tab';
      quoteStyle?: 'double' | 'single';} = {}

    if (typeof config.useTabs === 'boolean') {

      fields.indentStyle = config.useTabs
        ? 'tab'
        : 'space'

    }

    if (typeof config.tabWidth === 'number') {

      fields.indentSize = config.tabWidth

    }

    if (typeof config.singleQuote === 'boolean') {

      fields.quoteStyle = config.singleQuote
        ? 'single'
        : 'double'

    }

    return fields

  }

  private static tryParseJsonFile (filePath: string): Record<string, unknown> | undefined {

    try {

      return JSON.parse(readFileSync(
        filePath,
        'utf8'
      )) as Record<string, unknown>

    } catch {

      return undefined

    }

  }

}
