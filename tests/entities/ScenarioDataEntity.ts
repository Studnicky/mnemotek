import type {ValidateFunction} from 'ajv'
import type {FromSchema, JSONSchema} from 'json-schema-to-ts'

import {SchemaValidator} from '@studnicky/json'

export namespace ScenarioDataEntity {
  export const Schema = {
    additionalProperties: true,
    properties: {
      appName: {type: 'string'},
      arguments: {additionalProperties: true,
        type: 'object'},
      argv: {items: {type: 'string'},
        type: 'array'},
      autoConfig: {additionalProperties: true,
        type: 'object'},
      cliConfigContent: {additionalProperties: true,
        type: 'object'},
      cliConfigPath: {type: 'string'},
      commandLineArguments: {additionalProperties: true,
        type: 'object'},
      commandName: {type: 'string'},
      commands: {
        items: {
          additionalProperties: true,
          properties: {
            description: {type: 'string'},
            hasResultSchema: {type: 'boolean'},
            hasRunner: {type: 'boolean'},
            name: {type: 'string'}
          },
          type: 'object'
        },
        type: 'array'
      },
      configFile: {additionalProperties: true,
        type: 'object'},
      description: {type: 'string'},
      envContent: {type: 'string'},
      envOverrides: {additionalProperties: true,
        type: 'object'},
      expectedCommandCount: {type: 'number'},
      expectedCount: {type: 'number'},
      expectedIsError: {type: 'boolean'},
      expectedLength: {type: 'number'},
      expectedMessage: {type: 'string'},
      expectedMetaName: {type: 'string'},
      expectedOutputFragment: {type: 'string'},
      expectedStatus: {type: 'number'},
      expectedToolErrorText: {type: 'string'},
      expectedToolName: {type: 'string'},
      expectedToolText: {type: 'string'},
      metaOnly: {type: 'boolean'},
      name: {type: 'string'},
      packageJson: {additionalProperties: true,
        type: 'object'},
      promptReply: {additionalProperties: true,
        type: 'object'},
      resultSchema: {type: 'boolean'},
      schemaKey: {type: 'string'},
      shape: {type: 'string'},
      shapeMode: {type: 'string'},
      toolName: {type: 'string'}
    },
    type: 'object'
  } as const satisfies JSONSchema
  export type Type = FromSchema<typeof Schema>
  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema)
}
