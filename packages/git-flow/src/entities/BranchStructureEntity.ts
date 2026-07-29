import type {ValidateFunction} from 'ajv'
import type {FromSchema, JSONSchema} from 'json-schema-to-ts'

import {SchemaValidator} from '@studnicky/json'

export namespace BranchStructureEntity {
  export const Schema = {
    additionalProperties: false,
    properties: {
      current: {type: 'string'},
      development: {type: 'string'},
      production: {type: 'string'}
    },
    required: [
      'current',
      'production'
    ],
    type: 'object'
  } as const satisfies JSONSchema
  export type Type = FromSchema<typeof Schema>
  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema)
}
