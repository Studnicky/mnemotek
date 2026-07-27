import type {TextSchemaEntity} from '../entities/TextSchemaEntity.js'

export interface SchemaObjectInterface extends Record<string, unknown> {
  readonly additionalProperties?: boolean | SchemaObjectInterface;
  readonly default?: unknown;
  readonly description?: TextSchemaEntity.Type;
  readonly enum?: readonly unknown[];
  readonly items?: readonly SchemaObjectInterface[] | SchemaObjectInterface;
  readonly properties?: Record<string, SchemaObjectInterface>;
  readonly required?: readonly string[];
  readonly type?: readonly string[] | string;
}
