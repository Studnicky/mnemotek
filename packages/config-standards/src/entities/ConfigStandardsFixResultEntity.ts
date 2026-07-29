import type {ValidateFunction} from 'ajv'
import type {FromSchema, JSONSchema} from 'json-schema-to-ts'

import {SchemaValidator} from '@studnicky/json'

import {GitignoreFixResultEntity} from './GitignoreFixResultEntity.js'
import {PackageJsonFixResultEntity} from './PackageJsonFixResultEntity.js'

export namespace ConfigStandardsFixResultEntity {
  export const Schema = {
    additionalProperties: false,
    properties: {
      gitignore: GitignoreFixResultEntity.Schema,
      packageJson: PackageJsonFixResultEntity.Schema
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
