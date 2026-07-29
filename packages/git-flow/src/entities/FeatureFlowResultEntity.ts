import type {ValidateFunction} from 'ajv'
import type {FromSchema, JSONSchema} from 'json-schema-to-ts'

import {SchemaValidator} from '@studnicky/json'

import {CommitInfoEntity} from './CommitInfoEntity.js'

export namespace FeatureFlowResultEntity {
  export const Schema = {
    additionalProperties: false,
    properties: {
      branch: {type: 'string'},
      commits: {items: CommitInfoEntity.Schema,
        type: 'array'},
      error: {type: 'string'},
      mode: {type: 'string'},
      prUrl: {type: 'string'},
      pushed: {type: 'boolean'},
      targetBranch: {type: 'string'}
    },
    required: [
      'branch',
      'commits',
      'mode',
      'pushed',
      'targetBranch'
    ],
    type: 'object'
  } as const satisfies JSONSchema
  export type Type = FromSchema<typeof Schema>
  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema)
}
