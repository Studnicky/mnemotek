import type {ValidateFunction} from 'ajv'
import type {FromSchema, JSONSchema} from 'json-schema-to-ts'

import {SchemaValidator} from '@studnicky/json'

export namespace MilestoneFlowResultEntity {
  export const Schema = {
    additionalProperties: false,
    properties: {
      committed: {type: 'boolean'},
      message: {type: 'string'}
    },
    required: [
      'committed',
      'message'
    ],
    type: 'object'
  } as const satisfies JSONSchema
  export type Type = FromSchema<typeof Schema>
  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema)
}
