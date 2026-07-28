import * as gitPrimitives from './gitPrimitives.js'
import * as githubPrimitives from './githubPrimitives.js'
import {bumpVersion, getCurrentVersion, updateChangelog, updatePackageVersion, type VersionBump} from './versioning.js'

export interface ReleaseFlowResult {
  readonly [key: string]: unknown
  readonly error: string | undefined
  readonly newVersion: string
  readonly previousVersion: string | undefined
  readonly releaseBranch: string
  readonly steps: readonly string[]
  readonly tag: string
}

export function releaseFlow (input: {
  readonly bump?: VersionBump
  readonly direct?: boolean
  readonly dryRun?: boolean
  readonly repo?: string
  readonly root?: string
  readonly version?: string
}): ReleaseFlowResult {

  const root = input.root ?? process.cwd()
  const steps: string[] = []

  if (gitPrimitives.hasUncommittedChanges()) {

    return {
      error: 'Uncommitted changes. Commit first.',
      newVersion: '',
      previousVersion: undefined,
      releaseBranch: '',
      steps,
      tag: ''
    }

  }

  const structure = gitPrimitives.detectBranchStructure()
  const sourceBranch = structure.development ?? structure.current
  const previousVersion = getCurrentVersion(root)
  const newVersion = input.version ?? (previousVersion === undefined
    ? '0.1.0'
    : bumpVersion(previousVersion, input.bump ?? 'patch'))
  const tag = `v${newVersion}`
  const releaseBranch = `release/${newVersion}`

  if (input.dryRun === true) {

    return {error: undefined, newVersion, previousVersion, releaseBranch, steps: ['dry-run: no changes made'], tag}

  }

  gitPrimitives.checkoutBranch(sourceBranch)
  gitPrimitives.pullBranch(sourceBranch)
  steps.push(`checked out and pulled ${sourceBranch}`)

  gitPrimitives.createBranch(releaseBranch, sourceBranch)
  steps.push(`created ${releaseBranch}`)

  updatePackageVersion(root, newVersion)
  updateChangelog({newVersion, root, summary: `Release ${tag}.`})
  steps.push(`bumped version to ${newVersion} and updated CHANGELOG.md`)

  gitPrimitives.commitAll(`chore(release): ${tag}`)
  steps.push('committed release changes')

  gitPrimitives.pushBranch(releaseBranch)
  steps.push(`pushed ${releaseBranch}`)

  const protectedTarget = githubPrimitives.isBranchProtected(structure.production, input.repo)
  const useDirect = input.direct === true && !protectedTarget

  if (useDirect) {

    gitPrimitives.mergeBranch(structure.production, releaseBranch)
    steps.push(`merged ${releaseBranch} into ${structure.production} directly`)

  } else {

    githubPrimitives.createPr({
      base: structure.production,
      body: `Release ${tag}.`,
      repo: input.repo,
      title: `Release ${tag}`
    })
    steps.push('opened release PR')

    githubPrimitives.waitForChecks({repo: input.repo})
    steps.push('CI passed')

    githubPrimitives.mergePr({repo: input.repo})
    steps.push(`merged release PR into ${structure.production}`)

  }

  gitPrimitives.checkoutBranch(structure.production)
  gitPrimitives.pullBranch(structure.production)
  gitPrimitives.createTag(tag, `Release ${tag}`)
  steps.push(`tagged ${tag} on ${structure.production}`)

  if (structure.development !== undefined && structure.development !== structure.production) {

    gitPrimitives.mergeBranch(structure.development, structure.production)
    steps.push(`back-merged ${structure.production} into ${structure.development}`)

  }

  gitPrimitives.deleteLocalBranch(releaseBranch)

  return {error: undefined, newVersion, previousVersion, releaseBranch, steps, tag}

}
