import type {ValidateFunction} from 'ajv'
import type {FromSchema, JSONSchema} from 'json-schema-to-ts'

import {SchemaValidator} from '@studnicky/json'

export namespace CommandResultEntity {
  export const Schema = {
    anyOf: [
      {additionalProperties: true,
        type: 'object'},
      {items: {type: 'string'},
        type: 'array'},
      {type: 'boolean'},
      {type: 'null'},
      {type: 'number'},
      {type: 'string'}
    ]
  } as const satisfies JSONSchema
  export type Type = FromSchema<typeof Schema>
  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema)
}
