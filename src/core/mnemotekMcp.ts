import type {ErrorObject} from 'ajv'

import {SchemaValidator} from '@studnicky/json'
import process from 'node:process'

import type {BooleanSchemaEntity} from '../entities/BooleanSchemaEntity.js'
import type {CommandDescriptionEntity} from '../entities/CommandDescriptionEntity.js'
import type {CommandNameEntity} from '../entities/CommandNameEntity.js'
import type {TextSchemaEntity} from '../entities/TextSchemaEntity.js'
import type {ToolCallContentTypeEntity} from '../entities/ToolCallContentTypeEntity.js'
import type {Mnemotek} from './mnemotek.js'
import type {SchemaObjectInterface} from './SchemaObjectInterface.js'

import {MnemotekConfiguration} from '../adapters/mnemotekConfiguration.js'
import {TOOL_NAME_CLEANUP_REGEX} from './constants/tool-patterns.js'
import {RecordGuard} from './RecordGuard.js'

interface ToolCallContentInterface {
  readonly text: TextSchemaEntity.Type;
  readonly type: ToolCallContentTypeEntity.Type;
}
interface ToolCallResultInterface {
  readonly content: readonly ToolCallContentInterface[];
  readonly isError?: BooleanSchemaEntity.Type;
}

interface ToolOutputInterface {
  readonly commandName: CommandNameEntity.Type;
  readonly result: unknown;
  readonly resultSchema: SchemaObjectInterface | undefined;
}

const mcpInputFallbackSchema: SchemaObjectInterface = {
  additionalProperties: true,
  properties: {
    config: {type: 'string'},
    interactive: {
      default: false,
      description: 'Prompt for missing values when validation fails.',
      type: 'boolean'
    }
  },
  type: 'object'
}

/**
 * MCP transport adapter for a {@link Mnemotek} manifest.
 */
export class MnemotekMcp {

  readonly #app: Mnemotek

  private constructor (app: Mnemotek) {

    this.#app = app

  }

  public static create (app: Mnemotek): MnemotekMcp {

    return new MnemotekMcp(app)

  }

  private static cloneSchemaProperties (schema: SchemaObjectInterface | undefined): Record<string, SchemaObjectInterface> {

    if (schema?.type === 'object' && MnemotekMcp.isRecordSchemaProperties(schema.properties)) {

      return schema.properties

    }

    return {}

  }

  private static formatToolResult (details: ToolOutputInterface): ToolCallResultInterface {

    if (!MnemotekMcp.isResultValid(
      details.resultSchema,
      details.result
    )) {

      return {
        content: [
          {
            text: `Result validation failed for command '${details.commandName}'.`,
            type: 'text'
          }
        ],
        isError: true
      }

    }

    if (typeof details.result === 'string') {

      return {
        content: [
          {
            text: details.result,
            type: 'text'
          }
        ],
        isError: false
      }

    }

    if (details.result !== undefined &&
      typeof details.result === 'object') {

      return {
        content: [
          {
            text: JSON.stringify(details.result),
            type: 'text'
          }
        ],
        isError: false
      }

    }

    return {
      content: [
        {
          text: JSON.stringify(details.result),
          type: 'text'
        }
      ],
      isError: false
    }

  }

  private static isRecordSchemaProperties (value: unknown): value is Record<string, SchemaObjectInterface> {

    if (!RecordGuard.isRecord(value)) {

      return false

    }
    return true

  }

  private static isResultValid (resultSchema: SchemaObjectInterface | undefined, result: unknown): boolean {

    if (resultSchema === undefined) {

      return true

    }

    const validator = SchemaValidator.compile(resultSchema)
    const valid = validator(result)
    if (valid) {

      return true

    }

    const errors: ErrorObject[] = validator.errors ?? []
    process.stderr.write(`Validation errors:\n${errors?.map((error) => {

      const message = error.message ?? 'Validation failed'
      return message

    }).join('\n')}\n`)
    return false

  }

  private static stripToolArguments (toolArguments: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {

    const cleaned: Record<string, unknown> = {}
    for (const [
      argumentName,
      argumentValue
    ] of Object.entries(toolArguments)) {

      if (
        argumentName !== 'config' &&
        argumentName !== 'interactive' &&
        argumentValue !== undefined
      ) {

        cleaned[argumentName] = argumentValue

      }

    }

    if (toolArguments.interactive === true) {

      cleaned.interactive = true

    }

    return cleaned

  }

  public async callTool (
    commandName: CommandNameEntity.Type,
    toolArguments: Readonly<Record<string, unknown>> = {}
  ): Promise<ToolCallResultInterface> {

    const normalizedCommandName = commandName.
      replace(
        TOOL_NAME_CLEANUP_REGEX,
        ''
      ).
      trim()
    const cleanedArguments = MnemotekMcp.stripToolArguments(toolArguments)
    const commandSchema = this.#app.schema(normalizedCommandName)
    const inputSchema = commandSchema === undefined
      ? mcpInputFallbackSchema
      : {
        additionalProperties: true,
        properties: {
          ...MnemotekMcp.cloneSchemaProperties(commandSchema),
          config: {type: 'string'},
          interactive: {
            default: false,
            description: 'Prompt for missing values when validation fails.',
            type: 'boolean'
          }
        },
        type: 'object'
      }

    try {

      const configuration = await MnemotekConfiguration.load({
        appName: this.#app.manifest().name,
        commandLineArguments: cleanedArguments,
        commandName: normalizedCommandName,
        interactive: cleanedArguments.interactive === true,
        schema: inputSchema
      })
      const commandResult = await this.#app.run(
        normalizedCommandName,
        configuration
      )
      return MnemotekMcp.formatToolResult({
        commandName: normalizedCommandName,
        result: commandResult,
        resultSchema: this.#app.commandResultSchema(normalizedCommandName)
      })

    } catch (error: unknown) {

      return {
        content: [
          {
            text: error instanceof Error
              ? error.message
              : String(error),
            type: 'text'
          }
        ],
        isError: true
      }

    }

  }

  public listTools (): {
    readonly tools: ReadonlyArray<{
      readonly description: CommandDescriptionEntity.Type;
      readonly inputSchema: SchemaObjectInterface;
      readonly name: CommandNameEntity.Type;
    }>;
  } {

    const tools: Array<{
      readonly description: CommandDescriptionEntity.Type;
      readonly inputSchema: SchemaObjectInterface;
      readonly name: CommandNameEntity.Type;
    }> = []

    for (const command of this.#app.manifest().commands) {

      const commandInputSchema = command.inputSchema
      const properties = MnemotekMcp.cloneSchemaProperties(commandInputSchema)
      tools.push({
        description: command.description,
        inputSchema: {
          additionalProperties: true,
          properties: {
            ...properties,
            config: {
              description: 'Path to a JSON config source file.',
              type: 'string'
            },
            interactive: {
              default: false,
              description: 'Prompt for missing values when validation fails.',
              type: 'boolean'
            }
          },
          type: 'object'
        },
        name: command.name
      })

    }

    return {tools}

  }

}
