import type {ValidateFunction} from 'ajv'
import type {FromSchema, JSONSchema} from 'json-schema-to-ts'

import {SchemaValidator} from '@studnicky/json'

export namespace CommitMessageValidationEntity {
  export const Schema = {
    additionalProperties: false,
    properties: {
      exempt: {type: 'boolean'},
      scope: {type: 'string'},
      subject: {type: 'string'},
      type: {type: 'string'},
      valid: {type: 'boolean'}
    },
    required: [
      'exempt',
      'subject',
      'valid'
    ],
    type: 'object'
  } as const satisfies JSONSchema
  export type Type = FromSchema<typeof Schema>
  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema)
}
