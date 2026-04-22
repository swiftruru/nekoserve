/**
 * Generate docs/references.bib from the central citations registry.
 *
 * Usage: `npm run bibtex`
 *
 * Reads src/renderer/src/data/citations.ts at runtime via tsx and emits
 * every Citation as an APA-compatible BibTeX @article entry. The
 * generated file is intended to be committed only when the user opts
 * in; docs/ is .gitignored by default (see .gitignore).
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CITATIONS, citationToBibTeX } from '../src/renderer/src/data/citations'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const OUT_PATH = resolve(ROOT, 'docs/references.bib')

function generate(): string {
  const header = [
    '% NekoServe — Auto-generated BibTeX bibliography',
    '% Source of truth: src/renderer/src/data/citations.ts',
    `% Generated: ${new Date().toISOString()}`,
    '%',
    '% To regenerate: `npm run bibtex`',
    '',
  ].join('\n')

  const entries = Object.values(CITATIONS).map(citationToBibTeX).join('\n\n')
  return `${header}\n${entries}\n`
}

function main(): void {
  const content = generate()
  mkdirSync(dirname(OUT_PATH), { recursive: true })
  writeFileSync(OUT_PATH, content, 'utf8')
  console.log(`✅ Wrote ${Object.keys(CITATIONS).length} citations to ${OUT_PATH}`)
}

main()
