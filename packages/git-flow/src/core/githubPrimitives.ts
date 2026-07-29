import type {MergeMethodEntity} from '../entities/index.js'

import {MERGE_METHOD_FLAGS} from './constants/GithubPrimitivesConstants.js'
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

    const methodFlag = MERGE_METHOD_FLAGS[input.method ?? 'squash']
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

  public static repositoryMergeCapabilities (repository?: string): {allowMerge: boolean;
    allowRebase: boolean;
    allowSquash: boolean;} {

    const result = ExecCliTool.run(
      'gh',
      GithubPrimitives.toArgumentList(
        'api',
        'repos/{owner}/{repo}',
        ...GithubPrimitives.repositoryFlags(repository)
      )
    )
    const parsed = JSON.parse(result) as {allow_merge_commit: boolean;
      allow_rebase_merge: boolean;
      allow_squash_merge: boolean;}
    const capabilities = {allowMerge: parsed.allow_merge_commit,
      allowRebase: parsed.allow_rebase_merge,
      allowSquash: parsed.allow_squash_merge}
    return capabilities

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
