import type {ValidateFunction} from 'ajv'
import type {FromSchema, JSONSchema} from 'json-schema-to-ts'

import {SchemaValidator} from '@studnicky/json'

export namespace VscodeCheckResultEntity {
  export const Schema = {
    additionalProperties: false,
    properties: {
      missingRecommendations: {items: {type: 'string'},
        type: 'array'},
      missingSettings: {items: {type: 'string'},
        type: 'array'},
      ok: {type: 'boolean'}
    },
    required: [
      'missingRecommendations',
      'missingSettings',
      'ok'
    ],
    type: 'object'
  } as const satisfies JSONSchema
  export type Type = FromSchema<typeof Schema>
  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema)
}
