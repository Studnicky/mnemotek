import type {ValidateFunction} from 'ajv'
import type {FromSchema, JSONSchema} from 'json-schema-to-ts'

import {SchemaValidator} from '@studnicky/json'

export namespace LabelEntity {
  export const Schema = {
    additionalProperties: false,
    properties: {
      color: {type: 'string'},
      description: {type: 'string'},
      name: {type: 'string'}
    },
    required: [
      'color',
      'name'
    ],
    type: 'object'
  } as const satisfies JSONSchema
  export type Type = FromSchema<typeof Schema>
  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema)
}
