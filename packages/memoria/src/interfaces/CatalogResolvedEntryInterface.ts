import type {MemoriaCatalogDomainEntity, TextSchemaEntity} from '../entities/index.js'

export interface CatalogResolvedEntryInterface {
  readonly content: TextSchemaEntity.Type;
  readonly domain: MemoriaCatalogDomainEntity.Type;
  readonly name: TextSchemaEntity.Type;
}
