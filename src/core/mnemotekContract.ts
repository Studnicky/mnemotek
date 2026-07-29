import type {BooleanSchemaEntity} from '../entities/BooleanSchemaEntity.js'
import type {CommandDescriptionEntity} from '../entities/CommandDescriptionEntity.js'
import type {CommandNameEntity} from '../entities/CommandNameEntity.js'
import type {CommandPayloadEntity} from '../entities/CommandPayloadEntity.js'
import type {CommandResultEntity} from '../entities/CommandResultEntity.js'
import type {SchemaObjectInterface} from './SchemaObjectInterface.js'

export namespace mnemotekContract {
  export interface CommandDescriptorInterface {
    readonly description: CommandDescriptionEntity.Type;
    readonly name: CommandNameEntity.Type;
    readonly resultSchema: SchemaObjectInterface | undefined;
    readonly runner: CommandRunnerInterface | undefined;
    readonly runnerSchema?: SchemaObjectInterface;
    readonly schema: SchemaObjectInterface | undefined;
  }

  export interface CommandRegistrationInterface {
    readonly description: CommandDescriptionEntity.Type;
    readonly name: CommandNameEntity.Type;
    readonly resultSchema?: SchemaObjectInterface;
    readonly runner?: CommandRunnerInterface;
    readonly schema?: SchemaObjectInterface;
  }

  export interface CommandRunnerInterface {
    (payload: CommandPayloadEntity.Type): CommandResultEntity.Type | Promise<CommandResultEntity.Type | undefined> | undefined;
    readonly contractMarker?: never;
  }

  export interface ManifestCommandInterface {
    readonly description: CommandDescriptionEntity.Type;
    readonly hasResultSchema: BooleanSchemaEntity.Type;
    readonly hasRunner: BooleanSchemaEntity.Type;
    readonly inputSchema: SchemaObjectInterface | undefined;
    readonly name: CommandNameEntity.Type;
    readonly resultSchema: SchemaObjectInterface | undefined;
    readonly subcommands: readonly unknown[];
  }

  export interface SkillManifestCommandInterface {
    readonly description: CommandDescriptionEntity.Type;
    readonly name: CommandNameEntity.Type;
    readonly resultSchema: SchemaObjectInterface | undefined;
    readonly schema: SchemaObjectInterface | undefined;
    readonly subcommands: readonly unknown[];
  }
}
