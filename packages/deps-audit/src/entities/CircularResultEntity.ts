import type {ValidateFunction} from 'ajv'
import type {FromSchema, JSONSchema} from 'json-schema-to-ts'

import {SchemaValidator} from '@studnicky/json'

export namespace CircularResultEntity {
  export const Schema = {
    additionalProperties: false,
    properties: {
      cycleCount: {type: 'number'},
      cycles: {items: {items: {type: 'string'},
        type: 'array'},
      type: 'array'},
      ok: {type: 'boolean'}
    },
    required: [
      'cycleCount',
      'cycles',
      'ok'
    ],
    type: 'object'
  } as const satisfies JSONSchema
  export type Type = FromSchema<typeof Schema>
  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema)
}
