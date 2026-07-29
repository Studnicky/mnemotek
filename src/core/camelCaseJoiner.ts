export class CamelCaseJoiner {

  public static join (text: string, delimiter: string): string {

    const parts = text.split(delimiter)
    const normalized: string[] = []

    for (const [
      index,
      part
    ] of parts.entries()) {

      if (part.length === 0) {

        continue

      }

      if (index === 0) {

        normalized.push(part)

      } else {

        const firstCharacter = part.at(0)
        normalized.push(firstCharacter === undefined
          ? part
          : `${firstCharacter.toUpperCase()}${part.slice(1)}`)

      }

    }

    return normalized.join('')

  }

}
