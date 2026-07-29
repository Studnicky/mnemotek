import process from 'node:process'

import type {ReleaseFlowResultEntity, VersionBumpEntity} from '../entities/index.js'

import {GitPrimitives} from './gitPrimitives.js'
import {ReleaseFlowSupport} from './releaseFlowSupport.js'
import {Versioning} from './versioning.js'

export class ReleaseFlow {

  public static releaseFlow (input: {bump?: VersionBumpEntity.Type;
    direct?: boolean;
    dryRun?: boolean;
    repository?: string;
    root?: string;
    version?: string;}): ReleaseFlowResultEntity.Type {

    const root = input.root ?? process.cwd()
    const steps: string[] = []

    try {

      GitPrimitives.assertCleanRepositoryState()

    } catch (error) {

      return {error: error instanceof Error
        ? error.message
        : String(error),
      newVersion: '',
      releaseBranch: '',
      steps,
      tag: ''}

    }

    if (GitPrimitives.hasUncommittedChanges()) {

      return {error: 'Uncommitted changes. Commit first.',
        newVersion: '',
        releaseBranch: '',
        steps,
        tag: ''}

    }

    const structure = GitPrimitives.detectBranchStructure()
    const sourceBranch = structure.development ?? structure.current

    if (input.dryRun === true) {

      const {newVersion, previousVersion, releaseBranch, tag} = ReleaseFlow.computeVersionAndBranch(
        root,
        input
      )

      return {newVersion,
        previousVersion,
        releaseBranch,
        steps: ['dry-run: no changes made'],
        tag}

    }

    GitPrimitives.checkoutBranch(sourceBranch)
    GitPrimitives.pullBranch(sourceBranch)
    steps.push(`checked out and pulled ${sourceBranch}`)

    const {newVersion, previousVersion, releaseBranch, tag} = ReleaseFlow.computeVersionAndBranch(
      root,
      input
    )

    ReleaseFlowSupport.ensureBranch(
      releaseBranch,
      sourceBranch,
      steps
    )

    Versioning.updatePackageVersion(
      root,
      newVersion
    )
    steps.push(`bumped version to ${newVersion}`)

    GitPrimitives.commitAll(`chore(release): ${tag}`)
    steps.push('committed release changes')

    GitPrimitives.pushBranch(releaseBranch)
    steps.push(`pushed ${releaseBranch}`)

    ReleaseFlowSupport.integrate(
      {branch: releaseBranch,
        direct: input.direct,
        label: 'Release',
        repository: input.repository,
        structure,
        tag},
      steps
    )

    GitPrimitives.checkoutBranch(structure.production)
    GitPrimitives.pullBranch(structure.production)
    GitPrimitives.createTag(
      tag,
      `Release ${tag}`
    )
    steps.push(`tagged ${tag} on ${structure.production}`)

    ReleaseFlowSupport.backmerge(
      structure,
      steps
    )

    GitPrimitives.deleteLocalBranch(releaseBranch)

    return {newVersion,
      previousVersion,
      releaseBranch,
      steps,
      tag}

  }

  private static computeVersionAndBranch (root: string, input: {bump?: VersionBumpEntity.Type;
    version?: string;}): {newVersion: string;
    previousVersion: string | undefined;
    releaseBranch: string;
    tag: string;} {

    const {newVersion, previousVersion} = Versioning.computeVersion({bump: input.bump ?? 'patch',
      defaultVersion: '0.1.0',
      requestedVersion: input.version,
      root})

    return {
      newVersion,
      previousVersion,
      releaseBranch: `release/${newVersion}`,
      tag: `v${newVersion}`
    }

  }

}
