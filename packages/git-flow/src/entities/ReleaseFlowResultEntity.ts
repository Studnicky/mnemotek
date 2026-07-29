import type {ValidateFunction} from 'ajv'
import type {FromSchema, JSONSchema} from 'json-schema-to-ts'

import {SchemaValidator} from '@studnicky/json'

export namespace ReleaseFlowResultEntity {
  export const Schema = {
    additionalProperties: false,
    properties: {
      error: {type: 'string'},
      newVersion: {type: 'string'},
      previousVersion: {type: 'string'},
      releaseBranch: {type: 'string'},
      steps: {items: {type: 'string'},
        type: 'array'},
      tag: {type: 'string'}
    },
    required: [
      'newVersion',
      'releaseBranch',
      'steps',
      'tag'
    ],
    type: 'object'
  } as const satisfies JSONSchema
  export type Type = FromSchema<typeof Schema>
  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema)
}
