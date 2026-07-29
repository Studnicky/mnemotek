import type {ValidateFunction} from 'ajv'
import type {FromSchema, JSONSchema} from 'json-schema-to-ts'

import {SchemaValidator} from '@studnicky/json'

export namespace RunRedactedResultEntity {
  export const Schema = {
    additionalProperties: false,
    properties: {
      bytesAfter: {type: 'number'},
      bytesBefore: {type: 'number'},
      bytesSaved: {type: 'number'},
      exitCode: {type: 'number'},
      output: {type: 'string'}
    },
    required: [
      'bytesAfter',
      'bytesBefore',
      'bytesSaved',
      'exitCode',
      'output'
    ],
    type: 'object'
  } as const satisfies JSONSchema
  export type Type = FromSchema<typeof Schema>
  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema)
}
