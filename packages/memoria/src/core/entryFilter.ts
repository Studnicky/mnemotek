import type {EntryFilterOverridesEntity, HostFactsEntity, MemoriaManifestEntryEntity} from '../entities/index.js'

/** Shared os/host applicability filter, reused by DriftEngine and LinkPlanner. */
export class EntryFilter {

  public static applies (entry: MemoriaManifestEntryEntity.Type, host: HostFactsEntity.Type, overrides: EntryFilterOverridesEntity.Type = {}): boolean {

    const effectiveOs = overrides.os ?? host.os
    const effectiveHost = overrides.host ?? host.hostname

    if (entry.os !== undefined && !entry.os.includes(effectiveOs)) {

      return false

    }

    if (entry.host !== undefined && !entry.host.includes(effectiveHost)) {

      return false

    }

    return true

  }

}
