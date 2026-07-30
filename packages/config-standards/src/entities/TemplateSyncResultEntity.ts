import type {ValidateFunction} from 'ajv'
import type {FromSchema, JSONSchema} from 'json-schema-to-ts'

import {SchemaValidator} from '@studnicky/json'

import {TemplateStalenessEntity} from './TemplateStalenessEntity.js'

export namespace TemplateSyncResultEntity {
  export const Schema = {
    additionalProperties: false,
    properties: {
      networkSkipped: {type: 'boolean'},
      ok: {type: 'boolean'},
      staleness: TemplateStalenessEntity.Schema
    },
    required: [
      'networkSkipped',
      'ok',
      'staleness'
    ],
    type: 'object'
  } as const satisfies JSONSchema
  export type Type = FromSchema<typeof Schema>
  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema)
}
