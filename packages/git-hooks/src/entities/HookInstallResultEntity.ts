import type {ValidateFunction} from 'ajv'
import type {FromSchema, JSONSchema} from 'json-schema-to-ts'

import {SchemaValidator} from '@studnicky/json'

export namespace HookInstallResultEntity {
  export const Schema = {
    additionalProperties: false,
    properties: {
      hooksPath: {type: 'string'},
      installed: {items: {type: 'string'},
        type: 'array'}
    },
    required: [
      'hooksPath',
      'installed'
    ],
    type: 'object'
  } as const satisfies JSONSchema
  export type Type = FromSchema<typeof Schema>
  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema)
}
