import {appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import process from 'node:process'

import type {GainSummaryEntity} from '../entities/index.js'

import {GainEntryEntity} from '../entities/index.js'
import {GAIN_TRACKER_LIMITS} from './constants/GainTrackerConstants.js'

export class GainTracker {

  public static readGain (input: {readonly root?: string}): GainSummaryEntity.Type {

    const root = input.root ?? process.cwd()
    const filePath = GainTracker.logPath(root)

    if (!existsSync(filePath)) {

      return {
        entryCount: 0,
        topCommands: [],
        totalBytesAfter: 0,
        totalBytesBefore: 0,
        totalBytesSaved: 0
      }

    }

    const entries = GainTracker.readEntries(filePath)
    const perCommand = new Map<string, number>()

    let totalBytesBefore = 0
    let totalBytesAfter = 0

    for (const entry of entries) {

      totalBytesBefore += entry.bytesBefore
      totalBytesAfter += entry.bytesAfter
      const saved = entry.bytesBefore - entry.bytesAfter
      perCommand.set(
        entry.command,
        (perCommand.get(entry.command) ?? 0) + saved
      )

    }

    const topCommands = [...perCommand.entries()].
      sort((commandEntryA, commandEntryB) => {

        return commandEntryB[1] - commandEntryA[1]

      }).
      slice(
        0,
        10
      ).
      map(([
        command,
        bytesSaved
      ]) => {

        return {bytesSaved,
          command}

      })

    return {
      entryCount: entries.length,
      topCommands,
      totalBytesAfter,
      totalBytesBefore,
      totalBytesSaved: totalBytesBefore - totalBytesAfter
    }

  }

  public static recordGain (input: {
    readonly bytesAfter: number;
    readonly bytesBefore: number;
    readonly command: string;
    readonly root?: string;
    readonly timestamp: string;
  }): void {

    const root = input.root ?? process.cwd()
    const filePath = GainTracker.logPath(root)

    mkdirSync(
      dirname(filePath),
      {recursive: true}
    )

    const entry: GainEntryEntity.Type = {
      bytesAfter: input.bytesAfter,
      bytesBefore: input.bytesBefore,
      command: input.command,
      timestamp: input.timestamp
    }

    appendFileSync(
      filePath,
      `${JSON.stringify(entry)}\n`
    )

    GainTracker.enforceEntryLimit(filePath)

  }

  private static enforceEntryLimit (filePath: string): void {

    const entries = GainTracker.readEntries(filePath)

    if (entries.length <= GAIN_TRACKER_LIMITS.MAXIMUM_ENTRIES) {

      return

    }

    const trimmedEntries = entries.slice(entries.length - GAIN_TRACKER_LIMITS.MAXIMUM_ENTRIES)
    const serializedLines = trimmedEntries.map((trimmedEntry) => {

      const result = JSON.stringify(trimmedEntry)
      return result

    })

    writeFileSync(
      filePath,
      `${serializedLines.join('\n')}\n`
    )

  }

  private static logPath (root: string): string {

    const result = join(
      root,
      '.redactor',
      'gain.ndjson'
    )
    return result

  }

  private static readEntries (filePath: string): GainEntryEntity.Type[] {

    const lines = readFileSync(
      filePath,
      'utf8'
    ).
      split('\n').
      filter((line) => {

        return line.trim().length > 0

      })

    const entries: GainEntryEntity.Type[] = []

    for (const line of lines) {

      const parsed: unknown = JSON.parse(line)

      if (GainEntryEntity.validate(parsed)) {

        entries.push(parsed)

      }

    }

    return entries

  }

}
