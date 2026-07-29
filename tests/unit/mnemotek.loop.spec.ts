import Enquirer from 'enquirer'
import assert from 'node:assert/strict'
import {
  mkdirSync, mkdtempSync, rmSync, writeFileSync
} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import process from 'node:process'
import {describe, mock} from 'node:test'

import type {SchemaObjectInterface} from '../../src/core/SchemaObjectInterface.js'
import type {CommandPayloadEntity} from '../../src/entities/CommandPayloadEntity.js'
import type {CommandResultEntity} from '../../src/entities/CommandResultEntity.js'
import type {ScenarioDataEntity} from '../entities/ScenarioDataEntity.js'
import type {ScenarioCaseInterface} from '../interfaces/ScenarioCaseInterface.js'

import {
  Mnemotek,
  MnemotekCli,
  MnemotekConfiguration,
  MnemotekMcp
} from '../../src/index.js'
import {RunScenarioGroups} from '../support/runScenarioGroups.js'
import {scenarioGroups} from './fixtures/scenarioGroups.js'

class MnemotekLoopTests {

  /** Asserts a built manifest matches a scenario's expected command shape. */
  public static assertManifestOutcome (manifest: ReturnType<Mnemotek['manifest']>, scenarioCase: ScenarioCaseInterface, expectedCommand: Partial<NonNullable<ScenarioDataEntity.Type['commands']>[number]>): void {

    const {expected} = scenarioCase
    assert.equal(
      manifest.name,
      scenarioCase.expected?.name
    )
    assert.equal(
      manifest.description,
      expected?.description
    )
    assert.equal(
      manifest.commands.length,
      expected?.commands?.length ?? 0
    )

    const command = manifest.commands[0]
    assert.equal(
      command?.name,
      expectedCommand.name
    )
    assert.equal(
      command?.description,
      expectedCommand.description
    )
    assert.equal(
      command?.hasRunner,
      expectedCommand.hasRunner === true
    )
    assert.equal(
      command?.hasResultSchema,
      expectedCommand.hasResultSchema === true
    )

  }

  /** Asserts an MCP tool listing or tool call matches a scenario's expected outcome. */
  public static async assertMcpOutcome (mcp: MnemotekMcp, input: ScenarioDataEntity.Type): Promise<void> {

    if (input.shapeMode === 'list') {

      const tools = mcp.listTools()

      assert.equal(
        tools.tools.length,
        input.expectedLength
      )
      assert.equal(
        tools.tools[0]?.name,
        input.expectedToolName
      )
      assert.equal(
        typeof tools.tools[0]?.inputSchema,
        'object'
      )
      return

    }

    const result = await mcp.callTool(
      input.toolName ?? 'inspect',
      input.toolArguments ?? {}
    )
    assert.equal(
      result.isError,
      input.expectedIsError === true
    )
    if (typeof input.expectedToolName === 'string') {

      assert.equal(
        input.toolName,
        input.expectedToolName
      )

    }

    if (typeof input.expectedToolText === 'string') {

      assert.equal(
        result.content?.[0]?.text,
        input.expectedToolText
      )

    }

    if (typeof input.expectedToolErrorText === 'string') {

      assert.equal(
        result.content?.[0]?.text,
        input.expectedToolErrorText
      )

    }

  }

  /**
   * Captures the outbound `message` and full config payload from a command runner's
   * config argument into a shared mutable result, reused by every scenario runner that
   * needs to observe what the application handed to the command.
   */
  public static captureRunnerOutput (capture: {config: Record<string, unknown>;
    message: string;}, config: unknown): undefined {

    if (config === null || typeof config !== 'object') {

      return undefined

    }

    const messageValue = Reflect.get(
      config,
      'message'
    )
    const nextMessage = typeof messageValue === 'string'
      ? messageValue
      : ''
    if (nextMessage.length > 0) {

      capture.message = nextMessage

    }
    const nextConfig = MnemotekLoopTests.cloneValue(config)
    if (nextConfig !== undefined && nextConfig !== null && typeof nextConfig === 'object') {

      capture.config = nextConfig

    }

    return undefined

  }

  public static cloneValue (input: unknown): ScenarioDataEntity.Type | undefined {

    if (input === undefined) {

      return undefined

    }

    return JSON.parse(JSON.stringify(input))

  }

  public static createTempProject (fixture: ScenarioDataEntity.Type): string {

    const root = mkdtempSync(path.join(
      tmpdir(),
      'mnemotek-test-'
    ))
    const fixtureRoot = path.join(
      root,
      'project'
    )
    mkdirSync(fixtureRoot)

    const packageJson = fixture.packageJson ?? {name: 'mnemotek-test-project'}
    writeFileSync(
      path.join(
        fixtureRoot,
        'package.json'
      ),
      JSON.stringify(packageJson),
      'utf-8'
    )

    if (fixture.autoConfig !== undefined) {

      const configDirectory = path.join(
        fixtureRoot,
        '.mnemotek'
      )
      mkdirSync(configDirectory)
      writeFileSync(
        path.join(
          configDirectory,
          `${fixture.appName ?? 'mnemotek'}.json`
        ),
        JSON.stringify(fixture.autoConfig),
        'utf-8'
      )

    }

    if (fixture.environmentContent !== undefined) {

      writeFileSync(
        path.join(
          fixtureRoot,
          '.env'
        ),
        fixture.environmentContent,
        'utf-8'
      )

    }

    if (fixture.cliConfigContent !== undefined && fixture.cliConfigPath !== undefined) {

      writeFileSync(
        path.join(
          fixtureRoot,
          fixture.cliConfigPath
        ),
        JSON.stringify(fixture.cliConfigContent),
        'utf-8'
      )

    }

    if (fixture.configFile !== undefined && fixture.cliConfigPath === undefined) {

      writeFileSync(
        path.join(
          fixtureRoot,
          'config.json'
        ),
        JSON.stringify(fixture.configFile),
        'utf-8'
      )

    }

    return fixtureRoot

  }

  public static async runCliManifestScenario (scenarioCase: ScenarioCaseInterface): Promise<{output: string;
    status: number;}> {

    const output: string[] = []
    const outputSpy = mock.method(
      process.stdout,
      'write',
      (chunk: unknown) => {

        output.push(String(chunk))
        return true

      }
    )
    try {

      const app = new Mnemotek({
        description: 'Mnemotek loop suite',
        name: scenarioCase.input?.appName ?? 'mnemotek'
      })
      app.command({
        description: 'Inspect',
        name: 'inspect',
        schema: MnemotekLoopTests.schemaForKey('cli-default')
      })

      const status = await MnemotekCli.execute(
        app,
        scenarioCase.input?.argv ?? []
      )

      return {
        output: output.join(''),
        status
      }

    } finally {

      outputSpy.mock.restore()

    }

  }

  public static async runCliScenario (scenarioCase: ScenarioCaseInterface): Promise<{capturedConfig: Record<string, unknown>;
    capturedMessage: string;
    status: number;}> {

    const originalCwd = process.cwd()
    const input = MnemotekLoopTests.cloneValue(scenarioCase.input) ?? {}
    const projectRoot = MnemotekLoopTests.createTempProject(input)
    const capture = {config: {} as Record<string, unknown>,
      message: ''}

    const app = new Mnemotek({
      description: 'Mnemotek loop suite',
      name: 'mnemotek'
    })
    const schema = MnemotekLoopTests.schemaForKey(input.schemaKey ?? 'cli-default')
    const runner = (config: unknown): undefined => {

      MnemotekLoopTests.captureRunnerOutput(
        capture,
        config
      )
      return undefined

    }
    app.command({
      description: 'Inspect',
      name: 'inspect',
      runner,
      schema: schema
    })

    try {

      process.chdir(projectRoot)
      const restoreEnvironment = MnemotekLoopTests.withTemporaryEnvironment(input.environmentOverrides ?? {})

      try {

        const status = await MnemotekCli.execute(
          app,
          input.argv
        )

        return {capturedConfig: capture.config,
          capturedMessage: capture.message,
          status}

      } finally {

        restoreEnvironment()

      }

    } finally {

      process.chdir(originalCwd)
      rmSync(
        projectRoot,
        {force: true,
          recursive: true}
      )

    }

  }

  public static async runConfigurationScenario (scenarioCase: ScenarioCaseInterface): Promise<Record<string, unknown>> {

    const originalCwd = process.cwd()
    const input = MnemotekLoopTests.cloneValue(scenarioCase.input) ?? {}
    const projectRoot = MnemotekLoopTests.createTempProject(input)

    try {

      process.chdir(projectRoot)
      const restoreEnvironment = MnemotekLoopTests.withTemporaryEnvironment(input.environmentOverrides ?? {})

      try {

        const schema = MnemotekLoopTests.schemaForKey(input.schemaKey ?? 'configuration-basics')
        return await MnemotekConfiguration.load({
          appName: input.appName ?? 'mnemotek',
          commandLineArguments: input.commandLineArguments ?? {},
          commandName: input.commandName ?? 'inspect',
          interactive: false,
          schema: schema
        })

      } finally {

        restoreEnvironment()

      }

    } finally {

      process.chdir(originalCwd)
      rmSync(
        projectRoot,
        {force: true,
          recursive: true}
      )

    }

  }

  public static async runInteractiveScenario (scenarioCase: ScenarioCaseInterface): Promise<{capturedConfig: Record<string, unknown>;
    capturedMessage: string;
    promptCalls: number;
    status: number;}> {

    const promptReply = scenarioCase.input?.promptReply ?? {}
    const originalCwd = process.cwd()
    const input = MnemotekLoopTests.cloneValue(scenarioCase.input) ?? {}
    const projectRoot = MnemotekLoopTests.createTempProject(input)
    const capture = {config: {} as Record<string, unknown>,
      message: ''}

    const promptSpy = mock.method(
      Enquirer.prototype,
      'prompt',
      async function () {

        const reply = await Promise.resolve(promptReply)
        return reply

      }
    )

    const app = new Mnemotek({
      description: 'Mnemotek loop suite',
      name: 'mnemotek'
    })
    const schema = MnemotekLoopTests.schemaForKey(input.schemaKey ?? 'interactive-required')
    const runner = (config: unknown): undefined => {

      MnemotekLoopTests.captureRunnerOutput(
        capture,
        config
      )
      return undefined

    }
    app.command({
      description: 'Inspect',
      name: 'inspect',
      runner,
      schema: schema
    })

    try {

      process.chdir(projectRoot)
      const restoreEnvironment = MnemotekLoopTests.withTemporaryEnvironment(input.environmentOverrides ?? {})

      try {

        const status = await MnemotekCli.execute(
          app,
          input.argv
        )

        return {
          capturedConfig: capture.config,
          capturedMessage: capture.message,
          promptCalls: promptSpy.mock.callCount(),
          status
        }

      } finally {

        restoreEnvironment()

      }

    } finally {

      promptSpy.mock.restore()
      process.chdir(originalCwd)
      rmSync(
        projectRoot,
        {force: true,
          recursive: true}
      )

    }

  }

  public static runManifestScenario (scenarioCase: ScenarioCaseInterface): void {

    const {expected} = scenarioCase
    const schema = MnemotekLoopTests.schemaForKey(expected?.schemaKey ?? 'manifest-basic')
    const expectedCommand = expected?.commands?.[0] ?? {}
    const expectedCommandName = typeof expectedCommand.name === 'string'
      ? expectedCommand.name
      : 'inspect'
    const expectedCommandDescription = typeof expectedCommand.description === 'string'
      ? expectedCommand.description
      : 'Inspect command with defaults.'
    const shouldHaveRunner = expectedCommand.hasRunner === true
    const hasResultSchema = expectedCommand.hasResultSchema === true
    const app = new Mnemotek({
      description: expected?.description ?? 'Inspect command with defaults.',
      name: expected?.name ?? 'mnemotek'
    })
    const resultSchema = hasResultSchema
      ? {
        additionalProperties: true,
        properties: {message: {type: 'string'}},
        required: ['message'],
        type: 'object'
      }
      : undefined
    const manifestRunner = (): CommandResultEntity.Type => {

      return {message: 'ok'}

    }

    app.command({
      description: expectedCommandDescription,
      name: expectedCommandName,
      resultSchema,
      runner: shouldHaveRunner
        ? manifestRunner
        : undefined,
      schema: schema
    })

    MnemotekLoopTests.assertManifestOutcome(
      app.manifest(),
      scenarioCase,
      expectedCommand
    )

  }

  public static async runMcpScenario (scenarioCase: ScenarioCaseInterface): Promise<void> {

    const input = MnemotekLoopTests.cloneValue(scenarioCase.input) ?? {}
    const schema = MnemotekLoopTests.schemaForKey(input.schemaKey ?? 'manifest-basic')
    const app = new Mnemotek({
      description: 'Mnemotek MCP suite',
      name: input.appName ?? 'mnemotek'
    })

    const resultSchema = input.resultSchema === false
      ? undefined
      : {
        additionalProperties: true,
        properties: {message: {type: 'string'}},
        required: ['message'],
        type: 'object'
      }
    const mcpRunner = (config: CommandPayloadEntity.Type): CommandResultEntity.Type => {

      if (input.expectedInvalidResult === true) {

        return 42

      }

      return {message: config.message}

    }

    app.command({
      description: 'Inspect',
      name: 'inspect',
      resultSchema: resultSchema,
      runner: mcpRunner,
      schema: schema
    })

    const mcp = MnemotekMcp.create(app)
    await MnemotekLoopTests.assertMcpOutcome(
      mcp,
      input
    )

  }

  public static runSkillManifestScenario (scenarioCase: ScenarioCaseInterface): void {

    const input = MnemotekLoopTests.cloneValue(scenarioCase.input) ?? {}
    const app = new Mnemotek({
      description: input.description ?? 'Mnemotek skill manifest suite',
      name: input.appName ?? 'mnemotek'
    })
    app.command({
      description: 'Inspect',
      name: 'inspect',
      schema: MnemotekLoopTests.schemaForKey('manifest-basic')
    })

    const output = app.skillManifestOutput(input.metaOnly === true)
    if (input.metaOnly === true) {

      const meta = output
      assert.equal(
        meta.name,
        input.expectedMetaName
      )
      assert.equal(
        meta.mcpBin,
        `${input.appName ?? 'mnemotek'}-mcp`
      )
      return

    }

    assert.equal(
      output.commands?.length,
      input.expectedCommandCount
    )

  }

  public static schemaForKey (schemaKey: string): SchemaObjectInterface {

    if (schemaKey === 'configuration-basics') {

      return {
        additionalProperties: true,
        properties: {
          count: {default: 1,
            type: 'number'},
          limits: {
            additionalProperties: true,
            properties: {attempts: {default: 2,
              type: 'number'}},
            type: 'object'
          },
          message: {default: 'from-schema',
            type: 'string'},
          token: {type: 'string'}
        },
        required: [
          'count',
          'message',
          'token'
        ],
        type: 'object'
      }

    }

    if (schemaKey === 'explicit-token') {

      return {
        additionalProperties: true,
        properties: {level: {default: 1,
          type: 'number'},
        token: {type: 'string'}},
        required: ['token'],
        type: 'object'
      }

    }

    if (schemaKey === 'cli-default') {

      return {
        additionalProperties: true,
        properties: {message: {default: 'ok',
          type: 'string'}},
        required: ['message'],
        type: 'object'
      }

    }

    if (schemaKey === 'cli-override') {

      return {
        additionalProperties: true,
        properties: {
          message: {type: 'string'},
          nested: {
            additionalProperties: true,
            properties: {label: {type: 'string'}},
            type: 'object'
          }
        },
        required: ['message'],
        type: 'object'
      }

    }

    if (schemaKey === 'interactive-required') {

      return {
        additionalProperties: true,
        properties: {count: {default: 3,
          type: 'number'},
        message: {type: 'string'}},
        required: ['message'],
        type: 'object'
      }

    }

    if (schemaKey === 'mcp-call-args') {

      return {
        additionalProperties: true,
        properties: {message: {default: 'from-tool-default',
          type: 'string'}},
        required: ['message'],
        type: 'object'
      }

    }

    if (schemaKey === 'manifest-basic') {

      return {
        additionalProperties: true,
        properties: {message: {default: 'ok',
          type: 'string'}},
        required: ['message'],
        type: 'object'
      }

    }

    throw new TypeError(`Unknown schema key: ${schemaKey}`)

  }

  public static withTemporaryEnvironment (overrides: Record<string, unknown>): () => void {

    const originalEnvironment = {...process.env}

    for (const [
      key,
      value
    ] of Object.entries(overrides)) {

      process.env[key] = typeof value === 'string'
        ? value
        : undefined

    }

    return () => {

      for (const key of Object.keys(process.env)) {

        if (originalEnvironment[key] === undefined) {

          Reflect.deleteProperty(
            process.env,
            key
          )

        }

      }

      for (const [
        key,
        value
      ] of Object.entries(originalEnvironment)) {

        process.env[key] = value

      }

    }

  }

}

const runnerMap: Record<string, (scenarioCase: ScenarioCaseInterface) => Promise<void> | void> = {
  cli: async (scenarioCase: ScenarioCaseInterface): Promise<void> => {

    const outcome = await MnemotekLoopTests.runCliScenario(scenarioCase)
    assert.equal(
      outcome.status,
      scenarioCase.input?.expectedStatus
    )
    assert.equal(
      outcome.capturedMessage,
      scenarioCase.input?.expectedMessage
    )

  },
  'cli-manifest': async (scenarioCase: ScenarioCaseInterface): Promise<void> => {

    const outcome = await MnemotekLoopTests.runCliManifestScenario(scenarioCase)
    assert.equal(
      outcome.status,
      scenarioCase.input?.expectedStatus
    )
    assert.equal(
      outcome.output.includes(scenarioCase.input?.expectedOutputFragment ?? ''),
      true
    )

  },
  configuration: async (scenarioCase: ScenarioCaseInterface): Promise<void> => {

    const result = await MnemotekLoopTests.runConfigurationScenario(scenarioCase)
    assert.deepStrictEqual(
      result,
      scenarioCase.input?.expected
    )

  },
  interactive: async (scenarioCase: ScenarioCaseInterface): Promise<void> => {

    const outcome = await MnemotekLoopTests.runInteractiveScenario(scenarioCase)
    assert.equal(
      outcome.status,
      scenarioCase.input?.expectedStatus
    )
    assert.equal(
      outcome.capturedMessage,
      scenarioCase.input?.expectedMessage
    )
    assert.equal(
      outcome.capturedConfig.count,
      scenarioCase.input?.expectedCount
    )
    assert.equal(
      outcome.promptCalls,
      2
    )

  },
  manifest: (scenarioCase: ScenarioCaseInterface): void => {

    MnemotekLoopTests.runManifestScenario(scenarioCase)

  },
  mcp: async (scenarioCase: ScenarioCaseInterface): Promise<void> => {

    await MnemotekLoopTests.runMcpScenario(scenarioCase)

  },
  'skill-manifest': (scenarioCase: ScenarioCaseInterface): void => {

    MnemotekLoopTests.runSkillManifestScenario(scenarioCase)

  }
}

void describe(
  'Mnemotek loop suite',
  () => {

    RunScenarioGroups.run({
      groups: scenarioGroups,
      runnerMap
    })

  }
)
