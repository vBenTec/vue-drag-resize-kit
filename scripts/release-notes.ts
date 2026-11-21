/**
 * Prints the GitHub release notes for one version: its section of CHANGELOG.md with the hard
 * wraps undone, which a release body would otherwise keep as line breaks, and a link to the full
 * changelog. The Publish workflow runs it for every tag: `node scripts/release-notes.ts 1.3.1`.
 */
import { readFileSync } from 'node:fs'

const version = process.argv[2]
if (!version) {
  console.error('Usage: node scripts/release-notes.ts <version>')
  process.exit(1)
}
const changelog = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8').split('\n')
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

const start = changelog.findIndex((line) => line.startsWith(`## ${version} — `))
if (start === -1) {
  console.error(`CHANGELOG.md has no '## ${version} — YYYY-MM-DD' heading.`)
  process.exit(1)
}
const end = changelog.findIndex((line, i) => i > start && line.startsWith('## '))
const section = changelog.slice(start + 1, end === -1 ? undefined : end)

// A line continues the previous one unless either starts a block of its own (fences may be
// indented in list items) or the previous one ends in a hard break.
const startsBlock = /^(#|([-*+]|\d+\.)\s|\||>|```)/
const ownLine = /^(#|\||```)|(\\| {2})$/
const lines: string[] = []
let fenced = false
for (const line of section) {
  const fence = line.trimStart().startsWith('```')
  const prev = lines.at(-1)
  if (
    !fenced &&
    line.trim() &&
    prev?.trim() &&
    !startsBlock.test(line.trimStart()) &&
    !ownLine.test(prev.trimStart())
  ) {
    lines[lines.length - 1] = `${prev} ${line.trim()}`
  } else {
    lines.push(line)
  }
  if (fence) fenced = !fenced
}

const repo = pkg.repository.url.replace(/^git\+/, '').replace(/\.git$/, '')
console.log(`${lines.join('\n').trim()}

Full details in the [changelog](${repo}/blob/main/CHANGELOG.md).`)
