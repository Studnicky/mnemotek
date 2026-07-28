import {appendFileSync, existsSync, mkdirSync, readFileSync} from 'node:fs'
import {dirname, join} from 'node:path'

export interface GainEntry {
  readonly [key: string]: unknown
  readonly bytesAfter: number
  readonly bytesBefore: number
  readonly command: string
  readonly timestamp: string
}

export interface GainSummary {
  readonly [key: string]: unknown
  readonly entryCount: number
  readonly totalBytesAfter: number
  readonly totalBytesBefore: number
  readonly totalBytesSaved: number
  readonly topCommands: readonly {
    readonly bytesSaved: number
    readonly command: string
  }[]
}

function logPath (root: string): string {

  return join(root, '.redactor', 'gain.ndjson')

}

export function recordGain (input: {
  readonly bytesAfter: number
  readonly bytesBefore: number
  readonly command: string
  readonly root?: string
  readonly timestamp: string
}): void {

  const root = input.root ?? process.cwd()
  const filePath = logPath(root)

  mkdirSync(dirname(filePath), {recursive: true})

  const entry: GainEntry = {
    bytesAfter: input.bytesAfter,
    bytesBefore: input.bytesBefore,
    command: input.command,
    timestamp: input.timestamp
  }

  appendFileSync(filePath, `${JSON.stringify(entry)}\n`)

}

export function readGain (input: {
  readonly root?: string
}): GainSummary {

  const root = input.root ?? process.cwd()
  const filePath = logPath(root)

  if (!existsSync(filePath)) {

    return {
      entryCount: 0,
      topCommands: [],
      totalBytesAfter: 0,
      totalBytesBefore: 0,
      totalBytesSaved: 0
    }

  }

  const lines = readFileSync(filePath, 'utf8').
    split('\n').
    filter((line) => line.trim().length > 0)

  const entries = lines.map((line) => JSON.parse(line) as GainEntry)
  const perCommand = new Map<string, number>()

  let totalBytesBefore = 0
  let totalBytesAfter = 0

  for (const entry of entries) {

    totalBytesBefore += entry.bytesBefore
    totalBytesAfter += entry.bytesAfter
    const saved = entry.bytesBefore - entry.bytesAfter
    perCommand.set(entry.command, (perCommand.get(entry.command) ?? 0) + saved)

  }

  const topCommands = [...perCommand.entries()].
    sort((commandA, commandB) => commandB[1] - commandA[1]).
    slice(0, 10).
    map(([command, bytesSaved]) => ({bytesSaved, command}))

  return {
    entryCount: entries.length,
    topCommands,
    totalBytesAfter,
    totalBytesBefore,
    totalBytesSaved: totalBytesBefore - totalBytesAfter
  }

}
