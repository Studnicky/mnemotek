import type {ValidateFunction} from 'ajv'
import type {FromSchema, JSONSchema} from 'json-schema-to-ts'

import {SchemaValidator} from '@studnicky/json'

export namespace MemoriaManifestEntryEntity {
  export const Schema = {
    additionalProperties: false,
    properties: {
      host: {items: {type: 'string'},
        type: 'array'},
      mode: {enum: [
        'copy',
        'link'
      ],
      type: 'string'},
      os: {items: {type: 'string'},
        type: 'array'},
      seedOnce: {type: 'boolean'},
      source: {type: 'string'},
      target: {type: 'string'}
    },
    required: [
      'mode',
      'source',
      'target'
    ],
    type: 'object'
  } as const satisfies JSONSchema
  export type Type = FromSchema<typeof Schema>
  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema)
}
