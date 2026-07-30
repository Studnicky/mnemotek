import type {ValidateFunction} from 'ajv'
import type {FromSchema, JSONSchema} from 'json-schema-to-ts'

import {SchemaValidator} from '@studnicky/json'

export namespace StyleDriftCheckResultEntity {
  export const Schema = {
    additionalProperties: false,
    properties: {
      conflicts: {items: {additionalProperties: false,
        properties: {
          field: {type: 'string'},
          sources: {type: 'object'}
        },
        required: [
          'field',
          'sources'
        ],
        type: 'object'},
      type: 'array'},
      ok: {type: 'boolean'}
    },
    required: [
      'conflicts',
      'ok'
    ],
    type: 'object'
  } as const satisfies JSONSchema
  export type Type = FromSchema<typeof Schema>
  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema)
}
