import type {HostFactsEntity} from '../entities/index.js'

import {TEMPLATE_RENDERER_PATTERNS} from './constants/TemplateRendererConstants.js'

/** `{{ dotted.path }}` substitution only — no conditionals, no loops. */
export class TemplateRenderer {

  public static render (template: string, data: Record<string, unknown>, host: HostFactsEntity.Type): string {

    const result = template.replace(
      TEMPLATE_RENDERER_PATTERNS.TOKEN,
      (_match: string, path: string): string => {

        const fromData = TemplateRenderer.resolvePath(
          data,
          path
        )

        if (fromData !== undefined) {

          return TemplateRenderer.toRenderedText(
            fromData,
            path
          )

        }

        const fromHost = TemplateRenderer.resolvePath(
          {host},
          path
        )

        if (fromHost !== undefined) {

          return TemplateRenderer.toRenderedText(
            fromHost,
            path
          )

        }

        throw new Error(`Unresolved template token "{{ ${path} }}": not found in manifest data or host facts.`)

      }
    )
    return result

  }

  private static resolvePath (source: Record<string, unknown>, path: string): unknown {

    let current: unknown = source

    for (const segment of path.split('.')) {

      if (typeof current !== 'object' || current === null || !(segment in current)) {

        return undefined

      }

      current = (current as Record<string, unknown>)[segment]

    }

    return current

  }

  private static toRenderedText (value: unknown, path: string): string {

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {

      const result = String(value)
      return result

    }

    throw new Error(`Template token "{{ ${path} }}" resolved to a non-primitive value and cannot be rendered.`)

  }

}
