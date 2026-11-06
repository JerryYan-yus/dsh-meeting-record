/**
 * Bundled normative knowledge seed pack (seed/规范制度/*.md).
 * These are generic procedural/format references shipped with the plugin;
 * they never replace official documents or local rules.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const SEED_VERSION = '2026-11-06-1'
const SEED_DIR = fileURLToPath(new URL('../seed/规范制度/', import.meta.url))

let cache = null

function parseDoc(fileName, content) {
  const id = fileName.replace(/\.md$/i, '')
  const titleLine = content.split(/\r?\n/).find(line => /^#\s+/.test(line))
  const title = titleLine ? titleLine.replace(/^#\s+/, '').trim() : id
  const lines = content.split(/\r?\n/)
  let summary = ''
  for (const line of lines) {
    const text = line.trim()
    if (text === '' || text.startsWith('#') || text.startsWith('>') || text.startsWith('-') || text.startsWith('|')) continue
    summary = text.slice(0, 120)
    break
  }
  return { id, title, summary, content, version: SEED_VERSION }
}

export function listSeedDocs() {
  if (cache !== null) return cache
  if (!existsSync(SEED_DIR)) return (cache = [])
  cache = readdirSync(SEED_DIR)
    .filter(name => name.endsWith('.md') && !name.startsWith('.'))
    .sort()
    .map(name => parseDoc(name, readFileSync(join(SEED_DIR, name), 'utf8')))
  return cache
}

export function getSeedDoc(topic) {
  const docs = listSeedDocs()
  const keyword = String(topic ?? '').trim()
  if (keyword === '') return undefined
  const normalized = keyword.toLowerCase()
  const exact = docs.find(doc => doc.id.toLowerCase() === normalized || doc.title.toLowerCase() === normalized)
  if (exact) return exact
  const partial = docs.find(doc => doc.title.toLowerCase().includes(normalized) || normalized.includes(doc.title.toLowerCase()) || doc.id.toLowerCase().includes(normalized))
  if (partial) return partial
  const characters = Array.from(normalized)
  const tokens = characters.length <= 2 ? [normalized] : characters.slice(0, 1).concat(characters.slice(1).map((char, index) => characters[index] + char))
  let best = null
  let bestScore = 0
  for (const doc of docs) {
    const haystack = `${doc.title}${doc.id}${doc.summary}${doc.content.slice(0, 2000)}`.toLowerCase()
    let score = 0
    for (const token of tokens) if (token.length > 0 && haystack.includes(token)) score += 1
    if (score > bestScore) { best = doc; bestScore = score }
  }
  return bestScore > 0 ? best : undefined
}

export { SEED_DIR }
