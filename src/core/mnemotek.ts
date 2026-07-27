import type {CommandDescriptionEntity} from '../entities/CommandDescriptionEntity.js'
import type {CommandNameEntity} from '../entities/CommandNameEntity.js'
import type {CommandPayloadEntity} from '../entities/CommandPayloadEntity.js'
import type {CommandResultEntity} from '../entities/CommandResultEntity.js'
import type {mnemotekContract} from './mnemotekContract.js'
import type {SchemaObjectInterface} from './SchemaObjectInterface.js'

const emptyCommandConfigurationSchema: SchemaObjectInterface = {
  additionalProperties: true,
  type: 'object'
}

const manifestSubcommands: readonly unknown[] = Object.freeze([])

/** Core command registry for CLI, MCP, and skill manifest generation. */
export class Mnemotek {

  readonly #commands = new Map<
    CommandNameEntity.Type,
    mnemotekContract.CommandDescriptorInterface
  >()

  readonly #description: CommandDescriptionEntity.Type

  readonly #name: CommandNameEntity.Type

  readonly #version: CommandDescriptionEntity.Type

  public constructor (configuration: Readonly<{
    readonly description: CommandDescriptionEntity.Type;
    readonly name: CommandNameEntity.Type;
    readonly version?: CommandDescriptionEntity.Type;
  }>) {

    this.#description = Mnemotek.assertTextValue(
      configuration.description,
      'description'
    )
    this.#name = Mnemotek.assertTextValue(
      configuration.name,
      'name'
    )
    this.#version = configuration.version ?? ''

  }

  private static assertTextValue (value: string, label: string): string {

    if (value.trim().length === 0) {

      throw new TypeError(`${label} must not be empty.`)

    }

    return value

  }

  private static cloneSchema<TSchemaValue> (schema: TSchemaValue): TSchemaValue {

    const result = structuredClone(schema)
    return result

  }

  public command (definition: Readonly<mnemotekContract.CommandRegistrationInterface>): this {

    if (this.#commands.has(definition.name)) {

      throw new TypeError(`Command '${definition.name}' is already registered.`)

    }

    this.#commands.set(
      definition.name,
      {
        description: definition.description,
        name: definition.name,
        resultSchema: definition.resultSchema === undefined
          ? undefined
          : Mnemotek.cloneSchema(definition.resultSchema),
        runner: definition.runner,
        schema: definition.schema === undefined
          ? undefined
          : Mnemotek.cloneSchema(definition.schema)
      }
    )

    return this

  }

  public commandInfo (commandName: CommandNameEntity.Type): Readonly<{
    readonly description: CommandDescriptionEntity.Type;
    readonly hasRunner: boolean;
    readonly name: CommandNameEntity.Type;
  }> | undefined {

    const descriptor = this.#commands.get(commandName)
    if (descriptor === undefined) {

      return undefined

    }

    return {
      description: descriptor.description,
      hasRunner: descriptor.runner !== undefined,
      name: descriptor.name
    }

  }

  public commandResultSchema (commandName: CommandNameEntity.Type): SchemaObjectInterface | undefined {

    const descriptor = this.#commands.get(commandName)
    if (descriptor?.resultSchema === undefined) {

      return undefined

    }

    return Mnemotek.cloneSchema(descriptor.resultSchema)

  }

  public manifest (): Readonly<{
    readonly commands: ReadonlyArray<{
      readonly description: CommandDescriptionEntity.Type;
      readonly hasResultSchema: boolean;
      readonly hasRunner: boolean;
      readonly inputSchema: SchemaObjectInterface | undefined;
      readonly name: CommandNameEntity.Type;
      readonly resultSchema: SchemaObjectInterface | undefined;
      readonly subcommands: readonly unknown[];
    }>;
    readonly description: CommandDescriptionEntity.Type;
    readonly name: CommandNameEntity.Type;
    readonly version: CommandDescriptionEntity.Type;
  }> {

    const manifestCommands: Array<{
      readonly description: CommandDescriptionEntity.Type;
      readonly hasResultSchema: boolean;
      readonly hasRunner: boolean;
      readonly inputSchema: SchemaObjectInterface | undefined;
      readonly name: CommandNameEntity.Type;
      readonly resultSchema: SchemaObjectInterface | undefined;
      readonly subcommands: readonly unknown[];
    }> = []

    for (const descriptor of this.#commands.values()) {

      manifestCommands.push({
        description: descriptor.description,
        hasResultSchema: descriptor.resultSchema !== undefined,
        hasRunner: descriptor.runner !== undefined,
        inputSchema: descriptor.schema,
        name: descriptor.name,
        resultSchema: descriptor.resultSchema,
        subcommands: manifestSubcommands
      })

    }

    return {
      commands: Object.freeze(manifestCommands),
      description: this.#description,
      name: this.#name,
      version: this.#version
    }

  }

  public async run (
    commandName: CommandNameEntity.Type,
    configuration: CommandPayloadEntity.Type
  ): Promise<CommandResultEntity.Type | undefined> {

    const descriptor = this.#commands.get(commandName)
    if (descriptor === undefined) {

      throw new TypeError(`Unknown command '${commandName}'.`)

    }

    if (descriptor.runner === undefined) {

      return undefined

    }

    return await Promise.resolve(descriptor.runner(configuration))

  }

  public schema (commandName: CommandNameEntity.Type): SchemaObjectInterface | undefined {

    const descriptor = this.#commands.get(commandName)
    if (descriptor?.schema === undefined) {

      return undefined

    }

    return Mnemotek.cloneSchema(descriptor.schema)

  }

  public skillManifest (): Readonly<{
    readonly commands: ReadonlyArray<{
      readonly description: CommandDescriptionEntity.Type;
      readonly name: CommandNameEntity.Type;
      readonly resultSchema: SchemaObjectInterface | undefined;
      readonly schema: SchemaObjectInterface | undefined;
      readonly subcommands: readonly unknown[];
    }>;
    readonly configSchema: SchemaObjectInterface;
    readonly description: CommandDescriptionEntity.Type;
    readonly name: CommandNameEntity.Type;
    readonly version: CommandDescriptionEntity.Type;
  }> {

    const manifestCommands: Array<{
      readonly description: CommandDescriptionEntity.Type;
      readonly name: CommandNameEntity.Type;
      readonly resultSchema: SchemaObjectInterface | undefined;
      readonly schema: SchemaObjectInterface | undefined;
      readonly subcommands: readonly unknown[];
    }> = []

    for (const descriptor of this.#commands.values()) {

      manifestCommands.push({
        description: descriptor.description,
        name: descriptor.name,
        resultSchema: descriptor.resultSchema,
        schema: descriptor.schema,
        subcommands: manifestSubcommands
      })

    }

    return {
      commands: Object.freeze(manifestCommands),
      configSchema: emptyCommandConfigurationSchema,
      description: this.#description,
      name: this.#name,
      version: this.#version
    }

  }

  public skillManifestMarkdown (metaOnly = false): string {

    if (metaOnly) {

      return JSON.stringify(
        this.skillManifestOutput(true),
        null,
        2
      )

    }

    const commandManifest = this.skillManifest()
    const commandDescriptionLines = commandManifest.commands.
      map((command) => {

        const result = `${command.name}: ${command.description}`; return result

      })
    const markdownLines = [
      '',
      '',
      '',
      '## Commands',
      `# ${this.#name}`,
      this.#description,
      ...commandDescriptionLines,
      ''
    ]

    return markdownLines.join('\n')

  }

  public skillManifestOutput (metaOnly = false): Readonly<{
    readonly commands?: ReadonlyArray<{
      readonly description: CommandDescriptionEntity.Type;
      readonly name: CommandNameEntity.Type;
      readonly resultSchema: SchemaObjectInterface | undefined;
      readonly schema: SchemaObjectInterface | undefined;
      readonly subcommands: readonly unknown[];
    }>;
    readonly configSchema?: SchemaObjectInterface;
    readonly description: CommandDescriptionEntity.Type;
    readonly mcpBin: CommandNameEntity.Type;
    readonly name: CommandNameEntity.Type;
    readonly version: CommandDescriptionEntity.Type;
  }> {

    const commandLineToolName = `${this.#name}-mcp`

    if (metaOnly) {

      return {
        description: this.#description,
        mcpBin: commandLineToolName,
        name: this.#name,
        version: this.#version
      }

    }

    return {
      ...this.skillManifest(),
      mcpBin: commandLineToolName
    }

  }

}
