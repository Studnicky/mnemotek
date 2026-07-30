import {arch, homedir, hostname, platform} from 'node:os'
import process from 'node:process'

import type {HostFactsEntity} from '../entities/index.js'

/** Live host identity (hostname/os/arch) plus an overridable home-root concept for tests. */
export class HostFacts {

  public static collect (): HostFactsEntity.Type {

    return {
      arch: arch(),
      hostname: hostname(),
      os: platform()
    }

  }

  /**
   * Resolves the effective home root: an explicit override wins, then the
   * MEMORIA_HOME environment variable, then the real os.homedir().
   */
  public static resolveHomeRoot (override?: string): string {

    if (override !== undefined) {

      return override

    }

    const homeEnvironmentVariable = process.env.MEMORIA_HOME

    if (typeof homeEnvironmentVariable === 'string' && homeEnvironmentVariable.length > 0) {

      return homeEnvironmentVariable

    }

    return homedir()

  }

}
