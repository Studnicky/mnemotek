import type {FilesystemPathEntity, MemoriaManifestEntryEntity} from '../entities/index.js'

export interface LinkPlanEntryInterface {
  readonly entry: MemoriaManifestEntryEntity.Type;
  readonly mode: MemoriaManifestEntryEntity.Type['mode'];
  readonly resolvedSource: FilesystemPathEntity.Type;
  readonly resolvedTarget: FilesystemPathEntity.Type;
}
