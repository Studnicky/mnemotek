import type {ValidateFunction} from 'ajv'
import type {FromSchema, JSONSchema} from 'json-schema-to-ts'

import {SchemaValidator} from '@studnicky/json'

export namespace CommitInfoEntity {
  export const Schema = {
    additionalProperties: false,
    properties: {
      hash: {type: 'string'},
      subject: {type: 'string'}
    },
    required: [
      'hash',
      'subject'
    ],
    type: 'object'
  } as const satisfies JSONSchema
  export type Type = FromSchema<typeof Schema>
  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema)
}
