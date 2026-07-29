import type {ValidateFunction} from 'ajv'
import type {FromSchema, JSONSchema} from 'json-schema-to-ts'

import {SchemaValidator} from '@studnicky/json'

export namespace GainTopCommandEntity {
  export const Schema = {
    additionalProperties: false,
    properties: {
      bytesSaved: {type: 'number'},
      command: {type: 'string'}
    },
    required: [
      'bytesSaved',
      'command'
    ],
    type: 'object'
  } as const satisfies JSONSchema
  export type Type = FromSchema<typeof Schema>
  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema)
}
