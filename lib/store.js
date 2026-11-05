/**
 * Local store for the meeting-record plugin (v2: conversation-first).
 *
 * The plugin is the data plane: master data, meeting templates/procedure
 * flows, and meeting records. Generation happens in the conversation through
 * the model + skill, writing back through the plugin tools. Final records and
 * retrieved references also go to the user's Obsidian vault (see
 * `lib/knowledge.js`), which stays the readable knowledge base.
 *
 * Data lives in `$DSH_HOME/meetrecord/` (`app.json`, `imports/`), never inside
 * the plugin installation directory. Writes are atomic (temp file + rename).
 */
import { mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { SEED_TEMPLATES } from './template-seed.js'

export const DATA_VERSION = 2

export function dshHome() {
  const configured = (process.env.DSH_HOME ?? '').trim()
  if (configured !== '') {
    if (configured === '~') return homedir()
    if (/^~[\\/]/.test(configured)) return join(homedir(), configured.slice(2).replace(/^[\\/]+/, ''))
    return configured
  }
  return join(homedir(), '.dsh')
}

export function dataDir() {
  return join(dshHome(), 'meetrecord')
}

export function importsDir() {
  return join(dataDir(), 'imports')
}

export function storeFile() {
  return join(dataDir(), 'app.json')
}

export function ensureDir(path) {
  mkdirSync(path, { recursive: true })
}

export function newId(prefix = 'id') {
  return `${prefix}-${randomUUID().slice(0, 8)}`
}

export function nowIso() {
  return new Date().toISOString()
}

export function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

export function seedTemplates() {
  return clone(SEED_TEMPLATES)
}

function emptySettings() {
  return {
    vaultPath: '',
    knowledgeFolder: '党建会议记录',
    defaultBranchId: '',
    defaultTemplateId: 'tpl-branch-committee',
    recordLength: 'short',
    allowWebSearch: true,
    maxSearches: 8,
  }
}

export function createEmptyStore() {
  return {
    version: DATA_VERSION,
    settings: emptySettings(),
    branches: [],
    members: [],
    customTemplates: [],
    meetings: [],
    tasks: [],
  }
}

function normalizeMeeting(meeting) {
  const normalized = {
    id: meeting.id ?? newId('mr'),
    branchId: meeting.branchId ?? '',
    templateId: meeting.templateId ?? 'tpl-branch-committee',
    procedureTemplateIds: Array.isArray(meeting.procedureTemplateIds) ? meeting.procedureTemplateIds.filter(item => typeof item === 'string') : [],
    title: meeting.title ?? '',
    meetingDate: meeting.meetingDate ?? '',
    meetingTime: meeting.meetingTime ?? '',
    meetingType: meeting.meetingType ?? '',
    location: meeting.location ?? '',
    host: meeting.host ?? '',
    recorder: meeting.recorder ?? '',
    expectedCount: Number(meeting.expectedCount) || 0,
    actualCount: Number(meeting.actualCount) || 0,
    attendees: meeting.attendees && typeof meeting.attendees === 'object' ? meeting.attendees : {},
    topics: Array.isArray(meeting.topics) ? meeting.topics : [],
    recordMarkdown: typeof meeting.recordMarkdown === 'string' ? meeting.recordMarkdown : '',
    sources: Array.isArray(meeting.sources) ? meeting.sources : [],
    knowledgePaths: Array.isArray(meeting.knowledgePaths) ? meeting.knowledgePaths : [],
    versions: Array.isArray(meeting.versions) ? meeting.versions : [],
    status: typeof meeting.status === 'string' ? meeting.status : 'draft',
    sessionId: meeting.sessionId ?? null,
    revision: Number(meeting.revision) || 0,
    createdAt: meeting.createdAt ?? nowIso(),
    updatedAt: meeting.updatedAt ?? nowIso(),
  }
  // Migrate v1 section-based records into one Markdown body.
  if (normalized.recordMarkdown === '' && meeting.sections && typeof meeting.sections === 'object') {
    const parts = []
    for (const [id, section] of Object.entries(meeting.sections)) {
      const body = String(section?.markdown ?? '').trim()
      if (body === '') continue
      const heading = section?.title ? `## ${section.title}` : (id === 'basic' ? '## 会议基本情况' : `## ${id}`)
      parts.push(`${heading}\n\n${body}`)
    }
    normalized.recordMarkdown = parts.join('\n\n')
  }
  return normalized
}

function normalize(store) {
  if (store === null || typeof store !== 'object') return createEmptyStore()
  const out = createEmptyStore()
  const settings = store.settings ?? {}
  for (const key of Object.keys(out.settings)) {
    if (settings[key] === undefined) continue
    if (typeof out.settings[key] === 'boolean') out.settings[key] = Boolean(settings[key])
    else if (typeof out.settings[key] === 'number') out.settings[key] = Number(settings[key]) || 0
    else out.settings[key] = String(settings[key] ?? '')
  }
  out.profile = {
    level: String(store.profile?.level ?? ''),
    role: String(store.profile?.role ?? ''),
    purpose: String(store.profile?.purpose ?? ''),
    notes: String(store.profile?.notes ?? ''),
    updatedAt: String(store.profile?.updatedAt ?? ''),
  }
  out.branches = Array.isArray(store.branches) ? store.branches : []
  out.members = Array.isArray(store.members) ? store.members : []
  out.customTemplates = Array.isArray(store.customTemplates)
    ? store.customTemplates.filter(template => template && template.builtin !== true)
    : []
  out.meetings = Array.isArray(store.meetings) ? store.meetings.map(normalizeMeeting) : []
  out.tasks = Array.isArray(store.tasks) ? store.tasks.filter(item => item && typeof item === 'object').map(item => ({
    id: String(item.id ?? ''),
    meetingId: String(item.meetingId ?? ''),
    branchId: String(item.branchId ?? ''),
    content: String(item.content ?? ''),
    owner: String(item.owner ?? ''),
    dueDate: String(item.dueDate ?? ''),
    status: ['open', 'done', 'cancelled'].includes(item.status) ? item.status : 'open',
    createdAt: String(item.createdAt ?? ''),
    updatedAt: String(item.updatedAt ?? ''),
  })) : []
  return out
}

export function templatesOf(store) {
  return [...seedTemplates(), ...store.customTemplates]
}

export function findTemplate(store, templateId) {
  return templatesOf(store).find(template => template.id === templateId)
}

export function findMeeting(store, meetingId) {
  return store.meetings.find(meeting => meeting.id === meetingId)
}

export function findBranch(store, branchId) {
  return store.branches.find(branch => branch.id === branchId)
}

export function memberName(store, memberId) {
  return store.members.find(member => member.id === memberId)?.name ?? ''
}

export function loadStore() {
  ensureDir(dataDir())
  try {
    if (statSync(storeFile()).isFile()) return normalize(JSON.parse(readFileSync(storeFile(), 'utf8')))
  } catch (error) {
    if (error?.code !== 'ENOENT') console.warn('[meetrecord] 读取数据失败，将使用空数据：', error)
  }
  return createEmptyStore()
}

export function saveStore(store) {
  ensureDir(dataDir())
  const file = storeFile()
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`
  writeFileSync(temp, JSON.stringify({ ...store, updatedAt: nowIso() }, null, 2), { encoding: 'utf8', mode: 0o600 })
  renameSync(temp, file)
  return store
}

export function ensureParent(filePath) {
  ensureDir(dirname(filePath))
}
