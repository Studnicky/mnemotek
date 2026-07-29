import type {ValidateFunction} from 'ajv'
import type {FromSchema, JSONSchema} from 'json-schema-to-ts'

import {SchemaValidator} from '@studnicky/json'

import {GainTopCommandEntity} from './GainTopCommandEntity.js'

export namespace GainSummaryEntity {
  export const Schema = {
    additionalProperties: false,
    properties: {
      entryCount: {type: 'number'},
      topCommands: {items: GainTopCommandEntity.Schema,
        type: 'array'},
      totalBytesAfter: {type: 'number'},
      totalBytesBefore: {type: 'number'},
      totalBytesSaved: {type: 'number'}
    },
    required: [
      'entryCount',
      'topCommands',
      'totalBytesAfter',
      'totalBytesBefore',
      'totalBytesSaved'
    ],
    type: 'object'
  } as const satisfies JSONSchema
  export type Type = FromSchema<typeof Schema>
  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema)
}
