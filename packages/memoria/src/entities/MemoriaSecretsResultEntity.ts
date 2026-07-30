import type {ValidateFunction} from 'ajv'
import type {FromSchema, JSONSchema} from 'json-schema-to-ts'

import {SchemaValidator} from '@studnicky/json'

import {MemoriaSecretsBrokerEntity} from './MemoriaSecretsBrokerEntity.js'

/**
 * Status-only: reports broker identity and session validity, never a resolved
 * secret value. If template-level secret interpolation is added later,
 * resolved values must never appear in `render`'s output or any result/error
 * payload — see the pitfalls table in docs/dotfile-tool-suggestions.md.
 */
export namespace MemoriaSecretsResultEntity {
  export const Schema = {
    additionalProperties: false,
    properties: {
      broker: MemoriaSecretsBrokerEntity.Schema,
      sessionValid: {type: 'boolean'}
    },
    required: [
      'broker',
      'sessionValid'
    ],
    type: 'object'
  } as const satisfies JSONSchema
  export type Type = FromSchema<typeof Schema>
  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema)
}
