import {Mnemotek, MnemotekAppFactory} from '@studnicky/mnemotek'
import {existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, symlinkSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {basename, dirname, join, relative, resolve, sep} from 'node:path'
import process from 'node:process'

import type {EntryFilterOverridesEntity, MemoriaApplyResultEntity, MemoriaDiffResultEntity, MemoriaDoctorResultEntity, MemoriaSecretsBrokerEntity, MemoriaSecretsResultEntity, MemoriaStatusResultEntity, MemoriaVerifyResultEntity} from '../entities/index.js'

import {MemoriaCatalogActionEntity, MemoriaCatalogDomainEntity, MemoriaDoctorCheckEntity} from '../entities/index.js'
import {ApplyEngine} from './applyEngine.js'
import {AtomicWrite} from './atomicWrite.js'
import {CatalogRegistry} from './catalog/catalogRegistry.js'
import {CatalogWriter} from './catalog/catalogWriter.js'
import {MEMORIA_APP_SCHEMA} from './constants/MemoriaAppConstants.js'
import {MEMORIA_DEFAULTS} from './constants/MemoriaDefaultsConstants.js'
import {DoctorDispatch} from './doctor/doctorDispatch.js'
import {DriftEngine} from './driftEngine.js'
import {ExecCliTool} from './execCliTool.js'
import {HostFacts} from './hostFacts.js'
import {LockFile} from './lockFile.js'
import {ManifestStore} from './manifestStore.js'

export class MemoriaApp {

  public static createMemoriaApp (): Mnemotek {

    const app = new Mnemotek({
      description: 'Agent-native dotfile manager: templated apply, drift status, seed-once files, and adoption of live dotfiles into managed storage. No daemon, no network dependency for core operations.',
      name: 'memoria-tool',
      version: '0.1.0'
    })

    MnemotekAppFactory.registerCommands(
      app,
      {
        description: 'Adopt a live dotfile into managed storage: copy+verify, write a link-mode manifest entry, then atomically replace the original with a symlink. With scan, report known dotfile candidates present on disk but absent from the manifest (never auto-adopts).',
        name: 'adopt',
        runner: MemoriaApp.adoptRunner,
        schema: {
          additionalProperties: false,
          properties: {
            path: {description: 'Path to a live file to adopt into managed storage.',
              type: 'string'},
            scan: {description: 'Scan a fixed candidate list of common dotfiles for files present on disk but not yet in the manifest.',
              type: 'boolean'}
          },
          type: 'object'
        }
      },
      {
        description: 'Render each manifest entry\'s template and write it to its target, skipping entries whose live content already matches (idempotent) and seed-once entries already consumed.',
        name: 'apply',
        runner: MemoriaApp.applyRunner,
        schema: {
          additionalProperties: false,
          properties: {
            dryRun: {description: 'Report what would be written/skipped without writing anything or mutating the manifest.',
              type: 'boolean'},
            host: MEMORIA_APP_SCHEMA.HOST_OPTION,
            manifest: MEMORIA_APP_SCHEMA.MANIFEST_OPTION,
            os: MEMORIA_APP_SCHEMA.OS_OPTION
          },
          type: 'object'
        }
      },
      {
        description: 'Compare rendered manifest entries against live targets: added (missing on disk), modified (content differs), removed (always empty in this build).',
        name: 'diff',
        runner: MemoriaApp.diffRunner,
        schema: {
          additionalProperties: false,
          properties: {
            host: MEMORIA_APP_SCHEMA.HOST_OPTION,
            manifest: MEMORIA_APP_SCHEMA.MANIFEST_OPTION,
            os: MEMORIA_APP_SCHEMA.OS_OPTION
          },
          type: 'object'
        }
      },
      {
        description: 'Three-way classification of manifest entries and watchGlobs-discovered files: managed, unmanaged, missing.',
        name: 'status',
        runner: MemoriaApp.statusRunner,
        schema: {
          additionalProperties: false,
          properties: {
            manifest: MEMORIA_APP_SCHEMA.MANIFEST_OPTION
          },
          type: 'object'
        }
      },
      {
        description: 'Runs apply against a fresh temp sandbox root instead of the real home directory, reporting any render/write failure before the manifest is ever run against a real machine. v1 limitation: HOME/XDG/GNUPGHOME env-var redirection, not real OS-level container isolation.',
        name: 'verify',
        runner: MemoriaApp.verifyRunner,
        schema: {
          additionalProperties: false,
          properties: {
            keepArtifacts: {description: 'Keep the temp sandbox directory after the run instead of deleting it.',
              type: 'boolean'},
            manifest: MEMORIA_APP_SCHEMA.MANIFEST_OPTION
          },
          type: 'object'
        }
      },
      {
        description: 'Shallow-clones a remote manifest repo and previews (default) or applies (--apply) it. Defaults to preview-only; a manifest entry whose target escapes $HOME is rejected the same way apply rejects it.',
        name: 'bootstrap',
        runner: MemoriaApp.bootstrapRunner,
        schema: {
          additionalProperties: false,
          properties: {
            apply: {description: 'Write for real instead of previewing. Defaults to false.',
              type: 'boolean'},
            branch: {description: 'Branch to clone.',
              type: 'string'},
            remote: {description: 'Git URL to shallow-clone a memoria.manifest.json from.',
              type: 'string'}
          },
          required: ['remote'],
          type: 'object'
        }
      },
      {
        description: 'Detects the first secrets broker present on PATH (1password/age/gpg/pass) and reports its identity and session validity. Never surfaces resolved secret values.',
        name: 'secrets',
        runner: MemoriaApp.secretsRunner,
        schema: {
          additionalProperties: false,
          properties: {},
          type: 'object'
        }
      },
      {
        description: 'Bundled snippet catalog (gitignore/git/agent-config). list reports available entries; apply prints the exact content about to be written, then merges it into .gitignore (gitignore domain) or a diffable .git-catalog-applied.gitconfig fragment (git domain) — never executed through git config directly.',
        name: 'catalog',
        runner: MemoriaApp.catalogRunner,
        schema: {
          additionalProperties: false,
          properties: {
            action: {description: 'list or apply.',
              enum: MemoriaCatalogActionEntity.Schema.enum,
              type: 'string'},
            domain: {description: 'Filter list by domain.',
              enum: MemoriaCatalogDomainEntity.Schema.enum,
              type: 'string'},
            entry: {description: 'Required with action: apply. Format "domain/name" or "domain/name1,name2" (gitignore domain only).',
              type: 'string'},
            root: {description: 'Project root to apply into. Defaults to the current working directory.',
              type: 'string'}
          },
          required: ['action'],
          type: 'object'
        }
      },
      {
        description: 'Runs rc-hygiene, secrets-scan, envrc-audit, and archive-tools checks by default. startup-profile spawns a real shell and only runs when explicitly requested via checks.',
        name: 'doctor',
        runner: MemoriaApp.doctorRunner,
        schema: {
          additionalProperties: false,
          properties: {
            checks: {description: 'Checks to run. Defaults to every check except startup-profile.',
              items: {enum: MemoriaDoctorCheckEntity.Schema.enum,
                type: 'string'},
              type: 'array'},
            rc: {description: 'rc file paths to inspect. Defaults to [~/.zshrc, ~/.bashrc, ~/.profile].',
              items: {type: 'string'},
              type: 'array'}
          },
          type: 'object'
        }
      }
    )
    return app

  }

  private static adoptPath (manifestPathInput: string, homeRoot: string, inputPath: string): string {

    const manifestDir = dirname(resolve(manifestPathInput))
    const originalPath = resolve(inputPath)
    const originalContent = readFileSync(originalPath)

    mkdirSync(
      join(
        manifestDir,
        'sources'
      ),
      {recursive: true}
    )

    const managedRelative = join(
      'sources',
      basename(originalPath)
    ).
      split(sep).
      join('/')
    const managedAbsolute = join(
      manifestDir,
      'sources',
      basename(originalPath)
    )

    AtomicWrite.write(
      managedAbsolute,
      originalContent
    )

    const verifyContent = readFileSync(managedAbsolute)

    if (!verifyContent.equals(originalContent)) {

      throw new Error(`Adopt verification failed: managed copy at "${managedAbsolute}" does not match source "${originalPath}".`)

    }

    const targetRepresentation = ManifestStore.isDescendant(
      homeRoot,
      originalPath
    )
      ? `~/${relative(
        homeRoot,
        originalPath
      ).
        split(sep).
        join('/')}`
      : originalPath

    ManifestStore.appendEntry(
      manifestPathInput,
      {
        mode: 'link',
        source: managedRelative,
        target: targetRepresentation
      }
    )

    const symlinkTempPath = `${originalPath}.symlink-tmp-${String(process.pid)}`
    symlinkSync(
      managedAbsolute,
      symlinkTempPath
    )
    renameSync(
      symlinkTempPath,
      originalPath
    )

    return originalPath

  }

  private static readonly adoptRunner = (payload: Record<string, unknown>): MemoriaApplyResultEntity.Type => {

    const manifestPathInput = MemoriaApp.resolveManifestPath(payload)
    const homeRoot = HostFacts.resolveHomeRoot()
    const manifestDir = dirname(resolve(manifestPathInput))
    const lockPath = join(
      manifestDir,
      MEMORIA_DEFAULTS.LOCK_FILE_NAME
    )

    return LockFile.withLock(
      lockPath,
      (): MemoriaApplyResultEntity.Type => {

        const adopted: string[] = []
        const skipped: string[] = []

        if (typeof payload.path === 'string') {

          adopted.push(MemoriaApp.adoptPath(
            manifestPathInput,
            homeRoot,
            payload.path
          ))

        }

        if (payload.scan === true) {

          skipped.push(...MemoriaApp.scanForUnadopted(
            manifestPathInput,
            homeRoot
          ))

        }

        return {adopted,
          consumed: [],
          skipped,
          written: []}

      }
    )

  }

  private static readonly applyRunner = (payload: Record<string, unknown>): MemoriaApplyResultEntity.Type => {

    const manifestPathInput = MemoriaApp.resolveManifestPath(payload)
    const manifestDir = dirname(resolve(manifestPathInput))
    const lockPath = join(
      manifestDir,
      MEMORIA_DEFAULTS.LOCK_FILE_NAME
    )
    const dryRun = payload.dryRun === true
    const overrides = MemoriaApp.extractOverrides(payload)

    return LockFile.withLock(
      lockPath,
      (): MemoriaApplyResultEntity.Type => {

        const manifest = ManifestStore.load(manifestPathInput)
        const host = HostFacts.collect()
        return ApplyEngine.run(
          manifest,
          host,
          {dryRun,
            manifestPathInput,
            overrides}
        )

      }
    )

  }

  private static readonly bootstrapRunner = (payload: Record<string, unknown>): MemoriaApplyResultEntity.Type | MemoriaDiffResultEntity.Type => {

    if (typeof payload.remote !== 'string') {

      throw new TypeError('bootstrap requires a "remote" git URL.')

    }

    const remote = payload.remote
    const branch = typeof payload.branch === 'string'
      ? payload.branch
      : undefined
    const apply = payload.apply === true

    const cloneDir = mkdtempSync(join(
      tmpdir(),
      'memoria-bootstrap-'
    ))

    try {

      const cloneArguments = MemoriaApp.toArgumentList(
        'clone',
        '--depth',
        '1'
      )

      if (branch !== undefined) {

        cloneArguments.push(
          '--branch',
          branch
        )

      }

      cloneArguments.push(
        remote,
        cloneDir
      )
      ExecCliTool.run(
        'git',
        cloneArguments,
        {timeout: MEMORIA_DEFAULTS.BOOTSTRAP_CLONE_TIMEOUT_MS}
      )

      const manifestPath = join(
        cloneDir,
        'memoria.manifest.json'
      )

      if (!existsSync(manifestPath)) {

        throw new Error(`No memoria.manifest.json found at the root of "${remote}".`)

      }

      if (!apply) {

        const manifest = ManifestStore.load(manifestPath)
        const host = HostFacts.collect()
        const classification = DriftEngine.compare(
          manifest,
          host,
          {}
        )
        return {
          added: [...classification.missing],
          modified: [...classification.modified],
          removed: []
        }

      }

      const lockPath = join(
        cloneDir,
        MEMORIA_DEFAULTS.LOCK_FILE_NAME
      )
      return LockFile.withLock(
        lockPath,
        (): MemoriaApplyResultEntity.Type => {

          const manifest = ManifestStore.load(manifestPath)
          const host = HostFacts.collect()
          return ApplyEngine.run(
            manifest,
            host,
            {dryRun: false,
              manifestPathInput: manifestPath,
              overrides: {}}
          )

        }
      )

    } finally {

      rmSync(
        cloneDir,
        {force: true,
          recursive: true}
      )

    }

  }

  private static catalogApply (payload: Record<string, unknown>): MemoriaApplyResultEntity.Type {

    if (typeof payload.entry !== 'string') {

      throw new TypeError('catalog apply requires an "entry".')

    }

    const root = typeof payload.root === 'string'
      ? resolve(payload.root)
      : process.cwd()
    const lockPath = join(
      root,
      MEMORIA_DEFAULTS.LOCK_FILE_NAME
    )

    return LockFile.withLock(
      lockPath,
      (): MemoriaApplyResultEntity.Type => {

        const resolvedEntries = CatalogRegistry.resolve(payload.entry as string)
        const preview = resolvedEntries.map((resolvedEntry): string => {

          const result = `# memoria catalog: ${resolvedEntry.domain}/${resolvedEntry.name}\n${resolvedEntry.content}`
          return result

        })

        const domain = resolvedEntries[0]?.domain

        if (domain === 'gitignore') {

          const added = CatalogWriter.applyGitignore(
            root,
            resolvedEntries
          )
          const gitignorePath = join(
            root,
            '.gitignore'
          )
          return {adopted: [],
            consumed: [],
            preview,
            skipped: added.length === 0
              ? [gitignorePath]
              : [],
            written: added.length > 0
              ? [gitignorePath]
              : []}

        }

        if (domain === 'git') {

          const addedNames = CatalogWriter.applyGitFragment(
            root,
            resolvedEntries
          )
          const fragmentPath = join(
            root,
            '.git-catalog-applied.gitconfig'
          )
          return {adopted: [],
            consumed: [],
            preview,
            skipped: addedNames.length === 0
              ? [fragmentPath]
              : [],
            written: addedNames.length > 0
              ? [fragmentPath]
              : []}

        }

        throw new Error(`Catalog domain "${String(domain)}" has no apply handler yet.`)

      }
    )

  }

  private static readonly catalogRunner = (payload: Record<string, unknown>): MemoriaApplyResultEntity.Type | string[] => {

    if (payload.action === 'list') {

      const domain = typeof payload.domain === 'string'
        ? payload.domain as MemoriaCatalogDomainEntity.Type
        : undefined
      return [...CatalogRegistry.list(domain)]

    }

    if (payload.action === 'apply') {

      return MemoriaApp.catalogApply(payload)

    }

    throw new TypeError(`Unknown catalog action '${String(payload.action)}'.`)

  }

  private static checkBrokerSession (broker: MemoriaSecretsBrokerEntity.Type): boolean {

    if (broker === '1password') {

      return ExecCliTool.run(
        'op',
        ['whoami'],
        {allowFail: true}
      ).length > 0

    }

    if (broker === 'gpg') {

      return ExecCliTool.run(
        'gpg-connect-agent',
        ['/bye'],
        {allowFail: true}
      ).includes('OK')

    }

    // age and pass have no persistent session concept; presence on PATH is treated as ready.
    return true

  }

  private static readonly diffRunner = (payload: Record<string, unknown>): MemoriaDiffResultEntity.Type => {

    const manifestPathInput = MemoriaApp.resolveManifestPath(payload)
    const manifest = ManifestStore.load(manifestPathInput)
    const host = HostFacts.collect()
    const overrides = MemoriaApp.extractOverrides(payload)

    const classification = DriftEngine.compare(
      manifest,
      host,
      overrides
    )

    return {
      added: [...classification.missing],
      modified: [...classification.modified],
      removed: []
    }

  }

  private static readonly doctorRunner = (payload: Record<string, unknown>): MemoriaDoctorResultEntity.Type => {

    const homeRoot = HostFacts.resolveHomeRoot()
    const checks = Array.isArray(payload.checks) && payload.checks.every((entry): entry is MemoriaDoctorCheckEntity.Type => {

      return typeof entry === 'string'

    })
      ? payload.checks
      : undefined
    const rcPaths = MemoriaApp.resolveRcPaths(
      payload,
      homeRoot
    )

    return DoctorDispatch.run(
      checks,
      rcPaths,
      homeRoot
    )

  }

  private static extractOverrides (payload: Record<string, unknown>): EntryFilterOverridesEntity.Type {

    return {
      host: typeof payload.host === 'string'
        ? payload.host
        : undefined,
      os: typeof payload.os === 'string'
        ? payload.os
        : undefined
    }

  }

  private static resolveManifestPath (payload: Record<string, unknown>): string {

    return typeof payload.manifest === 'string'
      ? payload.manifest
      : MEMORIA_DEFAULTS.DEFAULT_MANIFEST_PATH

  }

  private static resolveRcPaths (payload: Record<string, unknown>, homeRoot: string): readonly string[] {

    const rawRcPaths = Array.isArray(payload.rc) && payload.rc.every((entry): entry is string => {

      return typeof entry === 'string'

    })
      ? payload.rc
      : MEMORIA_DEFAULTS.DEFAULT_RC_FILES

    return rawRcPaths.map((rawPath): string => {

      const result = ManifestStore.resolveTarget(
        rawPath,
        homeRoot
      )
      return result

    })

  }

  private static restoreEnvironment (previous: Record<string, string | undefined>): void {

    for (const [
      key,
      value
    ] of Object.entries(previous)) {

      if (value === undefined) {

        Reflect.deleteProperty(
          process.env,
          key
        )

      } else {

        process.env[key] = value

      }

    }

  }

  private static scanForUnadopted (manifestPathInput: string, homeRoot: string): string[] {

    const knownTargets = existsSync(resolve(manifestPathInput))
      ? new Set(ManifestStore.load(manifestPathInput).entries.map((resolved): string => {

        const result = resolved.resolvedTarget
        return result

      }))
      : new Set<string>()

    const found: string[] = []

    for (const candidate of MEMORIA_DEFAULTS.SCAN_CANDIDATES) {

      const candidatePath = join(
        homeRoot,
        candidate
      )

      if (existsSync(candidatePath) && !knownTargets.has(candidatePath)) {

        found.push(candidatePath)

      }

    }

    return found

  }

  private static readonly secretsRunner = (): MemoriaSecretsResultEntity.Type => {

    const brokers: ReadonlyArray<{binary: string;
      name: MemoriaSecretsBrokerEntity.Type;}> = [
      {binary: 'age',
        name: 'age'},
      {binary: 'gpg',
        name: 'gpg'},
      {binary: 'op',
        name: '1password'},
      {binary: 'pass',
        name: 'pass'}
    ]

    for (const broker of brokers) {

      const found = ExecCliTool.run(
        'sh',
        MemoriaApp.toArgumentList(
          '-c',
          `command -v ${broker.binary}`
        ),
        {allowFail: true}
      )

      if (found.length === 0) {

        continue

      }

      return {broker: broker.name,
        sessionValid: MemoriaApp.checkBrokerSession(broker.name)}

    }

    return {broker: 'none',
      sessionValid: false}

  }

  private static readonly statusRunner = (payload: Record<string, unknown>): MemoriaStatusResultEntity.Type => {

    const manifestPathInput = MemoriaApp.resolveManifestPath(payload)
    const manifest = ManifestStore.load(manifestPathInput)
    const host = HostFacts.collect()

    const classification = DriftEngine.compare(
      manifest,
      host,
      {}
    )
    const unmanaged = DriftEngine.unmanaged(manifest)

    return {
      managed: [...classification.managed],
      missing: [...classification.missing],
      unmanaged: [...unmanaged]
    }

  }

  /** Variadic wrapper so ordered CLI argument lists aren't subject to array-literal sort ordering. */
  private static toArgumentList (...parts: string[]): string[] {

    const result = parts
    return result

  }

  private static readonly verifyRunner = (payload: Record<string, unknown>): MemoriaVerifyResultEntity.Type => {

    const manifestPathInput = MemoriaApp.resolveManifestPath(payload)
    const keepArtifacts = payload.keepArtifacts === true
    const sandboxRoot = mkdtempSync(join(
      tmpdir(),
      'memoria-verify-'
    ))

    const previousEnvironment = {
      GNUPGHOME: process.env.GNUPGHOME,
      HOME: process.env.HOME,
      XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME,
      XDG_DATA_HOME: process.env.XDG_DATA_HOME
    }

    const failures: string[] = []

    try {

      /*
       * v1 limitation: env-var redirection (HOME/XDG/GNUPGHOME) for any shelled
       * call made during the run, not real OS-level container isolation.
       */
      process.env.HOME = sandboxRoot
      process.env.XDG_CONFIG_HOME = join(
        sandboxRoot,
        '.config'
      )
      process.env.XDG_DATA_HOME = join(
        sandboxRoot,
        '.local',
        'share'
      )
      process.env.GNUPGHOME = join(
        sandboxRoot,
        '.gnupg'
      )

      const manifest = ManifestStore.load(
        manifestPathInput,
        sandboxRoot
      )
      const host = HostFacts.collect()
      ApplyEngine.run(
        manifest,
        host,
        {dryRun: false,
          manifestPathInput,
          overrides: {},
          trackConsumed: false}
      )

    } catch (error: unknown) {

      failures.push(error instanceof Error
        ? error.message
        : String(error))

    } finally {

      MemoriaApp.restoreEnvironment(previousEnvironment)

      if (!keepArtifacts) {

        rmSync(
          sandboxRoot,
          {force: true,
            recursive: true}
        )

      }

    }

    return {failures,
      ok: failures.length === 0}

  }

}
