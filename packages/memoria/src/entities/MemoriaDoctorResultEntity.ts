import type {ValidateFunction} from 'ajv'
import type {FromSchema, JSONSchema} from 'json-schema-to-ts'

import {SchemaValidator} from '@studnicky/json'

import {MemoriaDoctorCheckResultEntity} from './MemoriaDoctorCheckResultEntity.js'

export namespace MemoriaDoctorResultEntity {
  export const Schema = {
    additionalProperties: false,
    properties: {
      results: {items: MemoriaDoctorCheckResultEntity.Schema,
        type: 'array'}
    },
    required: ['results'],
    type: 'object'
  } as const satisfies JSONSchema
  export type Type = FromSchema<typeof Schema>
  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema)
}
