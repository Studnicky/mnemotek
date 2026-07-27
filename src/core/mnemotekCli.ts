import {Command} from 'commander'
import process from 'node:process'

import type {CommandDescriptionEntity} from '../entities/CommandDescriptionEntity.js'
import type {CommandNameEntity} from '../entities/CommandNameEntity.js'
import type {OptionKeyEntity} from '../entities/OptionKeyEntity.js'
import type {OptionNameEntity} from '../entities/OptionNameEntity.js'
import type {OptionPathEntity} from '../entities/OptionPathEntity.js'
import type {SchemaTypeEntity} from '../entities/SchemaTypeEntity.js'
import type {Mnemotek} from './mnemotek.js'
import type {SchemaObjectInterface} from './SchemaObjectInterface.js'

import {MnemotekConfiguration} from '../adapters/mnemotekConfiguration.js'

interface CommandOptionDescriptorInterface {
  readonly optionKey: OptionKeyEntity.Type;
  readonly optionName: OptionNameEntity.Type;
  readonly path: OptionPathEntity.Type;
  readonly schema: SchemaObjectInterface;
  readonly schemaType: SchemaTypeEntity.Type;
}

interface ManifestCommandInterface {
  readonly description: CommandDescriptionEntity.Type;
  readonly inputSchema: SchemaObjectInterface | undefined;
  readonly name: CommandNameEntity.Type;
}

interface SchemaTypeDescriptorInterface {
  readonly command: ManifestCommandInterface;
  readonly commandInstance: Command;
  readonly fieldDescriptors: readonly CommandOptionDescriptorInterface[];
}

/** CLI transport for a `Mnemotek` manifest. */
export class MnemotekCli {

  public static async execute (
    app: Mnemotek,
    argumentList: readonly string[] = process.argv
  ): Promise<number> {

    const manifest = app.manifest()
    const program = new Command(manifest.name)

    program.description(manifest.description)
    program.option(
      '-c, --config <path>',
      'Path to a JSON config source file.'
    )
    program.option(
      '--interactive',
      'Prompt for missing or invalid values.'
    )

    this.configureManifestCommand(
      app,
      program
    )

    for (const commandDefinition of manifest.commands) {

      const schemaPayload = this.createFieldDescriptors(commandDefinition.inputSchema)
      const commandInstance = program.command(commandDefinition.name).
        description(commandDefinition.description)
      this.attachSchemaOptions(
        commandInstance,
        schemaPayload.fieldDescriptors
      )
      this.attachCommandAction(
        app,
        {
          command: commandDefinition,
          commandInstance,
          fieldDescriptors: schemaPayload.fieldDescriptors
        }
      )

    }

    try {

      await program.parseAsync(argumentList)
      return 0

    } catch (error: unknown) {

      const message = error instanceof Error
        ? error.message
        : String(error)
      process.stderr.write(`${message}\n`)
      return 1

    }

  }

  private static attachCommandAction (
    app: Mnemotek,
    schemaPayload: SchemaTypeDescriptorInterface
  ): void {

    const {command, commandInstance, fieldDescriptors} = schemaPayload

    commandInstance.action(async (...parameters: readonly unknown[]) => {

      const commandContext = parameters.at(-1)
      if (!(commandContext instanceof Command)) {

        return

      }

      const localCommandOptions = commandContext.opts()
      const globalCommandOptions = this.collectOptionSource(commandContext)
      const commandOptions = this.normalizeCommandOptions(
        command.inputSchema,
        fieldDescriptors,
        localCommandOptions
      )
      const cliArguments: Record<string, unknown> = {
        ...globalCommandOptions,
        ...commandOptions
      }
      const configurationPath = this.resolveConfigurationPath(cliArguments)
      if (configurationPath !== undefined) {

        cliArguments.config = configurationPath

      }

      const isInteractive = cliArguments.interactive === true
      const configuration = command.inputSchema === undefined
        ? commandOptions
        : await MnemotekConfiguration.load({
          appName: commandContext.name(),
          commandLineArguments: cliArguments,
          commandName: command.name,
          interactive: isInteractive,
          schema: command.inputSchema
        })
      await app.run(
        command.name,
        configuration
      )

    })

  }

  private static attachSchemaOptions (
    command: Command,
    descriptors: readonly CommandOptionDescriptorInterface[]
  ): void {

    for (const descriptor of descriptors) {

      command.option(
        this.formatOption(descriptor),
        this.describeSchema(descriptor.schema)
      )

    }

  }

  private static collectOptionSource (command: Command): Record<string, unknown> {

    const globalOptions: Record<string, unknown> = {}
    for (let cursor: Command | null | undefined = command; cursor !== null; cursor = cursor.parent) {

      const options = cursor.opts()
      for (const [
        optionName,
        optionValue
      ] of Object.entries(options)) {

        if (optionValue !== undefined) {

          globalOptions[optionName] = optionValue

        }

      }

    }

    return globalOptions

  }

  private static configureManifestCommand (
    app: Mnemotek,
    program: Command
  ): void {

    const manifestCommand = program.command('skill-manifest').
      description('Output skill manifest JSON for agent and CI discovery')
    manifestCommand.option(
      '--meta-only',
      'Emit meta-only manifest output'
    )
    manifestCommand.action((...parameters: readonly unknown[]) => {

      const manifestContext = parameters.at(-1)
      if (!(manifestContext instanceof Command)) {

        return

      }

      const manifestParameters = manifestContext.opts()
      const isMetaOnly = manifestParameters.metaOnly === true
      process.stdout.write(`${JSON.stringify(
        app.skillManifestOutput(isMetaOnly),
        null,
        2
      )}\n`)
      process.exitCode = 0

    })

  }

  private static createFieldDescriptors (schema: SchemaObjectInterface | undefined): {readonly fieldDescriptors: readonly CommandOptionDescriptorInterface[]} {

    if (schema === undefined) {

      return {fieldDescriptors: []}

    }

    const flat = MnemotekConfiguration.collectFlatSchema(schema)
    const fieldDescriptors = flat.map((field) => {

      return {
        optionKey: this.toCamelCase(field.path.
          replaceAll(
            '.',
            '-'
          ).
          replaceAll(
            '_',
            '-'
          )),
        optionName: field.path.
          replaceAll(
            '.',
            '-'
          ).
          replaceAll(
            '_',
            '-'
          ),
        path: field.path,
        schema: field.schema,
        schemaType: this.schemaType(field.schema)
      }

    })

    return {fieldDescriptors}

  }

  private static describeSchema (schema: SchemaObjectInterface): string {

    const text = schema.description
    return typeof text === 'string' && text.length > 0
      ? text
      : 'Configuration value'

  }

  private static formatOption (definition: {
    readonly optionName: OptionNameEntity.Type;
    readonly schemaType: SchemaTypeEntity.Type;
  }): string {

    const option = `--${definition.optionName}`
    if (definition.schemaType === 'boolean') {

      return option

    }

    if (definition.schemaType === 'array') {

      return `${option} <value...>`

    }

    return `${option} <value>`

  }

  private static normalizeCommandOptions (
    schema: SchemaObjectInterface | undefined,
    descriptors: readonly CommandOptionDescriptorInterface[],
    commandOptions: Record<string, unknown>
  ): Record<string, unknown> {

    if (schema === undefined) {

      return {}

    }

    const aliases = new Map<string, string>()
    for (const descriptor of descriptors) {

      aliases.set(
        descriptor.path,
        descriptor.path
      )
      aliases.set(
        descriptor.optionName,
        descriptor.path
      )
      aliases.set(
        descriptor.optionKey,
        descriptor.path
      )

    }

    const normalized: Record<string, unknown> = {}
    for (const [
      optionName,
      optionValue
    ] of Object.entries(commandOptions)) {

      const nextPath = aliases.get(optionName)
      if (nextPath !== undefined && optionValue !== undefined) {

        normalized[nextPath] = optionValue

      }

    }

    return normalized

  }

  private static resolveConfigurationPath (cliArguments: Record<string, unknown>): string | undefined {

    const configuredPath = cliArguments.config
    if (typeof configuredPath === 'string' && configuredPath.length > 0) {

      return configuredPath

    }

    return undefined

  }

  private static schemaType (schema: SchemaObjectInterface): SchemaTypeEntity.Type {

    if (schema.type === 'array') {

      return 'array'

    }
    if (schema.type === 'boolean') {

      return 'boolean'

    }
    if (schema.type === 'integer') {

      return 'integer'

    }
    if (schema.type === 'number') {

      return 'number'

    }

    return 'string'

  }

  private static toCamelCase (text: string): string {

    const parts = text.split('-')
    const normalized: string[] = []

    const partsLength = parts.length
    for (let index = 0; index < partsLength; index += 1) {

      const part = parts[index]
      if (part === undefined || part.length === 0) {

        continue

      }

      if (index === 0) {

        normalized.push(part)

      } else {

        const firstCharacter = part.at(0)
        normalized.push(firstCharacter === undefined
          ? part
          : `${firstCharacter.toUpperCase()}${part.slice(1)}`)

      }

    }

    return normalized.join('')

  }

}
