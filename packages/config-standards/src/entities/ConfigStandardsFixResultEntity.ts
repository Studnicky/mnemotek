import type {ValidateFunction} from 'ajv'
import type {FromSchema, JSONSchema} from 'json-schema-to-ts'

import {SchemaValidator} from '@studnicky/json'

import {EditorconfigFixResultEntity} from './EditorconfigFixResultEntity.js'
import {GitignoreFixResultEntity} from './GitignoreFixResultEntity.js'
import {PackageJsonFixResultEntity} from './PackageJsonFixResultEntity.js'
import {PrettierFixResultEntity} from './PrettierFixResultEntity.js'
import {VersionPinFixResultEntity} from './VersionPinFixResultEntity.js'
import {VscodeFixResultEntity} from './VscodeFixResultEntity.js'

export namespace ConfigStandardsFixResultEntity {
  export const Schema = {
    additionalProperties: false,
    properties: {
      editorconfig: EditorconfigFixResultEntity.Schema,
      gitignore: GitignoreFixResultEntity.Schema,
      packageJson: PackageJsonFixResultEntity.Schema,
      prettier: PrettierFixResultEntity.Schema,
      versionPin: VersionPinFixResultEntity.Schema,
      vscode: VscodeFixResultEntity.Schema
    },
    required: [
      'editorconfig',
      'gitignore',
      'packageJson',
      'prettier',
      'versionPin',
      'vscode'
    ],
    type: 'object'
  } as const satisfies JSONSchema
  export type Type = FromSchema<typeof Schema>
  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema)
}
