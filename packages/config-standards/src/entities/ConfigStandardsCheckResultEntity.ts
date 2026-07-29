import type {ValidateFunction} from 'ajv'
import type {FromSchema, JSONSchema} from 'json-schema-to-ts'

import {SchemaValidator} from '@studnicky/json'

import {StandardsCheckResultEntity} from './StandardsCheckResultEntity.js'

export namespace ConfigStandardsCheckResultEntity {
  export const Schema = {
    additionalProperties: false,
    properties: {
      gitignore: StandardsCheckResultEntity.Schema,
      packageJson: StandardsCheckResultEntity.Schema
    },
    required: [
      'gitignore',
      'packageJson'
    ],
    type: 'object'
  } as const satisfies JSONSchema
  export type Type = FromSchema<typeof Schema>
  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema)
}
