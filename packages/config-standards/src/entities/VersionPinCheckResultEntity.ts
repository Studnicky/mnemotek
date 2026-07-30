import type {ValidateFunction} from 'ajv'
import type {FromSchema, JSONSchema} from 'json-schema-to-ts'

import {SchemaValidator} from '@studnicky/json'

export namespace VersionPinCheckResultEntity {
  export const Schema = {
    additionalProperties: false,
    properties: {
      disagreements: {items: {additionalProperties: false,
        properties: {
          file: {type: 'string'},
          value: {type: 'string'}
        },
        required: [
          'file',
          'value'
        ],
        type: 'object'},
      type: 'array'},
      ok: {type: 'boolean'}
    },
    required: [
      'disagreements',
      'ok'
    ],
    type: 'object'
  } as const satisfies JSONSchema
  export type Type = FromSchema<typeof Schema>
  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema)
}
