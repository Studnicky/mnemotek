import type {ValidateFunction} from 'ajv'
import type {FromSchema, JSONSchema} from 'json-schema-to-ts'

import {SchemaValidator} from '@studnicky/json'

import {CodeownersResultEntity} from './CodeownersResultEntity.js'
import {DevcontainerResultEntity} from './DevcontainerResultEntity.js'
import {EnvcheckResultEntity} from './EnvcheckResultEntity.js'
import {IssueTemplatesResultEntity} from './IssueTemplatesResultEntity.js'
import {PrettierCheckResultEntity} from './PrettierCheckResultEntity.js'
import {StandardsCheckResultEntity} from './StandardsCheckResultEntity.js'
import {StyleDriftCheckResultEntity} from './StyleDriftCheckResultEntity.js'
import {TemplateSyncResultEntity} from './TemplateSyncResultEntity.js'
import {VersionPinCheckResultEntity} from './VersionPinCheckResultEntity.js'
import {VscodeCheckResultEntity} from './VscodeCheckResultEntity.js'

export namespace ConfigStandardsCheckResultEntity {
  export const Schema = {
    additionalProperties: false,
    properties: {
      codeowners: CodeownersResultEntity.Schema,
      devcontainer: DevcontainerResultEntity.Schema,
      editorconfig: StandardsCheckResultEntity.Schema,
      envcheck: EnvcheckResultEntity.Schema,
      gitignore: StandardsCheckResultEntity.Schema,
      issueTemplates: IssueTemplatesResultEntity.Schema,
      packageJson: StandardsCheckResultEntity.Schema,
      prettier: PrettierCheckResultEntity.Schema,
      styleDrift: StyleDriftCheckResultEntity.Schema,
      templateSync: TemplateSyncResultEntity.Schema,
      versionPin: VersionPinCheckResultEntity.Schema,
      vscode: VscodeCheckResultEntity.Schema
    },
    required: [
      'codeowners',
      'devcontainer',
      'editorconfig',
      'envcheck',
      'gitignore',
      'issueTemplates',
      'packageJson',
      'prettier',
      'styleDrift',
      'templateSync',
      'versionPin',
      'vscode'
    ],
    type: 'object'
  } as const satisfies JSONSchema
  export type Type = FromSchema<typeof Schema>
  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema)
}
