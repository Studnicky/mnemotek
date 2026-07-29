import type {MergeMethodEntity} from '../entities/index.js'

import {ExecCliTool} from './execCliTool.js'

export class GithubPrimitives {

  private static readonly CI_WATCH_TIMEOUT_MS = 1_800_000

  public static createGitHubRelease (input: {notes: string;
    repository?: string;
    tag: string;}): string {

    const result = ExecCliTool.run(
      'gh',
      GithubPrimitives.toArgumentList(
        'release',
        'create',
        input.tag,
        '--title',
        input.tag,
        '--notes',
        input.notes,
        ...GithubPrimitives.repositoryFlags(input.repository)
      )
    )
    return result

  }

  public static createPr (input: {base: string;
    body: string;
    repository?: string;
    title: string;}): string {

    const result = ExecCliTool.run(
      'gh',
      GithubPrimitives.toArgumentList(
        'pr',
        'create',
        '--base',
        input.base,
        '--title',
        input.title,
        '--body',
        input.body,
        ...GithubPrimitives.repositoryFlags(input.repository)
      )
    )
    return result

  }

  public static isBranchProtected (branch: string, repository?: string): boolean {

    const result = ExecCliTool.run(
      'gh',
      GithubPrimitives.toArgumentList(
        'api',
        `repos/{owner}/{repo}/branches/${branch}/protection`,
        ...GithubPrimitives.repositoryFlags(repository)
      ),
      {allowFail: true}
    )
    return result.length > 0

  }

  public static mergePr (input: {method?: MergeMethodEntity.Type;
    repository?: string;}): void {

    const methodFlag = input.method === 'merge'
      ? '--merge'
      : '--squash'
    ExecCliTool.run(
      'gh',
      GithubPrimitives.toArgumentList(
        'pr',
        'merge',
        methodFlag,
        '--delete-branch',
        ...GithubPrimitives.repositoryFlags(input.repository)
      )
    )

  }

  public static waitForChecks (input: {repository?: string}): void {

    ExecCliTool.run(
      'gh',
      GithubPrimitives.toArgumentList(
        'pr',
        'checks',
        '--watch',
        '--fail-fast',
        ...GithubPrimitives.repositoryFlags(input.repository)
      ),
      {timeout: GithubPrimitives.CI_WATCH_TIMEOUT_MS}
    )

  }

  private static repositoryFlags (repository: string | undefined): string[] {

    return repository === undefined
      ? []
      : GithubPrimitives.toArgumentList(
        '--repo',
        repository
      )

  }

  private static toArgumentList (...parts: string[]): string[] {

    const result = parts
    return result

  }

}
