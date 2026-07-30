import type {ValidateFunction} from 'ajv'
import type {FromSchema, JSONSchema} from 'json-schema-to-ts'

import {SchemaValidator} from '@studnicky/json'

export namespace MemoriaStatusResultEntity {
  export const Schema = {
    additionalProperties: false,
    properties: {
      managed: {items: {type: 'string'},
        type: 'array'},
      missing: {items: {type: 'string'},
        type: 'array'},
      unmanaged: {items: {type: 'string'},
        type: 'array'}
    },
    required: [
      'managed',
      'missing',
      'unmanaged'
    ],
    type: 'object'
  } as const satisfies JSONSchema
  export type Type = FromSchema<typeof Schema>
  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema)
}
