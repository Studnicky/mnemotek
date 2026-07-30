import type {BooleanSchemaEntity, EntryFilterOverridesEntity, FilesystemPathEntity} from '../entities/index.js'

export interface ApplyEngineOptionsInterface {
  readonly dryRun: BooleanSchemaEntity.Type;
  readonly manifestPathInput: FilesystemPathEntity.Type;
  readonly overrides: EntryFilterOverridesEntity.Type;

  /**
   * Whether a seed-once entry's consumption is durably recorded via
   * ManifestStore.markConsumed. Defaults to true for real apply runs;
   * `verify` sets this false so its sandboxed run never mutates the real
   * manifest.json on disk, matching its documented isolation contract.
   */
  readonly trackConsumed?: BooleanSchemaEntity.Type;
}
