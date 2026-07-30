import type {ValidateFunction} from 'ajv'
import type {FromSchema, JSONSchema} from 'json-schema-to-ts'

import {SchemaValidator} from '@studnicky/json'

export namespace MemoriaApplyResultEntity {
  export const Schema = {
    additionalProperties: false,
    properties: {
      adopted: {items: {type: 'string'},
        type: 'array'},
      consumed: {items: {type: 'string'},
        type: 'array'},
      preview: {description: 'Exact content about to be written, when the caller should review it before it lands (e.g. catalog apply). Absent when there is nothing to preview.',
        items: {type: 'string'},
        type: 'array'},
      skipped: {items: {type: 'string'},
        type: 'array'},
      written: {items: {type: 'string'},
        type: 'array'}
    },
    required: [
      'adopted',
      'consumed',
      'skipped',
      'written'
    ],
    type: 'object'
  } as const satisfies JSONSchema
  export type Type = FromSchema<typeof Schema>
  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema)
}
