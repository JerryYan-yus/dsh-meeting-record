/**
 * On-demand skill reference modules for the bundled party-meeting skill.
 * SKILL.md stays small; detailed procedures are read only when a matching
 * scenario occurs, keeping the normal context small.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const SKILL_REF_VERSION = '2026-11-06-1'
const REF_DIR = fileURLToPath(new URL('../skills/party-meeting-records/references/', import.meta.url))
let cache = null

function parseDoc(fileName, content) {
  const id = fileName.replace(/\.md$/i, '')
  const titleLine = content.split(/\r?\n/).find(line => /^#\s+/.test(line))
  return { id, title: titleLine ? titleLine.replace(/^#\s+/, '').trim() : id, content, version: SKILL_REF_VERSION }
}

export function listSkillRefs() {
  if (cache !== null) return cache
  if (!existsSync(REF_DIR)) return (cache = [])
  cache = readdirSync(REF_DIR)
    .filter(name => name.endsWith('.md') && !name.startsWith('.'))
    .sort()
    .map(name => parseDoc(name, readFileSync(join(REF_DIR, name), 'utf8')))
  return cache
}

export function getSkillRef(topic) {
  const keyword = String(topic ?? '').trim().toLowerCase()
  if (keyword === '') return undefined
  const docs = listSkillRefs()
  const exact = docs.find(doc => doc.id.toLowerCase() === keyword || doc.title.toLowerCase() === keyword)
  if (exact) return exact
  return docs.find(doc => doc.id.toLowerCase().includes(keyword) || doc.title.toLowerCase().includes(keyword) || keyword.includes(doc.id.toLowerCase()))
}
