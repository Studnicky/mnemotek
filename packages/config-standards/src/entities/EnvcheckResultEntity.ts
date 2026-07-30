import type {ValidateFunction} from 'ajv'
import type {FromSchema, JSONSchema} from 'json-schema-to-ts'

import {SchemaValidator} from '@studnicky/json'

export namespace EnvcheckResultEntity {
  export const Schema = {
    additionalProperties: false,
    properties: {
      ok: {type: 'boolean'},
      undocumented: {items: {type: 'string'},
        type: 'array'},
      unused: {items: {type: 'string'},
        type: 'array'}
    },
    required: [
      'ok',
      'undocumented',
      'unused'
    ],
    type: 'object'
  } as const satisfies JSONSchema
  export type Type = FromSchema<typeof Schema>
  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema)
}
