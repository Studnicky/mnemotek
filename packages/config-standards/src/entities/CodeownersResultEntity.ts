import type {ValidateFunction} from 'ajv'
import type {FromSchema, JSONSchema} from 'json-schema-to-ts'

import {SchemaValidator} from '@studnicky/json'

export namespace CodeownersResultEntity {
  export const Schema = {
    additionalProperties: false,
    properties: {
      networkSkipped: {type: 'boolean'},
      ok: {type: 'boolean'},
      staleOwners: {items: {type: 'string'},
        type: 'array'},
      uncoveredPaths: {items: {type: 'string'},
        type: 'array'}
    },
    required: [
      'networkSkipped',
      'ok',
      'staleOwners',
      'uncoveredPaths'
    ],
    type: 'object'
  } as const satisfies JSONSchema
  export type Type = FromSchema<typeof Schema>
  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema)
}
