import {Clone, Merge} from '@studnicky/json'
import {Ajv, type ValidateFunction} from 'ajv'
import Enquirer from 'enquirer'
import {existsSync, readFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import process from 'node:process'

import type {SchemaObjectInterface} from '../core/SchemaObjectInterface.js'
import type {OptionPathEntity} from '../entities/OptionPathEntity.js'

interface FlatSchemaFieldInterface {
  readonly path: OptionPathEntity.Type;
  readonly schema: SchemaObjectInterface;
}

export class MnemotekConfiguration {

  private static readonly ajvOptions = {
    allErrors: true,
    removeAdditional: 'all',
    useDefaults: true
  } as const

  private static readonly configFileCliArgument = 'config'

  private static readonly defaultConfigurationFile = '.mnemotek'

  private static readonly schemaValidators = new WeakMap<object, ValidateFunction>()

  public static collectFlatSchema (schema: SchemaObjectInterface): FlatSchemaFieldInterface[] {

    const fields: FlatSchemaFieldInterface[] = []
    const pending: FlatSchemaFieldInterface[] = [
      {path: '',
        schema}
    ]

    this.flattenSchemaChildren(
      pending,
      fields
    )

    return fields

  }

  public static commandOptionNames (schema: SchemaObjectInterface): string[] {

    const flatSchemaFields = this.collectFlatSchema(schema)
    const optionNames: string[] = []

    for (const field of flatSchemaFields) {

      optionNames.push(field.path.
        replaceAll(
          '.',
          '-'
        ).
        replaceAll(
          '_',
          '-'
        ))

    }

    return optionNames

  }

  public static async load (loadOptions: {
    readonly appName: string;
    readonly commandLineArguments?: Readonly<Record<string, unknown>>;
    readonly commandName: string;
    readonly interactive: boolean;
    readonly schema: SchemaObjectInterface;
  }): Promise<Record<string, unknown>> {

    const commandLineArguments = loadOptions.commandLineArguments ?? {}
    const flatFields = this.collectFlatSchema(loadOptions.schema)
    const defaults = this.applyDefaultsToObject(loadOptions.schema)
    const defaultsSource = this.isRecord(defaults)
      ? Clone.deep(defaults)
      : {}
    const packageSource = this.readPackageJsonSource({
      appName: loadOptions.appName,
      commandName: loadOptions.commandName
    })
    const fileSource = this.readFileSource({
      appName: loadOptions.appName,
      cliArguments: commandLineArguments,
      commandName: loadOptions.commandName
    })
    const environmentSource = this.readEnvironmentSource({
      appName: loadOptions.appName,
      commandName: loadOptions.commandName,
      fields: flatFields
    })
    const cliSource = this.readCliSource({
      cliArguments: commandLineArguments,
      fields: flatFields
    })

    const mergedConfiguration = Merge.deep(
      Merge.deep(
        Merge.deep(
          Merge.deep(
            defaultsSource,
            packageSource
          ),
          fileSource
        ),
        environmentSource
      ),
      cliSource
    )

    const initialValidation = this.validateConfiguration({
      configuration: mergedConfiguration,
      schema: loadOptions.schema
    })
    if (initialValidation.ok) {

      return initialValidation.configuration

    }

    if (!loadOptions.interactive) {

      throw new TypeError(`Configuration validation failed:\n${initialValidation.errors}`)

    }

    const promptedConfiguration = await this.interactiveFill({
      flatFields,
      schema: loadOptions.schema,
      sourceConfiguration: mergedConfiguration
    })
    const afterPromptValidation = this.validateConfiguration({
      configuration: promptedConfiguration,
      schema: loadOptions.schema
    })
    if (!afterPromptValidation.ok) {

      throw new TypeError(`Configuration validation failed:\n${afterPromptValidation.errors}`)

    }

    return afterPromptValidation.configuration

  }

  private static appendFlatField (details: {
    readonly fields: FlatSchemaFieldInterface[];
    readonly path: string;
    readonly schema: SchemaObjectInterface;
  }): void {

    if (details.path.length > 0) {

      details.fields.push({
        path: details.path,
        schema: details.schema
      })

    }

  }

  private static applyDefaultsToObject (schema: SchemaObjectInterface): unknown {

    if (!this.isRecordSchema(schema) || !this.isRecord(schema.properties)) {

      return this.defaultSchemaValue(schema)

    }

    const defaults: Record<string, unknown> = {}
    for (const [
      propertyName,
      propertySchema
    ] of Object.entries(schema.properties)) {

      if (propertyName.length === 0 || propertySchema === undefined) {

        continue

      }
      const propertyDefault = this.applyDefaultsToObject(propertySchema)
      const isNestedDefaultsEmpty = this.isRecord(propertyDefault)
        ? Object.keys(propertyDefault).length === 0
        : false
      if (propertyDefault !== undefined && !isNestedDefaultsEmpty) {

        defaults[propertyName] = propertyDefault

      }

    }

    return defaults

  }

  private static coerceArrayValue (value: unknown): unknown {

    if (Array.isArray(value)) {

      return value

    }

    return this.coerceFallback({
      schema: {
        items: {},
        type: 'array'
      },
      value
    })

  }

  private static coerceBoolean (value: unknown): boolean {

    if (typeof value === 'boolean') {

      return value

    }
    if (typeof value === 'string') {

      const lowered = value.toLowerCase()
      if (
        lowered === 'true' ||
        lowered === '1' ||
        lowered === 'yes' ||
        lowered === 'on'
      ) {

        return true

      }
      if (
        lowered === 'false' ||
        lowered === '0' ||
        lowered === 'no' ||
        lowered === 'off'
      ) {

        return false

      }

    }

    return Boolean(value)

  }

  private static coerceFallback (details: {
    readonly schema: SchemaObjectInterface;
    readonly value: unknown;
  }): unknown {

    if (Array.isArray(details.value)) {

      return details.value

    }

    if (
      typeof details.value === 'string' &&
      details.schema.type !== undefined &&
      details.schema.type === 'string'
    ) {

      return details.value

    }

    if (
      typeof details.value === 'string' &&
      details.value.includes(',')
    ) {

      const commaValues = details.value.split(',')
      const parsedValues: string[] = []
      for (const commaValue of commaValues) {

        if (commaValue === undefined) {

          continue

        }
        const trimmedValue = commaValue.trim()
        if (trimmedValue.length > 0) {

          parsedValues.push(trimmedValue)

        }

      }
      return parsedValues

    }

    return details.value

  }

  private static coerceNumeric (details: {
    readonly isInteger: boolean;
    readonly value: unknown;
  }): number | undefined {

    const numberValue = typeof details.value === 'number'
      ? details.value
      : Number(details.value)
    if (!Number.isFinite(numberValue)) {

      return undefined

    }

    return details.isInteger
      ? Math.trunc(numberValue)
      : numberValue

  }

  private static coerceValue (details: {
    readonly schema: SchemaObjectInterface;
    readonly value: unknown;
  }): unknown {

    const schemaType = this.schemaType(details.schema)
    if (schemaType === undefined) {

      return this.coerceFallback({
        schema: details.schema,
        value: details.value
      })

    }

    if (schemaType === 'boolean') {

      return this.coerceBoolean(details.value)

    }
    if (schemaType === 'integer' || schemaType === 'number') {

      return this.coerceNumeric({
        isInteger: schemaType === 'integer',
        value: details.value
      })

    }
    if (schemaType === 'string') {

      return String(details.value)

    }
    if (schemaType === 'array') {

      return this.coerceArrayValue(details.value)

    }

    return details.value

  }

  private static defaultSchemaValue (schema: SchemaObjectInterface): unknown {

    if (schema.default !== undefined) {

      return Clone.deep(schema.default)

    }
    return this.resolveDefaultToObject(schema)

  }

  private static findConfigPath (cliArguments: Readonly<Record<string, unknown>>): string {

    const direct = cliArguments[this.configFileCliArgument]
    if (typeof direct === 'string' && direct.length > 0) {

      return direct

    }

    const overridePath = process.env.CONFIGURATION_FILE ?? process.env.MNEMOTEK_CONFIGURATION_FILE
    return typeof overridePath === 'string' && overridePath.length > 0
      ? overridePath
      : ''

  }

  private static findProjectRoot (): string {

    let currentDirectory = process.cwd()
    const fallbackDirectory = currentDirectory

    while (true) {

      if (existsSync(join(
        currentDirectory,
        'package.json'
      ))) {

        return currentDirectory

      }

      const parentDirectory = dirname(currentDirectory)
      if (parentDirectory === currentDirectory) {

        return fallbackDirectory

      }

      currentDirectory = parentDirectory

    }

  }

  private static flattenSchemaChildren (
    pending: FlatSchemaFieldInterface[],
    fields: FlatSchemaFieldInterface[]
  ): void {

    while (pending.length > 0) {

      const cursor = pending.pop()
      if (cursor === undefined) {

        continue

      }

      if (!this.isRecordSchema(cursor.schema)) {

        this.appendFlatField({
          fields,
          path: cursor.path,
          schema: cursor.schema
        })
        continue

      }

      const properties = cursor.schema.properties ?? {}
      for (const propertyName of Object.keys(properties)) {

        const propertySchema = properties[propertyName]
        if (propertyName.length === 0 || propertySchema === undefined) {

          continue

        }
        const nextPath = cursor.path.length === 0
          ? propertyName
          : `${cursor.path}.${propertyName}`
        pending.push({
          path: nextPath,
          schema: propertySchema
        })

      }

    }

  }

  private static async interactiveFill (details: {
    readonly flatFields: readonly FlatSchemaFieldInterface[];
    readonly schema: SchemaObjectInterface;
    readonly sourceConfiguration: Record<string, unknown>;
  }): Promise<Record<string, unknown>> {

    const promptSession = new Enquirer()
    const workingConfiguration = Clone.deep(details.sourceConfiguration)

    for (const field of details.flatFields) {

      const configuredValue = this.resolvePath({
        path: field.path,
        source: workingConfiguration
      })
      const initialValue = configuredValue ?? this.defaultSchemaValue(field.schema)
      const promptDefinition = this.toPromptDefinition(
        field.schema,
        field.path,
        initialValue
      )
      const answer = await promptSession.prompt(promptDefinition) as {
        readonly [answerField: string]: unknown;
        readonly value?: unknown;
      }
      const answerValue = answer[field.path] ?? answer.value
      if (answerValue === undefined) {

        continue

      }

      const nextValue = this.coerceValue({
        schema: field.schema,
        value: answerValue
      })
      const nextConfiguration = Clone.deep(workingConfiguration)
      this.writePath({
        path: field.path,
        source: nextConfiguration,
        value: nextValue
      })
      const fieldValidation = this.validateConfiguration({
        configuration: nextConfiguration,
        schema: details.schema
      })

      if (!fieldValidation.ok) {

        process.stderr.write(`Validation failed:\n${fieldValidation.errors}\n`)
        continue

      }

      this.writePath({
        path: field.path,
        source: workingConfiguration,
        value: nextValue
      })

    }

    return workingConfiguration

  }

  private static isObjectSchema (schema: unknown): schema is {
    readonly properties: Record<string, SchemaObjectInterface>;
    readonly type: 'object';
  } {

    return this.isRecord(schema) &&
      schema.type === 'object' &&
      this.isRecord(schema.properties)

  }

  private static isRecord (value: unknown): value is Record<string, unknown> {

    return value !== null && typeof value === 'object' && !Array.isArray(value)

  }

  private static isRecordSchema (schema: unknown): schema is SchemaObjectInterface {

    const result = this.isObjectSchema(schema)
    return result

  }

  private static normalizeObjectPath (pathValue: string): string {

    const segments = pathValue.split('.')
    const normalizedSegments: string[] = []

    const segmentsLength = segments.length
    for (let segmentIndex = 0; segmentIndex < segmentsLength; segmentIndex += 1) {

      const segment = segments[segmentIndex]
      if (segment !== undefined && segment.length > 0) {

        if (segmentIndex === 0) {

          normalizedSegments.push(segment)

        } else {

          const firstCharacter = segment.at(0)
          normalizedSegments.push(firstCharacter === undefined
            ? segment
            : `${firstCharacter.toUpperCase()}${segment.slice(1)}`)

        }

      }

    }

    return normalizedSegments.join('')

  }

  private static readCliSource (details: {
    readonly cliArguments: Readonly<Record<string, unknown>>;
    readonly fields: readonly FlatSchemaFieldInterface[];
  }): Record<string, unknown> {

    const source: Record<string, unknown> = {}
    const aliases = new Map<string, FlatSchemaFieldInterface>()

    for (const field of details.fields) {

      aliases.set(
        field.path,
        field
      )
      aliases.set(
        this.normalizeObjectPath(field.path),
        field
      )
      aliases.set(
        field.path.replaceAll(
          '.',
          '-'
        ).
          replaceAll(
            '_',
            '-'
          ),
        field
      )

    }

    for (const [
      argumentName,
      argumentValue
    ] of Object.entries(details.cliArguments)) {

      if (
        argumentName === 'config' ||
        argumentName === 'help' ||
        argumentName === 'interactive' ||
        argumentName === 'version' ||
        argumentValue === undefined
      ) {

        continue

      }

      const field = aliases.get(argumentName)
      if (field !== undefined) {

        this.writePath({
          path: field.path,
          source,
          value: this.coerceValue({
            schema: field.schema,
            value: argumentValue
          })
        })

      }

    }

    return source

  }

  private static readEnumeration (schema: SchemaObjectInterface): string[] {

    const enumerationValues = schema.enum
    if (!Array.isArray(enumerationValues)) {

      return []

    }

    const values: string[] = []
    for (const value of enumerationValues) {

      if (value !== undefined) {

        values.push(String(value))

      }

    }

    return values

  }

  private static readEnvironmentFile (fileText: string, entries: Map<string, string>): void {

    const fileRows = fileText.split('\n')
    for (const fileRow of fileRows) {

      const line = fileRow.trim()
      if (line.length > 0 && !line.startsWith('#')) {

        const delimiterIndex = line.indexOf('=')
        if (delimiterIndex !== -1) {

          const key = line.substring(
            0,
            delimiterIndex
          )
          const value = line.substring(delimiterIndex + 1)
          entries.set(
            key,
            value
          )

        }

      }

    }

  }

  private static readEnvironmentSource (details: {
    readonly appName: string;
    readonly commandName: string;
    readonly fields: readonly FlatSchemaFieldInterface[];
  }): Record<string, unknown> {

    const appTag = details.appName.
      replaceAll(
        '.',
        '_'
      ).
      replaceAll(
        '-',
        '_'
      ).
      toUpperCase()
    const commandTag = details.commandName.
      replaceAll(
        '.',
        '_'
      ).
      replaceAll(
        '-',
        '_'
      ).
      toUpperCase()
    const prefix = `${appTag}_${commandTag}`
    const values = this.readEnvironmentVariables(prefix)
    const source: Record<string, unknown> = {}

    for (const field of details.fields) {

      const fieldTag = field.path.
        replaceAll(
          '.',
          '_'
        ).
        replaceAll(
          '-',
          '_'
        ).
        toUpperCase()
      const environmentName = `${prefix}_${fieldTag}`
      const rawValue = values.get(environmentName)
      if (rawValue !== undefined) {

        this.writePath({
          path: field.path,
          source,
          value: this.coerceValue({
            schema: field.schema,
            value: rawValue
          })
        })

      }

    }

    return source

  }

  private static readEnvironmentVariables (prefix: string): Map<string, string> {

    const root = this.findProjectRoot()
    const configurationFilePath = join(
      root,
      '.env'
    )
    const entries = new Map<string, string>()

    if (existsSync(configurationFilePath)) {

      const fileRows = readFileSync(
        configurationFilePath,
        'utf-8'
      )
      this.readEnvironmentFile(
        fileRows,
        entries
      )

    }

    this.readProcessEnvironment(
      prefix,
      entries
    )

    return entries

  }

  private static readFileSource (details: {
    readonly appName: string;
    readonly cliArguments: Readonly<Record<string, unknown>>;
    readonly commandName: string;
  }): Record<string, unknown> {

    const root = this.findProjectRoot()
    const fallbackPath = join(
      root,
      this.defaultConfigurationFile,
      `${details.appName}.json`
    )
    const overridePath = this.findConfigPath(details.cliArguments)
    const configurationPath = overridePath.length > 0
      ? overridePath
      : fallbackPath

    if (!existsSync(configurationPath)) {

      if (overridePath.length > 0) {

        throw new TypeError(`Configuration file not found: ${configurationPath}`)

      }
      return {}

    }

    const configurationText = readFileSync(
      configurationPath,
      'utf-8'
    )
    const configurationValue = JSON.parse(configurationText)
    if (!this.isRecord(configurationValue)) {

      if (overridePath.length > 0) {

        throw new TypeError(`Configuration file must contain an object: ${configurationPath}`)

      }
      process.stderr.write(`Warning: auto-discovered config file '${configurationPath}' is not an object and was skipped.\n`)
      return {}

    }

    const {commands} = configurationValue
    const commandConfiguration = this.isRecord(commands) && this.isRecord(commands[details.commandName])
      ? commands[details.commandName]
      : configurationValue[details.commandName]
    if (this.isRecord(commandConfiguration)) {

      return commandConfiguration

    }

    return configurationValue

  }

  private static readPackageJsonSource (details: {
    readonly appName: string;
    readonly commandName: string;
  }): Record<string, unknown> {

    const root = this.findProjectRoot()
    const packageJsonPath = join(
      root,
      'package.json'
    )
    if (!existsSync(packageJsonPath)) {

      return {}

    }

    const packageText = readFileSync(
      packageJsonPath,
      'utf-8'
    )
    const packageContent = JSON.parse(packageText)
    if (!this.isRecord(packageContent)) {

      return {}

    }

    const appConfiguration = packageContent[details.appName]
    if (!this.isRecord(appConfiguration)) {

      return {}

    }

    const {commands} = appConfiguration
    const commandConfiguration = this.isRecord(commands) && this.isRecord(commands[details.commandName])
      ? commands[details.commandName]
      : appConfiguration[details.commandName]
    if (this.isRecord(commandConfiguration)) {

      return commandConfiguration

    }

    return appConfiguration

  }

  private static readProcessEnvironment (prefix: string, entries: Map<string, string>): void {

    const environmentEntries = Object.entries(process.env)
    for (const [
      environmentName,
      environmentValue
    ] of environmentEntries) {

      if (
        environmentName !== undefined &&
        environmentValue !== undefined &&
        environmentName.startsWith(prefix)
      ) {

        entries.set(
          environmentName,
          environmentValue
        )

      }

    }

  }

  private static resolveDefaultToObject (schema: SchemaObjectInterface): unknown {

    if (schema.type === 'object' && this.isRecord(schema.properties)) {

      const defaults: Record<string, unknown> = {}

      for (const [
        propertyName,
        propertySchema
      ] of Object.entries(schema.properties)) {

        if (propertyName.length === 0 || propertySchema === undefined) {

          continue

        }

        const propertyDefault = this.applyDefaultsToObject(propertySchema)
        if (propertyDefault !== undefined) {

          defaults[propertyName] = propertyDefault

        }

      }

      return defaults

    }

    return undefined

  }

  private static resolveDescription (schema: SchemaObjectInterface): string {

    const {description} = schema
    if (typeof description === 'string') {

      return description

    }
    return ''

  }

  private static resolvePath (details: {
    readonly path: string;
    readonly source: Record<string, unknown>;
  }): unknown {

    const segments = details.path.split('.')
    let cursor: unknown = details.source

    for (const segment of segments) {

      if (!this.isRecord(cursor)) {

        return undefined

      }
      const cursorRecord = cursor
      const value = cursorRecord[segment]
      if (value === undefined) {

        return undefined

      }
      cursor = value

    }

    return cursor

  }

  private static schemaType (schema: SchemaObjectInterface): 'array' | 'boolean' | 'integer' | 'number' | 'string' | undefined {

    if (schema.type === 'array' ||
      schema.type === 'boolean' ||
      schema.type === 'integer' ||
      schema.type === 'number' ||
      schema.type === 'string'
    ) {

      return schema.type

    }

    return undefined

  }

  private static toPromptDefinition (
    schema: SchemaObjectInterface,
    path: string,
    defaultValue: unknown
  ): {
    readonly choices?: string[];
    readonly default?: boolean | number | string;
    readonly message: string;
    readonly name: string;
    readonly type: 'confirm' | 'input' | 'number' | 'password' | 'select';
  } {

    const schemaType = this.schemaType(schema)
    const enumeration = this.readEnumeration(schema)
    let promptType: 'confirm' | 'input' | 'number' | 'password' | 'select' = 'input'

    if (schemaType === 'boolean') {

      promptType = 'confirm'

    } else if (enumeration.length > 0) {

      promptType = 'select'

    } else if (schemaType === 'integer' || schemaType === 'number') {

      promptType = 'number'

    } else if (this.resolveDescription(schema).toLowerCase().
      includes('token')) {

      promptType = 'password'

    }

    const basePrompt = {
      message: this.resolveDescription(schema).length > 0
        ? `${path}: ${this.resolveDescription(schema)}`
        : path,
      name: path,
      type: promptType
    }

    if (typeof defaultValue === 'boolean' ||
      typeof defaultValue === 'number' ||
      typeof defaultValue === 'string'
    ) {

      return {
        ...basePrompt,
        default: defaultValue
      }

    }

    if (promptType === 'number') {

      return basePrompt

    }
    if (promptType === 'select' && enumeration.length > 0) {

      return {
        ...basePrompt,
        choices: enumeration
      }

    }

    return basePrompt

  }

  private static validateConfiguration (details: {
    readonly configuration: Record<string, unknown>;
    readonly schema: SchemaObjectInterface;
  }): {
    readonly configuration: Record<string, unknown>;
    readonly errors: string;
    readonly ok: boolean;
  } {

    const validator = this.validators(details.schema)
    const nextConfiguration = Clone.deep(details.configuration)
    const result = validator(nextConfiguration)
    if (result) {

      return {
        configuration: nextConfiguration,
        errors: '',
        ok: true
      }

    }

    const errorEntries = validator.errors ?? []
    const messages: string[] = []
    for (const errorEntry of errorEntries) {

      const errorPath = errorEntry.instancePath.length === 0
        ? '(root)'
        : errorEntry.instancePath.slice(1).replaceAll(
          '/',
          '.'
        )
      messages.push(`  ${errorPath}: ${errorEntry.message ?? 'invalid'}`)

    }

    return {
      configuration: nextConfiguration,
      errors: messages.join('\n'),
      ok: false
    }

  }

  private static validators (schema: SchemaObjectInterface): ValidateFunction {

    const existing = this.schemaValidators.get(schema)
    if (existing !== undefined) {

      return existing

    }

    const validator = new Ajv(this.ajvOptions).compile(schema)
    this.schemaValidators.set(
      schema,
      validator
    )
    return validator

  }

  private static writePath (details: {
    readonly path: string;
    readonly source: Record<string, unknown>;
    readonly value: unknown;
  }): void {

    const segments = details.path.split('.')
    let cursor: Record<string, unknown> = details.source
    const leafIndex = segments.length - 1

    const segmentsLength = segments.length
    for (let index = 0; index < segmentsLength; index += 1) {

      const segment = segments[index]
      if (segment === undefined) {

        return

      }

      if (index === leafIndex) {

        cursor[segment] = details.value
        return

      }

      const nested = cursor[segment]
      if (!this.isRecord(nested)) {

        cursor[segment] = {}

      }
      const nextNode = cursor[segment]
      if (this.isRecord(nextNode)) {

        cursor = nextNode

      } else {

        return

      }

    }

  }

}
