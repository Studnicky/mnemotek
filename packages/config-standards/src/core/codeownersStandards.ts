import {existsSync, readFileSync} from 'node:fs'
import {join} from 'node:path'

import type {CodeownersResultEntity} from '../entities/index.js'

import {CODEOWNERS_LINE_SPLIT_PATTERN, GLOB_SPECIAL_CHARACTER_PATTERN} from './constants/ConfigStandardsConstants.js'
import {ExecCliTool} from './execCliTool.js'

const CODEOWNERS_CANDIDATE_PATHS = [
  '.github/CODEOWNERS',
  'CODEOWNERS',
  'docs/CODEOWNERS'
] as const

export class CodeownersStandards {

  public static check (root: string, options: {networked?: boolean} = {}): CodeownersResultEntity.Type {

    const networked = options.networked ?? false
    const rules = CodeownersStandards.readRules(root)
    const trackedFiles = ExecCliTool.run(
      'git',
      ['ls-files'],
      {allowFail: true,
        cwd: root}
    ).split('\n').
      filter((line) => {

        return line.length > 0

      })

    const uncoveredPaths = trackedFiles.filter((filePath) => {

      return !rules.some((rule) => {

        const matches = rule.pattern.test(filePath)
        return matches

      })

    })

    const ghAuthenticated = networked && CodeownersStandards.isGhAuthenticated()
    const staleOwners = ghAuthenticated
      ? CodeownersStandards.findStaleOwners(rules)
      : []

    return {
      networkSkipped: !ghAuthenticated,
      ok: uncoveredPaths.length === 0 && staleOwners.length === 0,
      staleOwners,
      uncoveredPaths
    }

  }

  private static findStaleOwners (rules: ReadonlyArray<{owners: string[];
    pattern: RegExp;}>): string[] {

    const owners = new Set(rules.flatMap((rule) => {

      const ruleOwners = rule.owners
      return ruleOwners

    }))
    const stale: string[] = []

    for (const owner of owners) {

      if (!owner.startsWith('@')) {

        continue

      }

      const handle = owner.slice(1)
      const exists = handle.includes('/')
        ? CodeownersStandards.teamExists(handle)
        : CodeownersStandards.userExists(handle)

      if (!exists) {

        stale.push(owner)

      }

    }

    return stale

  }

  private static globToRegExp (pattern: string): RegExp {

    let normalized = pattern
    const anchored = normalized.startsWith('/')

    if (anchored) {

      normalized = normalized.slice(1)

    }

    const isDirectory = normalized.endsWith('/')
    let source = ''
    const normalizedLength = normalized.length

    for (let index = 0; index < normalizedLength; index += 1) {

      const char = normalized[index]

      if (char === '*' && normalized[index + 1] === '*') {

        source += '.*'
        index += 1
        continue

      }

      if (char === '*') {

        source += '[^/]*'
        continue

      }

      if (char === '?') {

        source += '[^/]'
        continue

      }

      source += char?.replace(
        GLOB_SPECIAL_CHARACTER_PATTERN,
        '\\$&'
      ) ?? ''

    }

    const prefix = anchored
      ? '^'
      : '^(?:.*/)?'
    const suffix = isDirectory
      ? '(?:/.*)?$'
      : '$'

    return new RegExp(
      `${prefix}${source}${suffix}`,
      'u'
    )

  }

  private static isGhAuthenticated (): boolean {

    return ExecCliTool.run(
      'gh',
      CodeownersStandards.toArgumentList(
        'auth',
        'status'
      ),
      {allowFail: true}
    ).length > 0

  }

  private static readRules (root: string): Array<{owners: string[];
    pattern: RegExp;}> {

    const filePath = CODEOWNERS_CANDIDATE_PATHS.
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

      return []

    }

    const content = readFileSync(
      filePath,
      'utf8'
    )
    const rules: Array<{owners: string[];
      pattern: RegExp;}> = []

    for (const rawLine of content.split('\n')) {

      const line = rawLine.trim()

      if (line.length === 0 || line.startsWith('#')) {

        continue

      }

      const [
        pattern,
        ...owners
      ] = line.split(CODEOWNERS_LINE_SPLIT_PATTERN)

      rules.push({owners,
        pattern: CodeownersStandards.globToRegExp(pattern ?? '')})

    }

    return rules

  }

  private static teamExists (handle: string): boolean {

    const [
      org,
      team
    ] = handle.split('/')
    return ExecCliTool.run(
      'gh',
      CodeownersStandards.toArgumentList(
        'api',
        `orgs/${org ?? ''}/teams/${team ?? ''}`
      ),
      {allowFail: true}
    ).length > 0

  }

  private static toArgumentList (...parts: string[]): string[] {

    const result = parts
    return result

  }

  private static userExists (username: string): boolean {

    return ExecCliTool.run(
      'gh',
      CodeownersStandards.toArgumentList(
        'api',
        `users/${username}`
      ),
      {allowFail: true}
    ).length > 0

  }

}
