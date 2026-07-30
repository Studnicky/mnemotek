import type {FilesystemPathEntity} from '../entities/index.js'

export interface DoctorCheckContextInterface {
  readonly homeRoot: FilesystemPathEntity.Type;
  readonly rcPaths: readonly string[];
}
