import type {MemoriaDoctorCheckEntity, MemoriaDoctorCheckResultEntity, MemoriaDoctorResultEntity} from '../../entities/index.js'
import type {DoctorCheckContextInterface} from '../../interfaces/DoctorCheckContextInterface.js'

import {ArchiveToolsCheck} from './archiveToolsCheck.js'
import {EnvrcAuditCheck} from './envrcAuditCheck.js'
import {RcHygieneCheck} from './rcHygieneCheck.js'
import {SecretsScanCheck} from './secretsScanCheck.js'
import {StartupProfileCheck} from './startupProfileCheck.js'

/**
 * Default checks exclude `startup-profile`: it spawns a real interactive
 * shell, so it only runs when a caller explicitly asks for it via `checks`.
 */
const DOCTOR_DEFAULT_CHECKS: readonly MemoriaDoctorCheckEntity.Type[] = [
  'archive-tools',
  'envrc-audit',
  'rc-hygiene',
  'secrets-scan'
]

const DOCTOR_CHECK_DISPATCH: Record<MemoriaDoctorCheckEntity.Type, (context: DoctorCheckContextInterface) => MemoriaDoctorCheckResultEntity.Type> = {
  'archive-tools': (): MemoriaDoctorCheckResultEntity.Type => {

    const result = ArchiveToolsCheck.run()
    return result

  },
  'envrc-audit': (context): MemoriaDoctorCheckResultEntity.Type => {

    const result = EnvrcAuditCheck.run(context.homeRoot)
    return result

  },
  'rc-hygiene': (context): MemoriaDoctorCheckResultEntity.Type => {

    const result = RcHygieneCheck.run(context.rcPaths)
    return result

  },
  'secrets-scan': (context): MemoriaDoctorCheckResultEntity.Type => {

    const result = SecretsScanCheck.run(context.rcPaths)
    return result

  },
  'startup-profile': (): MemoriaDoctorCheckResultEntity.Type => {

    const result = StartupProfileCheck.run()
    return result

  }
}

export class DoctorDispatch {

  public static run (checks: readonly MemoriaDoctorCheckEntity.Type[] | undefined, rcPaths: readonly string[], homeRoot: string): MemoriaDoctorResultEntity.Type {

    const selectedChecks = checks ?? DOCTOR_DEFAULT_CHECKS
    const context: DoctorCheckContextInterface = {homeRoot,
      rcPaths}

    const results = selectedChecks.map((check): MemoriaDoctorCheckResultEntity.Type => {

      const result = DOCTOR_CHECK_DISPATCH[check](context)
      return result

    })

    return {results}

  }

}
