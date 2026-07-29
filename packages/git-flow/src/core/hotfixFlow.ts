import process from 'node:process'

import type {HotfixFlowResultEntity} from '../entities/index.js'

import {GitPrimitives} from './gitPrimitives.js'
import {ReleaseFlowSupport} from './releaseFlowSupport.js'
import {Versioning} from './versioning.js'

export class HotfixFlow {

  public static hotfixFlow (input: {direct?: boolean;
    dryRun?: boolean;
    repository?: string;
    root?: string;
    version?: string;}): HotfixFlowResultEntity.Type {

    const root = input.root ?? process.cwd()
    const steps: string[] = []

    try {

      GitPrimitives.assertCleanRepositoryState()

    } catch (error) {

      return {error: error instanceof Error
        ? error.message
        : String(error),
      hotfixBranch: '',
      newVersion: '',
      steps,
      tag: ''}

    }

    if (GitPrimitives.hasUncommittedChanges()) {

      return {error: 'Uncommitted changes. Commit first.',
        hotfixBranch: '',
        newVersion: '',
        steps,
        tag: ''}

    }

    const structure = GitPrimitives.detectBranchStructure()

    if (input.dryRun === true) {

      const {hotfixBranch, newVersion, previousVersion, tag} = HotfixFlow.computeVersionAndBranch(
        root,
        input
      )

      return {hotfixBranch,
        newVersion,
        previousVersion,
        steps: ['dry-run: no changes made'],
        tag}

    }

    GitPrimitives.checkoutBranch(structure.production)
    GitPrimitives.pullBranch(structure.production)
    steps.push(`checked out and pulled ${structure.production}`)

    const {hotfixBranch, newVersion, previousVersion, tag} = HotfixFlow.computeVersionAndBranch(
      root,
      input
    )

    ReleaseFlowSupport.ensureBranch(
      hotfixBranch,
      structure.production,
      steps
    )

    Versioning.updatePackageVersion(
      root,
      newVersion
    )
    steps.push(`bumped version to ${newVersion}`)

    GitPrimitives.commitAll(`fix(release): ${tag}`)
    steps.push('committed hotfix changes')

    GitPrimitives.pushBranch(hotfixBranch)
    steps.push(`pushed ${hotfixBranch}`)

    ReleaseFlowSupport.integrate(
      {branch: hotfixBranch,
        direct: input.direct,
        label: 'Hotfix',
        repository: input.repository,
        structure,
        tag},
      steps
    )

    GitPrimitives.checkoutBranch(structure.production)
    GitPrimitives.pullBranch(structure.production)
    GitPrimitives.createTag(
      tag,
      `Hotfix ${tag}`
    )
    steps.push(`tagged ${tag} on ${structure.production}`)

    ReleaseFlowSupport.backmerge(
      structure,
      steps
    )

    GitPrimitives.deleteLocalBranch(hotfixBranch)

    return {hotfixBranch,
      newVersion,
      previousVersion,
      steps,
      tag}

  }

  private static computeVersionAndBranch (root: string, input: {version?: string}): {hotfixBranch: string;
    newVersion: string;
    previousVersion: string | undefined;
    tag: string;} {

    const {newVersion, previousVersion} = Versioning.computeVersion({bump: 'patch',
      defaultVersion: '0.0.1',
      requestedVersion: input.version,
      root})

    return {
      hotfixBranch: `hotfix/${newVersion}`,
      newVersion,
      previousVersion,
      tag: `v${newVersion}`
    }

  }

}
