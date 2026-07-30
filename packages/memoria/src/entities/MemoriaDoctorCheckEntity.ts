import type {ValidateFunction} from 'ajv'
import type {FromSchema, JSONSchema} from 'json-schema-to-ts'

import {SchemaValidator} from '@studnicky/json'

export namespace MemoriaDoctorCheckEntity {
  export const Schema = {
    enum: [
      'archive-tools',
      'envrc-audit',
      'rc-hygiene',
      'secrets-scan',
      'startup-profile'
    ]
  } as const satisfies JSONSchema
  export type Type = FromSchema<typeof Schema>
  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema)
}
