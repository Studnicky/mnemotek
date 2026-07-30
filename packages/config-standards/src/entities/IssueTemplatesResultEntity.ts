import type {ValidateFunction} from 'ajv'
import type {FromSchema, JSONSchema} from 'json-schema-to-ts'

import {SchemaValidator} from '@studnicky/json'

export namespace IssueTemplatesResultEntity {
  export const Schema = {
    additionalProperties: false,
    properties: {
      brokenReferences: {items: {type: 'string'},
        type: 'array'},
      missingFrontMatter: {items: {type: 'string'},
        type: 'array'},
      ok: {type: 'boolean'}
    },
    required: [
      'brokenReferences',
      'missingFrontMatter',
      'ok'
    ],
    type: 'object'
  } as const satisfies JSONSchema
  export type Type = FromSchema<typeof Schema>
  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema)
}
