import {execFileSync} from 'node:child_process'
import {readFileSync, unlinkSync, writeFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {dirname, join} from 'node:path'

class OpenGraphGenerator {
  static generate () {
    const root = join(dirname(fileURLToPath(import.meta.url)), '..')
    const packageData = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
    const logoData = readFileSync(join(root, 'site/logo.png')).toString('base64')
    const version = String(packageData.version)
    const svgPath = join(root, 'site/og.svg')
    const outputPath = join(root, 'site/og.png')

    writeFileSync(svgPath, OpenGraphGenerator.svg({logoData, version}))
    execFileSync('rsvg-convert', ['-w', '1200', '-h', '630', '-o', outputPath, svgPath], {stdio: 'inherit'})
    unlinkSync(svgPath)
    console.log(`Generated ${outputPath} for ${packageData.name}@${version}`)
  }

  static svg (input) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="space" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#080916"/><stop offset=".54" stop-color="#17112f"/><stop offset="1" stop-color="#080916"/></linearGradient>
    <linearGradient id="plasma" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#9b6cff"/><stop offset=".48" stop-color="#ff3fbf"/><stop offset="1" stop-color="#27e7ff"/></linearGradient>
    <filter id="glow"><feGaussianBlur stdDeviation="12" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <pattern id="stars" width="97" height="113" patternUnits="userSpaceOnUse"><circle cx="13" cy="31" r="1.3" fill="#c8b6ff" opacity=".65"/><circle cx="71" cy="89" r=".8" fill="#27e7ff" opacity=".7"/></pattern>
  </defs>
  <rect width="1200" height="630" fill="url(#space)"/>
  <rect width="1200" height="630" fill="url(#stars)" opacity=".6"/>
  <path d="M-60 565 C160 390 285 630 500 470 S820 400 1260 110" fill="none" stroke="url(#plasma)" stroke-width="34" opacity=".22" filter="url(#glow)"/>
  <path d="M-60 565 C160 390 285 630 500 470 S820 400 1260 110" fill="none" stroke="url(#plasma)" stroke-width="2" opacity=".9"/>
  <path d="M0 106 H180 l28 28 H350 M0 132 H122 M850 540 h130 l22-22 H1200" fill="none" stroke="#27e7ff" stroke-width="2" opacity=".55"/>
  <g font-family="Space Grotesk,Arial,sans-serif" fill="#f7f3ff">
    <text x="70" y="250" font-size="78" font-weight="700" letter-spacing="-2">MNEMOTEK</text>
    <text x="74" y="310" font-size="30" font-weight="500">One contract. Every agent surface.</text>
    <text x="76" y="375" font-family="monospace" font-size="20" font-weight="700" letter-spacing="4" fill="#27e7ff">CLI</text>
    <circle cx="148" cy="368" r="4" fill="#ff3fbf"/>
    <text x="172" y="375" font-family="monospace" font-size="20" font-weight="700" letter-spacing="4" fill="#ff3fbf">MCP</text>
    <circle cx="267" cy="368" r="4" fill="#c8ff4a"/>
    <text x="291" y="375" font-family="monospace" font-size="20" font-weight="700" letter-spacing="4" fill="#c8ff4a">SKILL</text>
    <circle cx="418" cy="368" r="4" fill="#ff8a3d"/>
    <text x="442" y="375" font-family="monospace" font-size="20" font-weight="700" letter-spacing="4" fill="#ff8a3d">COMMAND</text>
    <text x="76" y="548" font-family="monospace" font-size="16" letter-spacing="2" fill="#b0aacb">SCHEMA-FIRST AGENT TOOLING</text>
    <text x="1080" y="548" text-anchor="end" font-family="monospace" font-size="16" letter-spacing="2" fill="#9b6cff">v${input.version}</text>
  </g>
  <image href="data:image/png;base64,${input.logoData}" x="735" y="62" width="400" height="400" preserveAspectRatio="xMidYMid meet" filter="url(#glow)"/>
</svg>`
  }
}

OpenGraphGenerator.generate()
