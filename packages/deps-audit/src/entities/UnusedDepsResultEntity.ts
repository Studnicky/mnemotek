import type {ValidateFunction} from 'ajv'
import type {FromSchema, JSONSchema} from 'json-schema-to-ts'

import {SchemaValidator} from '@studnicky/json'

export namespace UnusedDepsResultEntity {
  export const Schema = {
    additionalProperties: false,
    properties: {
      ok: {type: 'boolean'},
      unused: {items: {type: 'string'},
        type: 'array'},
      unusedCount: {type: 'number'}
    },
    required: [
      'ok',
      'unused',
      'unusedCount'
    ],
    type: 'object'
  } as const satisfies JSONSchema
  export type Type = FromSchema<typeof Schema>
  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema)
}
