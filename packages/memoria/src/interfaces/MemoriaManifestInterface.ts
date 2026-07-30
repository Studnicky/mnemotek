import type {FilesystemPathEntity} from '../entities/index.js'
import type {MemoriaResolvedEntryInterface} from './MemoriaResolvedEntryInterface.js'

export interface MemoriaManifestInterface {
  readonly consumed: ReadonlySet<string>;
  readonly data: Record<string, unknown>;
  readonly entries: readonly MemoriaResolvedEntryInterface[];
  readonly homeRoot: FilesystemPathEntity.Type;
  readonly manifestDir: FilesystemPathEntity.Type;
  readonly manifestPath: FilesystemPathEntity.Type;
  readonly watchGlobs: readonly string[];
}
