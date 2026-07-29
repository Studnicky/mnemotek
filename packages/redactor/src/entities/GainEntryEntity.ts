import type {ValidateFunction} from 'ajv'
import type {FromSchema, JSONSchema} from 'json-schema-to-ts'

import {SchemaValidator} from '@studnicky/json'

export namespace GainEntryEntity {
  export const Schema = {
    additionalProperties: false,
    properties: {
      bytesAfter: {type: 'number'},
      bytesBefore: {type: 'number'},
      command: {type: 'string'},
      timestamp: {type: 'string'}
    },
    required: [
      'bytesAfter',
      'bytesBefore',
      'command',
      'timestamp'
    ],
    type: 'object'
  } as const satisfies JSONSchema
  export type Type = FromSchema<typeof Schema>
  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema)
}
