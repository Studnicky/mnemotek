import type {ValidateFunction} from 'ajv'
import type {FromSchema, JSONSchema} from 'json-schema-to-ts'

import {SchemaValidator} from '@studnicky/json'

export namespace BranchTypeEntity {
  export const Schema = {
    enum: [
      'bugfix',
      'build',
      'chore',
      'ci',
      'docs',
      'feature',
      'perf',
      'refactor',
      'test'
    ]
  } as const satisfies JSONSchema
  export type Type = FromSchema<typeof Schema>
  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema)
}
