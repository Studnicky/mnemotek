import * as gitPrimitives from './gitPrimitives.js'
import * as githubPrimitives from './githubPrimitives.js'
import {bumpVersion, getCurrentVersion, updateChangelog, updatePackageVersion} from './versioning.js'

export interface HotfixFlowResult {
  readonly [key: string]: unknown
  readonly error: string | undefined
  readonly hotfixBranch: string
  readonly newVersion: string
  readonly previousVersion: string | undefined
  readonly steps: readonly string[]
  readonly tag: string
}

export function hotfixFlow (input: {
  readonly direct?: boolean
  readonly dryRun?: boolean
  readonly repo?: string
  readonly root?: string
  readonly version?: string
}): HotfixFlowResult {

  const root = input.root ?? process.cwd()
  const steps: string[] = []

  if (gitPrimitives.hasUncommittedChanges()) {

    return {
      error: 'Uncommitted changes. Commit first.',
      hotfixBranch: '',
      newVersion: '',
      previousVersion: undefined,
      steps,
      tag: ''
    }

  }

  const structure = gitPrimitives.detectBranchStructure()
  const previousVersion = getCurrentVersion(root)
  const newVersion = input.version ?? (previousVersion === undefined ? '0.0.1' : bumpVersion(previousVersion, 'patch'))
  const tag = `v${newVersion}`
  const hotfixBranch = `hotfix/${newVersion}`

  if (input.dryRun === true) {

    return {error: undefined, hotfixBranch, newVersion, previousVersion, steps: ['dry-run: no changes made'], tag}

  }

  gitPrimitives.checkoutBranch(structure.production)
  gitPrimitives.pullBranch(structure.production)
  steps.push(`checked out and pulled ${structure.production}`)

  gitPrimitives.createBranch(hotfixBranch, structure.production)
  steps.push(`created ${hotfixBranch}`)

  updatePackageVersion(root, newVersion)
  updateChangelog({newVersion, root, summary: `Hotfix ${tag}.`})
  steps.push(`bumped version to ${newVersion} and updated CHANGELOG.md`)

  gitPrimitives.commitAll(`fix(release): ${tag}`)
  steps.push('committed hotfix changes')

  gitPrimitives.pushBranch(hotfixBranch)
  steps.push(`pushed ${hotfixBranch}`)

  const protectedTarget = githubPrimitives.isBranchProtected(structure.production, input.repo)
  const useDirect = input.direct === true && !protectedTarget

  if (useDirect) {

    gitPrimitives.mergeBranch(structure.production, hotfixBranch)
    steps.push(`merged ${hotfixBranch} into ${structure.production} directly`)

  } else {

    githubPrimitives.createPr({
      base: structure.production,
      body: `Hotfix ${tag}.`,
      repo: input.repo,
      title: `Hotfix ${tag}`
    })
    steps.push('opened hotfix PR')

    githubPrimitives.waitForChecks({repo: input.repo})
    steps.push('CI passed')

    githubPrimitives.mergePr({method: 'merge', repo: input.repo})
    steps.push(`merged hotfix PR into ${structure.production}`)

  }

  gitPrimitives.checkoutBranch(structure.production)
  gitPrimitives.pullBranch(structure.production)
  gitPrimitives.createTag(tag, `Hotfix ${tag}`)
  steps.push(`tagged ${tag} on ${structure.production}`)

  if (structure.development !== undefined && structure.development !== structure.production) {

    gitPrimitives.mergeBranch(structure.development, structure.production)
    steps.push(`back-merged ${structure.production} into ${structure.development}`)

  }

  gitPrimitives.deleteLocalBranch(hotfixBranch)

  return {error: undefined, hotfixBranch, newVersion, previousVersion, steps, tag}

}
