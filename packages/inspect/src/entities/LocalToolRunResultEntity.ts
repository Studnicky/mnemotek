import type {ValidateFunction} from 'ajv'
import type {FromSchema, JSONSchema} from 'json-schema-to-ts'

import {SchemaValidator} from '@studnicky/json'

export namespace LocalToolRunResultEntity {
  export const Schema = {
    additionalProperties: false,
    properties: {
      exitCode: {type: 'number'},
      output: {type: 'string'},
      ran: {type: 'string'}
    },
    required: [
      'exitCode',
      'output',
      'ran'
    ],
    type: 'object'
  } as const satisfies JSONSchema
  export type Type = FromSchema<typeof Schema>
  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema)
}
