import type {MemoriaCatalogDomainEntity} from '../../entities/index.js'
import type {CatalogResolvedEntryInterface} from '../../interfaces/CatalogResolvedEntryInterface.js'

import {CATALOG_RESOURCES} from './constants/CatalogResourcesConstants.js'

/** Domain -> entries -> bundled resource content. No network fetch — resources ship in the npm package. */
export class CatalogRegistry {

  public static list (domain?: string): readonly string[] {

    const domains = domain !== undefined
      ? [domain]
      : Object.keys(CATALOG_RESOURCES)

    const entries: string[] = []

    for (const candidateDomain of domains) {

      const bucket = CatalogRegistry.bucketFor(candidateDomain)

      if (bucket === undefined) {

        continue

      }

      for (const name of Object.keys(bucket)) {

        entries.push(`${candidateDomain}/${name}`)

      }

    }

    return entries.sort()

  }

  /** `entry` is `domain/name` or `domain/name1,name2` (comma-separated names within one domain). */
  public static resolve (entry: string): readonly CatalogResolvedEntryInterface[] {

    const separatorIndex = entry.indexOf('/')

    if (separatorIndex < 0) {

      throw new Error(`Malformed catalog entry "${entry}", expected "domain/name".`)

    }

    const domain = entry.slice(
      0,
      separatorIndex
    )
    const namesPart = entry.slice(separatorIndex + 1)

    if (namesPart.length === 0) {

      throw new Error(`Malformed catalog entry "${entry}", expected "domain/name".`)

    }

    const bucket = CatalogRegistry.bucketFor(domain)

    if (bucket === undefined) {

      throw new Error(`Unknown catalog domain "${domain}".`)

    }

    const typedDomain = domain as MemoriaCatalogDomainEntity.Type

    return namesPart.split(',').map((name): CatalogResolvedEntryInterface => {

      const content = bucket[name]

      if (content === undefined) {

        throw new Error(`Unknown catalog entry "${domain}/${name}".`)

      }

      return {content,
        domain: typedDomain,
        name}

    })

  }

  private static bucketFor (domain: string): Record<string, string> | undefined {

    if (!(domain in CATALOG_RESOURCES)) {

      return undefined

    }

    const resources: Record<string, Record<string, string>> = CATALOG_RESOURCES
    const result = resources[domain]
    return result

  }

}
