import type {ValidateFunction} from 'ajv'
import type {FromSchema, JSONSchema} from 'json-schema-to-ts'

import {SchemaValidator} from '@studnicky/json'

export namespace DevcontainerResultEntity {
  export const Schema = {
    additionalProperties: false,
    properties: {
      ok: {type: 'boolean'},
      staleLock: {type: 'boolean'},
      unpinnedFeatures: {items: {type: 'string'},
        type: 'array'}
    },
    required: [
      'ok',
      'staleLock',
      'unpinnedFeatures'
    ],
    type: 'object'
  } as const satisfies JSONSchema
  export type Type = FromSchema<typeof Schema>
  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema)
}
