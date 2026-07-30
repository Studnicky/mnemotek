import type {ValidateFunction} from 'ajv'
import type {FromSchema, JSONSchema} from 'json-schema-to-ts'

import {SchemaValidator} from '@studnicky/json'

import {LabelEntity} from './LabelEntity.js'

export namespace LabelPullResultEntity {
  export const Schema = {
    additionalProperties: false,
    properties: {
      labels: {
        items: LabelEntity.Schema,
        type: 'array'
      }
    },
    required: ['labels'],
    type: 'object'
  } as const satisfies JSONSchema
  export type Type = FromSchema<typeof Schema>
  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema)
}
