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
import type {ScenarioDataEntity} from '../entities/ScenarioDataEntity.js'

import {
  Mnemotek,
  MnemotekCli,
  MnemotekConfiguration,
  MnemotekMcp
} from '../../src/index.js'
import {RunScenarioGroups} from '../support/runScenarioGroups.js'
import scenarioGroupsData from './mnemotek.scenarios.json' with {type: 'json'}

interface ScenarioCaseInterface {
  expected?: ScenarioDataInterface;
  input?: ScenarioDataInterface;
  shape?: string;
}

type ScenarioDataInterface = ScenarioDataEntity.Type

type ScenarioMapInterface = Readonly<Record<string, ScenarioCaseInterface[]>>

const scenarioGroups = scenarioGroupsData as ScenarioMapInterface

class MnemotekLoopTests {

  public static cloneValue (input: unknown): ScenarioDataInterface | undefined {

    if (input === undefined) {

      return undefined

    }

    return JSON.parse(JSON.stringify(input))

  }

  public static createTempProject (fixture: ScenarioDataInterface): string {

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

    if (fixture.envContent !== undefined) {

      writeFileSync(
        path.join(
          fixtureRoot,
          '.env'
        ),
        fixture.envContent,
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
        runner: () => {

          const result = undefined
          return result

        },
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
    let capturedMessage = ''
    let capturedConfig: Record<string, unknown> = {}

    const app = new Mnemotek({
      description: 'Mnemotek loop suite',
      name: 'mnemotek'
    })
    const schema = MnemotekLoopTests.schemaForKey(input.schemaKey ?? 'cli-default')
    app.command({
      description: 'Inspect',
      name: 'inspect',
      runner: (config) => {

        if (
          config !== null &&
          typeof config === 'object'
        ) {

          const messageValue = Reflect.get(
            config,
            'message'
          )
          const nextMessage = typeof messageValue === 'string'
            ? messageValue
            : ''
          if (nextMessage.length > 0) {

            capturedMessage = nextMessage

          }
          const nextConfig = MnemotekLoopTests.cloneValue(config)
          if (nextConfig !== undefined && nextConfig !== null && typeof nextConfig === 'object') {

            capturedConfig = nextConfig

          }

        }

        return undefined

      },
      schema: schema
    })

    try {

      process.chdir(projectRoot)
      const restoreEnvironment = MnemotekLoopTests.withTemporaryEnvironment(input.envOverrides ?? {})

      try {

        const status = await MnemotekCli.execute(
          app,
          input.argv
        )

        return {capturedConfig,
          capturedMessage,
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
      const restoreEnvironment = MnemotekLoopTests.withTemporaryEnvironment(input.envOverrides ?? {})

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
    let capturedMessage = ''
    let capturedConfig: Record<string, unknown> = {}

    const promptSpy = mock.method(
      Enquirer.prototype,
      'prompt',
      async function () {

        const result = promptReply
        return result

      }
    )

    const app = new Mnemotek({
      description: 'Mnemotek loop suite',
      name: 'mnemotek'
    })
    const schema = MnemotekLoopTests.schemaForKey(input.schemaKey ?? 'interactive-required')
    app.command({
      description: 'Inspect',
      name: 'inspect',
      runner: (config) => {

        if (
          config !== null &&
          typeof config === 'object'
        ) {

          const messageValue = Reflect.get(
            config,
            'message'
          )
          const nextMessage = typeof messageValue === 'string'
            ? messageValue
            : ''
          if (nextMessage.length > 0) {

            capturedMessage = nextMessage

          }
          const nextConfig = MnemotekLoopTests.cloneValue(config)
          if (nextConfig !== undefined && nextConfig !== null && typeof nextConfig === 'object') {

            capturedConfig = nextConfig

          }

        }

        return undefined

      },
      schema: schema
    })

    try {

      process.chdir(projectRoot)
      const restoreEnvironment = MnemotekLoopTests.withTemporaryEnvironment(input.envOverrides ?? {})

      try {

        const status = await MnemotekCli.execute(
          app,
          input.argv
        )

        return {
          capturedConfig,
          capturedMessage,
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

    app.command({
      description: expectedCommandDescription,
      name: expectedCommandName,
      resultSchema,
      runner: shouldHaveRunner
        ? () => {

          return {message: 'ok'}

        }
        : undefined,
      schema: schema
    })

    const manifest = app.manifest()
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

  public static async runMcpScenario (scenarioCase: ScenarioCaseInterface): Promise<void> {

    const input = MnemotekLoopTests.cloneValue(scenarioCase.input) as Record<string, any>
    const schema = MnemotekLoopTests.schemaForKey(input.schemaKey)
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

    app.command({
      description: 'Inspect',
      name: 'inspect',
      resultSchema: resultSchema,
      runner: (config) => {

        if (input.expectedInvalidResult === true) {

          return 42

        }

        return {message: config.message}

      },
      schema: schema
    })

    const mcp = MnemotekMcp.create(app)
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
      input.arguments ?? {}
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

  public static runSkillManifestScenario (scenarioCase: ScenarioCaseInterface): void {

    const input = MnemotekLoopTests.cloneValue(scenarioCase.input) as Record<string, any>
    const app = new Mnemotek({
      description: input.description ?? 'Mnemotek skill manifest suite',
      name: input.appName ?? 'mnemotek'
    })
    app.command({
      description: 'Inspect',
      name: 'inspect',
      runner: () => {

        const result = undefined
        return result

      },
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

    throw new TypeError(`Unknown schema key: ${String(schemaKey)}`)

  }

  public static withTemporaryEnvironment (overrides: Record<string, unknown>): () => void {

    const originalEnvironment = {...process.env}

    for (const [
      key,
      value
    ] of Object.entries(overrides)) {

    process.env[key] = typeof value === 'string' ? value : undefined

    }

    return () => {

      for (const key of Object.keys(process.env)) {

        if (originalEnvironment[key] === undefined) {

          delete process.env[key]

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
  manifest: MnemotekLoopTests.runManifestScenario,
  mcp: MnemotekLoopTests.runMcpScenario,
  'skill-manifest': MnemotekLoopTests.runSkillManifestScenario
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
