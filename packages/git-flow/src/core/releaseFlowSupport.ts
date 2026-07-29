import type {BranchStructureEntity} from '../entities/index.js'

import {GithubPrimitives} from './githubPrimitives.js'
import {GitPrimitives} from './gitPrimitives.js'

export class ReleaseFlowSupport {

  public static backmerge (structure: BranchStructureEntity.Type, steps: string[]): void {

    if (structure.development !== undefined && structure.development !== structure.production) {

      GitPrimitives.mergeBranch(
        structure.development,
        structure.production
      )
      steps.push(`back-merged ${structure.production} into ${structure.development}`)

    }

  }

  public static ensureBranch (branchName: string, baseBranch: string, steps: string[]): void {

    if (GitPrimitives.branchExists(branchName)) {

      GitPrimitives.checkoutBranch(branchName)
      steps.push(`resumed existing ${branchName} from a prior run`)

    } else {

      GitPrimitives.createBranch(
        branchName,
        baseBranch
      )
      steps.push(`created ${branchName}`)

    }

  }

  public static integrate (input: {branch: string;
    direct?: boolean;
    label: string;
    repository?: string;
    structure: BranchStructureEntity.Type;
    tag: string;}, steps: string[]): void {

    const {branch, label, repository, structure, tag} = input
    const protectedTarget = GithubPrimitives.isBranchProtected(
      structure.production,
      repository
    )
    const useDirect = input.direct === true && !protectedTarget

    if (useDirect) {

      GitPrimitives.mergeBranch(
        structure.production,
        branch
      )
      steps.push(`merged ${branch} into ${structure.production} directly`)
      return

    }

    GithubPrimitives.createPr({base: structure.production,
      body: `${label} ${tag}.`,
      repository,
      title: `${label} ${tag}`})
    steps.push(`opened ${label.toLowerCase()} PR`)

    GithubPrimitives.waitForChecks({repository})
    steps.push('CI passed')

    GithubPrimitives.mergePr({method: 'merge',
      repository})
    steps.push(`merged ${label.toLowerCase()} PR into ${structure.production}`)

  }

}
