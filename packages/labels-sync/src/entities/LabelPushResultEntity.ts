import type {ValidateFunction} from 'ajv'
import type {FromSchema, JSONSchema} from 'json-schema-to-ts'

import {SchemaValidator} from '@studnicky/json'

export namespace LabelPushResultEntity {
  export const Schema = {
    additionalProperties: false,
    properties: {
      created: {
        items: {type: 'string'},
        type: 'array'
      },
      planned: {
        items: {type: 'string'},
        type: 'array'
      },
      repository: {type: 'string'}
    },
    required: [
      'created',
      'planned',
      'repository'
    ],
    type: 'object'
  } as const satisfies JSONSchema
  export type Type = FromSchema<typeof Schema>
  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema)
}
