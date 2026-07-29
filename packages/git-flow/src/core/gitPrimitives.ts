import {existsSync, unlinkSync, writeFileSync} from 'node:fs'
import {join} from 'node:path'
import process from 'node:process'

import type {BranchStructureEntity, CommitInfoEntity} from '../entities/index.js'

import {ExecCliTool} from './execCliTool.js'

export class GitPrimitives {

  private static readonly LOCK_FILE_NAME = 'git-flow-tool.lock'

  public static acquireLock (): void {

    const path = GitPrimitives.lockFilePath()

    if (existsSync(path)) {

      throw new Error(`git-flow-tool is already running in this repository (lock file ${path} exists). Wait for it to finish, or remove the lock file if a prior run crashed without cleaning up.`)

    }

    writeFileSync(
      path,
      String(process.pid)
    )

  }

  public static assertCleanRepositoryState (): void {

    if (GitPrimitives.isRepositoryMidOperation()) {

      throw new Error('Repository is already mid-merge or mid-rebase. Resolve or abort it before running git-flow-tool again.')

    }

  }

  public static branchExists (branch: string): boolean {

    const result = ExecCliTool.run(
      'git',
      GitPrimitives.toArgumentList(
        'rev-parse',
        '--verify',
        '--quiet',
        branch
      ),
      {allowFail: true}
    )
    return result.length > 0

  }

  public static checkoutBranch (branch: string): void {

    ExecCliTool.run(
      'git',
      GitPrimitives.toArgumentList(
        'checkout',
        branch
      )
    )

  }

  public static commitAll (message: string): boolean {

    ExecCliTool.run(
      'git',
      GitPrimitives.toArgumentList(
        'add',
        '-A'
      )
    )
    const status = ExecCliTool.run(
      'git',
      GitPrimitives.toArgumentList(
        'status',
        '--porcelain'
      ),
      {allowFail: true}
    )

    if (status.length === 0) {

      return false

    }

    ExecCliTool.run(
      'git',
      GitPrimitives.toArgumentList(
        'commit',
        '-m',
        message
      )
    )
    return true

  }

  public static createBranch (branch: string, base: string): void {

    ExecCliTool.run(
      'git',
      GitPrimitives.toArgumentList(
        'checkout',
        '-b',
        branch,
        base
      )
    )

  }

  public static createTag (tag: string, message: string): void {

    ExecCliTool.run(
      'git',
      GitPrimitives.toArgumentList(
        'tag',
        '-a',
        tag,
        '-m',
        message
      )
    )
    ExecCliTool.run(
      'git',
      GitPrimitives.toArgumentList(
        'push',
        'origin',
        tag
      )
    )

  }

  public static currentBranch (): string {

    const result = ExecCliTool.run(
      'git',
      GitPrimitives.toArgumentList(
        'rev-parse',
        '--abbrev-ref',
        'HEAD'
      )
    )
    return result

  }

  public static deleteLocalBranch (branch: string): void {

    ExecCliTool.run(
      'git',
      GitPrimitives.toArgumentList(
        'branch',
        '-D',
        branch
      ),
      {allowFail: true}
    )

  }

  public static detectBranchStructure (): BranchStructureEntity.Type {

    const current = GitPrimitives.currentBranch()
    const production = GitPrimitives.branchExistsLocalOrRemote('main')
      ? 'main'
      : 'master'

    return {
      current,
      development: GitPrimitives.detectDevelopmentBranch(),
      production
    }

  }

  public static getCommitsAhead (baseBranch: string): CommitInfoEntity.Type[] {

    const log = ExecCliTool.run(
      'git',
      GitPrimitives.toArgumentList(
        'log',
        `${baseBranch}..HEAD`,
        '--pretty=format:%h %s'
      ),
      {allowFail: true}
    )

    if (log.length === 0) {

      return []

    }

    return log.split('\n').map((line) => {

      const [
        hash,
        ...subjectParts
      ] = line.split(' ')
      return {hash: hash ?? '',
        subject: subjectParts.join(' ')}

    })

  }

  public static hasUncommittedChanges (): boolean {

    return ExecCliTool.run(
      'git',
      GitPrimitives.toArgumentList(
        'status',
        '--porcelain'
      )
    ).length > 0

  }

  public static isRepositoryMidOperation (): boolean {

    const dir = GitPrimitives.gitDir()
    return existsSync(join(
      dir,
      'MERGE_HEAD'
    )) || existsSync(join(
      dir,
      'rebase-merge'
    ))

  }

  public static mergeBranch (target: string, source: string): void {

    ExecCliTool.run(
      'git',
      GitPrimitives.toArgumentList(
        'checkout',
        target
      )
    )
    ExecCliTool.run(
      'git',
      GitPrimitives.toArgumentList(
        'pull',
        '--no-rebase',
        'origin',
        target
      ),
      {allowFail: true}
    )

    try {

      ExecCliTool.run(
        'git',
        GitPrimitives.toArgumentList(
          'merge',
          '--no-ff',
          source,
          '-m',
          `chore: merge ${source} into ${target}`
        )
      )

    } catch {

      ExecCliTool.run(
        'git',
        GitPrimitives.toArgumentList(
          'merge',
          '--abort'
        ),
        {allowFail: true}
      )
      throw new Error(`Merge of ${source} into ${target} failed and was aborted. Resolve the conflict manually.`)

    }

    GitPrimitives.pushWithRetry(
      target,
      GitPrimitives.toArgumentList(
        'push',
        'origin',
        target
      )
    )

  }

  public static pullBranch (branch: string): void {

    try {

      ExecCliTool.run(
        'git',
        GitPrimitives.toArgumentList(
          'pull',
          '--no-rebase',
          'origin',
          branch
        )
      )

    } catch {

      if (GitPrimitives.mergeHeadExists()) {

        ExecCliTool.run(
          'git',
          GitPrimitives.toArgumentList(
            'merge',
            '--abort'
          ),
          {allowFail: true}
        )
        throw new Error(`Pull conflict on ${branch}: merge aborted, repository restored to a clean state. Resolve manually and retry.`)

      }

    }

  }

  public static pushBranch (branch: string): void {

    GitPrimitives.pushWithRetry(
      branch,
      GitPrimitives.toArgumentList(
        'push',
        '-u',
        'origin',
        branch
      )
    )

  }

  public static releaseLock (): void {

    const path = GitPrimitives.lockFilePath()

    if (existsSync(path)) {

      unlinkSync(path)

    }

  }

  public static withLock<T> (callback: () => T): T {

    GitPrimitives.acquireLock()

    try {

      return callback()

    } finally {

      GitPrimitives.releaseLock()

    }

  }

  private static branchExistsLocalOrRemote (branch: string): boolean {

    return GitPrimitives.branchExists(branch) || GitPrimitives.branchExists(`origin/${branch}`)

  }

  private static detectDevelopmentBranch (): string | undefined {

    if (GitPrimitives.branchExistsLocalOrRemote('develop')) {

      return 'develop'

    }

    if (GitPrimitives.branchExistsLocalOrRemote('development')) {

      return 'development'

    }

    return undefined

  }

  private static gitDir (): string {

    const result = ExecCliTool.run(
      'git',
      GitPrimitives.toArgumentList(
        'rev-parse',
        '--git-dir'
      )
    )
    return result

  }

  private static lockFilePath (): string {

    const result = join(
      GitPrimitives.gitDir(),
      GitPrimitives.LOCK_FILE_NAME
    )
    return result

  }

  private static mergeHeadExists (): boolean {

    const result = existsSync(join(
      GitPrimitives.gitDir(),
      'MERGE_HEAD'
    ))
    return result

  }

  private static pushWithRetry (branch: string, argumentList: readonly string[]): void {

    try {

      ExecCliTool.run(
        'git',
        argumentList
      )

    } catch {

      try {

        ExecCliTool.run(
          'git',
          GitPrimitives.toArgumentList(
            'pull',
            '--ff-only',
            'origin',
            branch
          )
        )

      } catch {

        throw new Error(`Push to ${branch} was rejected and the branch has diverged (fast-forward pull failed). Resolve manually and retry.`)

      }

      try {

        ExecCliTool.run(
          'git',
          argumentList
        )

      } catch {

        throw new Error(`Push to ${branch} was rejected again after a fast-forward pull. Resolve manually.`)

      }

    }

  }

  private static toArgumentList (...parts: string[]): string[] {

    const result = parts
    return result

  }

}
