import type {ValidateFunction} from 'ajv'
import type {FromSchema, JSONSchema} from 'json-schema-to-ts'

import {SchemaValidator} from '@studnicky/json'

export namespace HostFactsEntity {
  export const Schema = {
    additionalProperties: false,
    properties: {
      arch: {type: 'string'},
      hostname: {type: 'string'},
      os: {type: 'string'}
    },
    required: [
      'arch',
      'hostname',
      'os'
    ],
    type: 'object'
  } as const satisfies JSONSchema
  export type Type = FromSchema<typeof Schema>
  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema)
}
