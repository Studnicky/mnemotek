/**
 * Bundled catalog snippet content, shipped as string constants rather than
 * loose files under src/ — this repo's tsc build has no asset-copy step, so
 * anything under src/ that isn't a .ts module never reaches dist (same
 * reasoning as git-hooks' CheckScriptConstants.ts).
 */
export const CATALOG_RESOURCES = {
  git: {
    'aliases-core': `[alias]
	co = checkout
	st = status
	lg = log --oneline --graph --decorate --all
	br = branch
	ci = commit
`,
    'commit-template': `<type>(<scope>): <short summary>

<body - what changed and why>

<footer - BREAKING CHANGE, refs, co-authored-by>
`
  },
  gitignore: {
    macos: `.DS_Store
.AppleDouble
.LSOverride
Icon?
._*
.Spotlight-V100
.Trashes
.fseventsd
.TemporaryItems
`,
    node: `node_modules/
dist/
build/
coverage/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*
.env
.env.local
.env.*.local
*.tsbuildinfo
`
  }
} as const satisfies Record<string, Record<string, string>>
