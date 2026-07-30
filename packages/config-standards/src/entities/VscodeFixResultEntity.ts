import type {ValidateFunction} from 'ajv'
import type {FromSchema, JSONSchema} from 'json-schema-to-ts'

import {SchemaValidator} from '@studnicky/json'

export namespace VscodeFixResultEntity {
  export const Schema = {
    additionalProperties: false,
    properties: {
      addedRecommendations: {items: {type: 'string'},
        type: 'array'},
      addedSettings: {items: {type: 'string'},
        type: 'array'}
    },
    required: [
      'addedRecommendations',
      'addedSettings'
    ],
    type: 'object'
  } as const satisfies JSONSchema
  export type Type = FromSchema<typeof Schema>
  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema)
}
