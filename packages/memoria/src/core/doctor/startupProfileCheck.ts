import process from 'node:process'

import type {MemoriaDoctorCheckResultEntity} from '../../entities/index.js'

import {ExecCliTool} from '../execCliTool.js'

/**
 * Best-effort, environment-dependent: measures wall-clock time for an
 * interactive shell to start and immediately exit. Never runs by default
 * (only when explicitly requested via doctor's `checks`) since it spawns a
 * real shell. `allowFail` means a missing shell binary never throws.
 */
export class StartupProfileCheck {

  public static run (shell: string = process.env.SHELL ?? '/bin/zsh'): MemoriaDoctorCheckResultEntity.Type {

    const startedAt = Date.now()
    const output = ExecCliTool.run(
      shell,
      StartupProfileCheck.toArgumentList(
        '-i',
        '-c',
        'exit'
      ),
      {allowFail: true,
        timeout: 5000}
    )
    const elapsedMilliseconds = Date.now() - startedAt

    const findings = output.length > 0 || elapsedMilliseconds > 0
      ? [`${shell} interactive startup took ~${String(elapsedMilliseconds)}ms (best-effort, environment-dependent).`]
      : [`Could not measure startup time for "${shell}" (shell missing or command failed).`]

    return {check: 'startup-profile',
      findings,
      ok: true}

  }

  /** Variadic wrapper so this ordered CLI argument list isn't subject to array-literal sort ordering. */
  private static toArgumentList (...parts: string[]): string[] {

    const result = parts
    return result

  }

}
