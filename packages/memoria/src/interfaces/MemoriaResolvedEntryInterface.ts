import type {FilesystemPathEntity, MemoriaManifestEntryEntity} from '../entities/index.js'

export interface MemoriaResolvedEntryInterface {
  readonly entry: MemoriaManifestEntryEntity.Type;
  readonly resolvedTarget: FilesystemPathEntity.Type;
}
