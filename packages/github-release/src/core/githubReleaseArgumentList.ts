export class GithubReleaseArgumentList {

  public static build (input: {notes?: string;
    tag?: string;}): string[] {

    const result = GithubReleaseArgumentList.toArgumentList(
      'release',
      'create',
      ...GithubReleaseArgumentList.tagFlags(input.tag),
      ...GithubReleaseArgumentList.notesFlags(input.notes)
    )
    return result

  }

  private static notesFlags (notes: string | undefined): string[] {

    return notes === undefined
      ? GithubReleaseArgumentList.toArgumentList('--generate-notes')
      : GithubReleaseArgumentList.toArgumentList(
        '--notes',
        notes
      )

  }

  private static tagFlags (tag: string | undefined): string[] {

    return tag === undefined
      ? []
      : GithubReleaseArgumentList.toArgumentList(tag)

  }

  private static toArgumentList (...parts: string[]): string[] {

    const result = parts
    return result

  }

}
