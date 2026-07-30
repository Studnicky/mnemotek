import {existsSync, readdirSync, readFileSync} from 'node:fs'
import {extname, join} from 'node:path'

import type {IssueTemplatesResultEntity} from '../entities/index.js'

import {ALTERNATE_FRONT_MATTER_KEYS, FRONT_MATTER_KEY_PATTERN, ISSUE_TEMPLATE_CONFIG_FILE_NAME, ISSUE_TEMPLATE_CONFIG_REFERENCE_PATTERN, ISSUE_TEMPLATE_DIR, ISSUE_TEMPLATE_EXTENSIONS, MARKDOWN_FRONT_MATTER_BLOCK_PATTERN, REQUIRED_FRONT_MATTER_KEYS} from './constants/ConfigStandardsConstants.js'

/*
 * config.yml is parsed with a minimal hand-rolled scan (only the reference-like
 * scalar values matter here) rather than a real YAML parser, keeping this package
 * dependency-free — no YAML library exists anywhere in the workspace yet.
 */
export class IssueTemplatesStandards {

  public static check (root: string): IssueTemplatesResultEntity.Type {

    const templateDir = join(
      root,
      ISSUE_TEMPLATE_DIR
    )

    if (!existsSync(templateDir)) {

      return {brokenReferences: [],
        missingFrontMatter: [],
        ok: true}

    }

    const brokenReferences = IssueTemplatesStandards.readConfigReferences(templateDir).filter((reference) => {

      return !existsSync(join(
        templateDir,
        reference
      ))

    })

    const missingFrontMatter = readdirSync(templateDir).filter((fileName) => {

      return fileName !== ISSUE_TEMPLATE_CONFIG_FILE_NAME && ISSUE_TEMPLATE_EXTENSIONS.has(extname(fileName)) && !IssueTemplatesStandards.hasRequiredFrontMatter(join(
        templateDir,
        fileName
      ))

    })

    return {
      brokenReferences,
      missingFrontMatter,
      ok: brokenReferences.length === 0 && missingFrontMatter.length === 0
    }

  }

  private static extractTopLevelKeys (content: string): Set<string> {

    const keys = new Set<string>()

    for (const match of content.matchAll(FRONT_MATTER_KEY_PATTERN)) {

      const [, key] = match

      if (key !== undefined) {

        keys.add(key)

      }

    }

    return keys

  }

  private static hasRequiredFrontMatter (filePath: string): boolean {

    const content = readFileSync(
      filePath,
      'utf8'
    )
    const frontMatterBlock = filePath.endsWith('.md')
      ? IssueTemplatesStandards.markdownFrontMatterBlock(content)
      : content

    const keys = IssueTemplatesStandards.extractTopLevelKeys(frontMatterBlock)
    const hasRequired = REQUIRED_FRONT_MATTER_KEYS.every((key) => {

      const hasKey = keys.has(key)
      return hasKey

    })
    const hasAlternate = ALTERNATE_FRONT_MATTER_KEYS.some((key) => {

      const hasKey = keys.has(key)
      return hasKey

    })

    return hasRequired && hasAlternate

  }

  private static markdownFrontMatterBlock (content: string): string {

    const match = MARKDOWN_FRONT_MATTER_BLOCK_PATTERN.exec(content)
    return match?.[1] ?? ''

  }

  private static readConfigReferences (templateDir: string): string[] {

    const configPath = join(
      templateDir,
      ISSUE_TEMPLATE_CONFIG_FILE_NAME
    )

    if (!existsSync(configPath)) {

      return []

    }

    const content = readFileSync(
      configPath,
      'utf8'
    )
    const references: string[] = []

    for (const match of content.matchAll(ISSUE_TEMPLATE_CONFIG_REFERENCE_PATTERN)) {

      const [, reference] = match

      if (reference !== undefined) {

        references.push(reference)

      }

    }

    return references

  }

}
