import type {ValidateFunction} from 'ajv'
import type {FromSchema, JSONSchema} from 'json-schema-to-ts'

import {SchemaValidator} from '@studnicky/json'

export namespace MemoriaDoctorCheckResultEntity {
  export const Schema = {
    additionalProperties: false,
    properties: {
      check: {type: 'string'},
      findings: {items: {type: 'string'},
        type: 'array'},
      ok: {type: 'boolean'}
    },
    required: [
      'check',
      'findings',
      'ok'
    ],
    type: 'object'
  } as const satisfies JSONSchema
  export type Type = FromSchema<typeof Schema>
  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema)
}
