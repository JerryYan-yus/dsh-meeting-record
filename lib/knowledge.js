/**
 * Obsidian Vault knowledge base for the meeting-record plugin.
 *
 * Notes live under `<vault>/<folder>/会议记录/` (meeting records) and
 * `<vault>/<folder>/检索资料/` (research references) as Markdown files with a
 * fixed YAML frontmatter block written and parsed by this module. The module
 * has no npm dependencies: it only uses node:fs, node:path and node:crypto.
 *
 * Every exported function returns a plain result object and never throws, so
 * HTTP routes and agent tools can forward the result as-is. All note paths are
 * relative to `<vault>/<folder>`; traversal (`..`), absolute paths or anything
 * that resolves outside that folder are rejected before touching the disk.
 */
import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { isAbsolute, join, relative as relativeOf, resolve, sep } from 'node:path'

export const DEFAULT_FOLDER = '党建会议记录'

const RECORD_DIR = '会议记录'
const REFERENCE_DIR = '检索资料'
const BRANCH_DIR = '支部信息'
const MATERIAL_DIR = '支部材料'
const DAILY_DIR = '日常工作'
const INDEX_DIR = '知识库索引'
const KIND_DIR = { record: RECORD_DIR, reference: REFERENCE_DIR, branch: BRANCH_DIR, material: MATERIAL_DIR, daily: DAILY_DIR, index: INDEX_DIR }
const DIR_KIND = { [RECORD_DIR]: 'record', [REFERENCE_DIR]: 'reference', [BRANCH_DIR]: 'branch', [MATERIAL_DIR]: 'material', [DAILY_DIR]: 'daily', [INDEX_DIR]: 'index' }
const TYPE_LABEL = { record: RECORD_DIR, reference: REFERENCE_DIR, branch: BRANCH_DIR, material: MATERIAL_DIR, daily: DAILY_DIR, index: INDEX_DIR }

const SNIPPET_CHARS = 120
const SCAN_LIMIT_DEFAULT = 200
const SCAN_LIMIT_MAX = 500
const SEARCH_LIMIT_DEFAULT = 10
const SEARCH_LIMIT_MAX = 50
const TITLE_WEIGHT = 5
const TAG_WEIGHT = 3
const BODY_WEIGHT = 1
const SLUG_MAX = 60

const CJK_RUN_PATTERN = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]+/g
const TOKEN_SPLIT_PATTERN = /[\s,，。.、;；:：!！?？"'“”‘’()（）[\]【】{}<>《》〈〉「」『』\-—_/\\|@#$%^&*+=~`…·]+/
const SLUG_STRIP_PATTERN = /[\\/:*?"<>|]/g
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function asMessage(error) {
  const text = error instanceof Error ? error.message : String(error ?? '')
  return text.trim() === '' ? '未知错误' : text
}

function fail(error) {
  return { ok: false, error: asMessage(error) }
}

function firstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() !== '') return value.trim()
  }
  return ''
}

function isDirectory(path) {
  try {
    return statSync(path).isDirectory()
  } catch {
    return false
  }
}

function toPosix(path) {
  return String(path).split(sep).join('/')
}

function clampLimit(value, fallback, max) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(Math.max(Math.floor(parsed), 0), max)
}

function localDateString(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** `<folder>` from options; relative only, `..` refused, default folder applied. */
function normalizeFolder(folder) {
  const raw = typeof folder === 'string' ? folder.trim() : ''
  const name = raw === '' ? DEFAULT_FOLDER : raw
  if (isAbsolute(name) || /^[A-Za-z]:[\\/]/.test(name) || name.startsWith('\\\\')) {
    throw new Error('folder 必须是 Vault 内的相对路径')
  }
  const parts = name.replace(/\\/g, '/').split('/')
  const cleaned = []
  for (const part of parts) {
    if (part === '' || part === '.') continue
    if (part === '..') throw new Error('folder 不能包含 ..')
    cleaned.push(part)
  }
  return cleaned.length === 0 ? DEFAULT_FOLDER : cleaned.join('/')
}

/** Validate an existing vault directory and return its absolute path. */
function requireVault(vaultPath) {
  if (typeof vaultPath !== 'string' || vaultPath.trim() === '') throw new Error('vaultPath 不能为空')
  const absolute = resolve(vaultPath.trim())
  let stat
  try {
    stat = statSync(absolute)
  } catch (error) {
    if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR') throw new Error(`Vault 目录不存在：${absolute}`)
    throw error
  }
  if (!stat.isDirectory()) throw new Error(`Vault 路径不是目录：${absolute}`)
  return absolute
}

/** Accept both `fn(vaultPath)` and `fn({ vaultPath })` call styles. */
function readVaultPath(value) {
  if (value !== null && typeof value === 'object' && typeof value.vaultPath === 'string') return value.vaultPath
  return value
}

/**
 * Resolve one note path and reject anything outside `<vault>/<folder>`.
 * A leading `<folder>/` segment is tolerated (vault-relative input), so callers
 * can feed both scan results and hand-built paths to readNote.
 */
function notePath(vaultAbsolute, folder, relativePathInput) {
  if (typeof relativePathInput !== 'string' || relativePathInput.trim() === '') {
    throw new Error('relativePath 不能为空')
  }
  const raw = relativePathInput.trim().replace(/\\/g, '/')
  if (raw.startsWith('/') || /^[A-Za-z]:/.test(raw)) throw new Error('relativePath 必须是 Vault 内的相对路径')
  const segments = raw.split('/')
  if (segments.some(segment => segment === '..')) throw new Error('relativePath 不能包含 ..')
  let cleaned = segments.filter(segment => segment !== '' && segment !== '.')
  if (cleaned.length === 0) throw new Error('relativePath 不能为空')

  const folderSegments = folder.split('/').filter(Boolean)
  if (cleaned.length > folderSegments.length && folderSegments.every((segment, index) => cleaned[index] === segment)) {
    cleaned = cleaned.slice(folderSegments.length)
  }
  if (cleaned.length === 0) throw new Error('relativePath 不能为空')

  const relativePath = cleaned.join('/')
  if (!/\.md$/i.test(relativePath)) throw new Error('只支持 .md 笔记文件')

  const root = join(vaultAbsolute, folder)
  const absolutePath = resolve(root, relativePath)
  const compareRoot = process.platform === 'win32' ? root.toLowerCase() : root
  const comparePath = process.platform === 'win32' ? absolutePath.toLowerCase() : absolutePath
  if (comparePath !== compareRoot && !comparePath.startsWith(compareRoot + sep)) {
    throw new Error('relativePath 超出 Vault/folder 范围')
  }
  return { absolutePath, relativePath, root }
}

/** Filesystem-safe slug from a note title. */
function slugifyTitle(title) {
  let text = String(title ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(SLUG_STRIP_PATTERN, '')
    .replace(/\s+/g, ' ')
    .trim()
  const characters = Array.from(text)
  if (characters.length > SLUG_MAX) text = characters.slice(0, SLUG_MAX).join('').trim()
  text = text.replace(/[.\s]+$/, '').trim().slice(0, 80)
  if (text === '') return '未命名'
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(text)) return `_${text}`
  return text
}

// ---------------------------------------------------------------------------
// Frontmatter (fixed format, written and parsed by this module)
// ---------------------------------------------------------------------------

function yamlScalar(value) {
  const text = String(value ?? '')
  if (text === '') return '""'
  // Plain scalars are used whenever YAML allows it, so simple titles stay
  // readable (`title: 学习贯彻...`); JSON quoting is the fallback.
  const unsafe = /[\u0000-\u001f\u007f]/.test(text)
    || text !== text.trim()
    || /^[-?:,[\]{}#&*!|>'"%@`]/.test(text)
    || /: /.test(text)
    || /:$/.test(text)
    || / #/.test(text)
  return unsafe ? JSON.stringify(text) : text
}

function normalizeTags(value) {
  const input = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[,，、;；\s]+/)
      : []
  const tags = []
  for (const item of input) {
    if (item === null || item === undefined) continue
    const tag = String(item).replace(/^#/, '').trim()
    if (tag !== '' && !tags.includes(tag)) tags.push(tag)
  }
  return tags
}

function normalizeSources(value) {
  if (!Array.isArray(value)) return []
  const sources = []
  for (const item of value) {
    if (item === null || typeof item !== 'object') continue
    const source = {
      title: String(item.title ?? '').trim(),
      url: String(item.url ?? '').trim(),
      publishedAt: String(item.publishedAt ?? item.published_at ?? '').trim(),
    }
    if (source.title === '' && source.url === '' && source.publishedAt === '') continue
    sources.push(source)
  }
  return sources
}

function buildFrontmatter({ kind, title, meetingId, meetingType, date, tags, sources, createdAt }) {
  return [
    '---',
    `type: ${yamlScalar(TYPE_LABEL[kind] ?? RECORD_DIR)}`,
    `title: ${yamlScalar(title)}`,
    `meeting_id: ${yamlScalar(meetingId)}`,
    `meeting_type: ${yamlScalar(meetingType)}`,
    `date: ${yamlScalar(date)}`,
    `tags: ${JSON.stringify(tags)}`,
    `sources: ${JSON.stringify(sources)}`,
    `created_at: ${yamlScalar(createdAt)}`,
    '---',
    '',
  ].join('\n')
}

function parseScalar(rawValue) {
  const value = String(rawValue ?? '').trim()
  if (value === '') return ''
  if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
    try {
      return JSON.parse(value)
    } catch {
      return value.slice(1, -1)
    }
  }
  if (value.startsWith('[') || value.startsWith('{')) {
    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  }
  return value
}

/**
 * Split one Markdown file into frontmatter data and body.
 * Files without a leading `---` line are treated as body-only notes.
 */
function parseNote(raw) {
  const text = String(raw ?? '').replace(/^\uFEFF/, '')
  const empty = { frontmatter: {}, body: text }
  if (!text.startsWith('---')) return empty
  const lines = text.split(/\r?\n/)
  if (lines[0].trim() !== '---') return empty
  let end = -1
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index].trim() === '---') {
      end = index
      break
    }
  }
  if (end === -1) return empty
  const frontmatter = {}
  for (const line of lines.slice(1, end)) {
    const match = /^([A-Za-z_][A-Za-z0-9_-]*)\s*:\s?(.*)$/.exec(line)
    if (!match) continue
    frontmatter[match[1]] = parseScalar(match[2])
  }
  const body = lines.slice(end + 1).join('\n').replace(/^\n+/, '')
  return { frontmatter, body }
}

function tagsFromFrontmatter(value) {
  if (Array.isArray(value)) return value.map(item => String(item).trim()).filter(Boolean)
  if (typeof value === 'string' && value.trim() !== '') return normalizeTags(value)
  return []
}

function titleFromRelativePath(relativePath) {
  const name = relativePath.split('/').pop() ?? relativePath
  const stem = name.replace(/\.md$/i, '')
  const withoutDate = stem.replace(/^\d{4}-\d{2}-\d{2}-/, '')
  return withoutDate.trim() === '' ? stem : withoutDate.trim()
}

function dateFromRelativePath(relativePath) {
  const name = relativePath.split('/').pop() ?? ''
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(name)
  return match ? match[1] : ''
}

function kindFromRelativePath(relativePath) {
  const segments = relativePath.split('/')
  for (const segment of segments) {
    if (DIR_KIND[segment]) return DIR_KIND[segment]
  }
  return 'record'
}

/** Build one scan/search note object from a parsed file. */
function noteFromFile({ absolutePath, relativePath, raw, stat }) {
  const { frontmatter, body } = parseNote(raw)
  const typeLabel = String(frontmatter.type ?? '').trim()
  const kind = DIR_KIND[typeLabel] ?? kindFromRelativePath(relativePath)
  const date = DATE_PATTERN.test(String(frontmatter.date ?? '').trim())
    ? String(frontmatter.date).trim()
    : dateFromRelativePath(relativePath)
  return {
    relativePath,
    absolutePath,
    title: firstString(frontmatter.title, titleFromRelativePath(relativePath)),
    kind,
    date,
    tags: tagsFromFrontmatter(frontmatter.tags),
    meetingId: firstString(frontmatter.meeting_id, frontmatter.meetingId),
    meetingType: firstString(frontmatter.meeting_type, frontmatter.meetingType),
    updatedAt: stat.mtime.toISOString(),
    bytes: stat.size,
    snippet: makeSnippet(body),
    // Internal-only, stripped before results leave the module.
    body,
    mtimeMs: stat.mtimeMs,
  }
}

/** First ~120 visible characters of a body, newlines collapsed. */
function makeSnippet(body, tokens = []) {
  const text = String(body ?? '')
  let start = 0
  if (tokens.length > 0) {
    const lower = text.toLowerCase()
    let earliest = -1
    for (const token of tokens) {
      if (token === '') continue
      const at = lower.indexOf(token)
      if (at !== -1 && (earliest === -1 || at < earliest)) earliest = at
    }
    if (earliest > Math.floor(SNIPPET_CHARS / 3)) start = earliest - Math.floor(SNIPPET_CHARS / 3)
  }
  return text
    .slice(start, start + SNIPPET_CHARS * 2)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, SNIPPET_CHARS)
}

// ---------------------------------------------------------------------------
// Directory walking
// ---------------------------------------------------------------------------

/** All `.md` files below root (recursive, hidden entries skipped, symlinks ignored). */
function collectEntries(root) {
  const entries = []
  if (!isDirectory(root)) return entries
  const pending = [root]
  while (pending.length > 0) {
    const directory = pending.pop()
    let dirents
    try {
      dirents = readdirSync(directory, { withFileTypes: true })
    } catch {
      continue
    }
    for (const dirent of dirents) {
      const name = dirent.name
      if (name.startsWith('.')) continue
      const absolutePath = join(directory, name)
      if (dirent.isDirectory()) {
        pending.push(absolutePath)
        continue
      }
      if (!dirent.isFile() || !/\.md$/i.test(name)) continue
      let stat
      let raw
      try {
        stat = statSync(absolutePath)
        raw = readFileSync(absolutePath, 'utf8')
      } catch {
        continue
      }
      const relativePath = toPosix(relativeOf(root, absolutePath))
      entries.push(noteFromFile({ absolutePath, relativePath, raw, stat }))
    }
  }
  return entries
}

function countMarkdown(root) {
  if (!isDirectory(root)) return 0
  let count = 0
  const pending = [root]
  while (pending.length > 0) {
    const directory = pending.pop()
    let dirents
    try {
      dirents = readdirSync(directory, { withFileTypes: true })
    } catch {
      continue
    }
    for (const dirent of dirents) {
      if (dirent.name.startsWith('.')) continue
      if (dirent.isDirectory()) pending.push(join(directory, dirent.name))
      else if (dirent.isFile() && /\.md$/i.test(dirent.name)) count += 1
    }
  }
  return count
}

function publicNote(entry) {
  const { body, mtimeMs, ...note } = entry
  return note
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Probe one vault folder.
 * @returns {{ ok: boolean, vaultPath: string, folder: string, exists: boolean, noteCount: number }}
 */
export function vaultState(vaultPath, folder) {
  let folderInput = folder
  if (vaultPath !== null && typeof vaultPath === 'object' && vaultPath !== undefined) {
    folderInput = vaultPath.folder ?? folder
    vaultPath = vaultPath.vaultPath
  }
  let normalizedFolder = DEFAULT_FOLDER
  try {
    if (typeof vaultPath !== 'string' || vaultPath.trim() === '') throw new Error('vaultPath 不能为空')
    const absolute = resolve(vaultPath.trim())
    normalizedFolder = normalizeFolder(folderInput)
    let stat = null
    try {
      stat = statSync(absolute)
    } catch {
      stat = null
    }
    if (stat === null || !stat.isDirectory()) {
      return {
        ok: false,
        error: stat === null ? `Vault 目录不存在：${absolute}` : `Vault 路径不是目录：${absolute}`,
        vaultPath: absolute,
        folder: normalizedFolder,
        exists: false,
        noteCount: 0,
      }
    }
    return {
      ok: true,
      vaultPath: absolute,
      folder: normalizedFolder,
      exists: true,
      noteCount: countMarkdown(join(absolute, normalizedFolder)),
    }
  } catch (error) {
    return {
      ...fail(error),
      vaultPath: typeof vaultPath === 'string' ? vaultPath : '',
      folder: normalizedFolder,
      exists: false,
      noteCount: 0,
    }
  }
}

/** Create the vault directory itself (recursive); `.obsidian` is not required. */
export function ensureVault(vaultPath) {
  vaultPath = readVaultPath(vaultPath)
  try {
    if (typeof vaultPath !== 'string' || vaultPath.trim() === '') throw new Error('vaultPath 不能为空')
    const absolute = resolve(vaultPath.trim())
    mkdirSync(absolute, { recursive: true })
    return { ok: true, vaultPath: absolute }
  } catch (error) {
    return fail(error)
  }
}

/**
 * Write one Markdown note atomically (same-dir temp file + rename).
 *
 * @param {object} input
 * @param {string} input.vaultPath
 * @param {string} [input.folder=DEFAULT_FOLDER]
 * @param {'record'|'reference'|'branch'|'material'|'daily'|'index'} [input.kind='record']
 * @param {string} input.title
 * @param {string} [input.content='']
 * @param {object} [input.meta]
 * @returns {{ ok: boolean, relativePath?: string, absolutePath?: string, bytes?: number, error?: string }}
 */
export function writeNote(input = {}) {
  const options = input !== null && typeof input === 'object' ? input : {}
  try {
    const vaultAbsolute = requireVault(options.vaultPath)
    const folder = normalizeFolder(options.folder)
    const meta = options.meta !== null && typeof options.meta === 'object' ? options.meta : {}

    const requestedKind = options.kind ?? meta.kind
    const kind = ['reference', 'branch', 'material', 'daily', 'index'].includes(requestedKind) ? requestedKind : 'record'
    const title = firstString(options.title, meta.title) || '未命名'
    const content = String(options.content ?? options.body ?? '')
    const dateInput = String(meta.date ?? options.date ?? '').trim()
    const date = DATE_PATTERN.test(dateInput) ? dateInput : localDateString()
    const meetingId = firstString(meta.meetingId, meta.meeting_id, options.meetingId, options.meeting_id)
    const meetingType = firstString(meta.meetingType, meta.meeting_type, options.meetingType, options.meeting_type)
    const tags = normalizeTags(meta.tags ?? options.tags)
    const sources = normalizeSources(meta.sources ?? options.sources)
    const createdAt = firstString(meta.createdAt, meta.created_at, options.createdAt) || new Date().toISOString()

    const directoryName = KIND_DIR[kind]
    const targetDirectory = join(vaultAbsolute, folder, directoryName)
    mkdirSync(targetDirectory, { recursive: true })

    const baseName = `${date}-${slugifyTitle(title)}`
    let fileName = `${baseName}.md`
    if (options.overwrite !== true) {
      for (let index = 2; existsSync(join(targetDirectory, fileName)); index += 1) {
        if (index > 999) throw new Error('同名笔记过多，无法生成文件名')
        fileName = `${baseName}-${index}.md`
      }
    }

    const frontmatter = buildFrontmatter({ kind, title, meetingId, meetingType, date, tags, sources, createdAt })
    const body = content === '' ? '' : (content.endsWith('\n') ? content : `${content}\n`)
    const text = `${frontmatter}\n${body}`
    const absolutePath = join(targetDirectory, fileName)
    const tempPath = join(targetDirectory, `.${fileName}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`)
    writeFileSync(tempPath, text, { encoding: 'utf8', mode: 0o600 })
    renameSync(tempPath, absolutePath)

    return {
      ok: true,
      relativePath: `${directoryName}/${fileName}`,
      absolutePath,
      bytes: Buffer.byteLength(text, 'utf8'),
    }
  } catch (error) {
    return fail(error)
  }
}

/**
 * List notes below `<vault>/<folder>` newest first.
 *
 * @param {object} input
 * @returns {{ ok: boolean, notes: Array<object>, error?: string }}
 */
export function scanNotes(input = {}) {
  const options = input !== null && typeof input === 'object' ? input : {}
  try {
    const vaultAbsolute = requireVault(options.vaultPath)
    const folder = normalizeFolder(options.folder)
    const limit = clampLimit(options.limit, SCAN_LIMIT_DEFAULT, SCAN_LIMIT_MAX)
    const entries = collectEntries(join(vaultAbsolute, folder))
    entries.sort((left, right) => {
      const byTime = right.mtimeMs - left.mtimeMs
      return byTime !== 0 ? byTime : left.relativePath.localeCompare(right.relativePath)
    })
    return { ok: true, notes: entries.slice(0, limit).map(publicNote) }
  } catch (error) {
    return fail(error)
  }
}

// Query tokenizer: split on whitespace/punctuation, then add 2-grams for CJK runs.
function tokenizeQuery(query) {
  const text = typeof query === 'string' ? query.trim().toLowerCase() : ''
  if (text === '') return []
  const tokens = []
  const seen = new Set()
  const add = token => {
    const value = token.trim()
    if (value === '' || seen.has(value)) return
    seen.add(value)
    tokens.push(value)
  }
  for (const part of text.split(TOKEN_SPLIT_PATTERN)) {
    if (part === '') continue
    add(part)
    const runs = part.match(CJK_RUN_PATTERN) ?? []
    for (const run of runs) {
      for (let index = 0; index + 1 < run.length; index += 1) add(run.slice(index, index + 2))
    }
  }
  return tokens
}

function countOccurrences(haystack, needle) {
  if (needle === '') return 0
  let count = 0
  let index = 0
  while ((index = haystack.indexOf(needle, index)) !== -1) {
    count += 1
    index += needle.length
  }
  return count
}

/**
 * Full-text search over `<vault>/<folder>`; Chinese and English friendly.
 * Title matches weigh 5, tags 3, body 1. Returns matches sorted by score.
 *
 * @param {object} input
 * @returns {{ ok: boolean, matches: Array<object>, error?: string }}
 */
export function searchNotes(input = {}) {
  const options = input !== null && typeof input === 'object' ? input : {}
  try {
    const vaultAbsolute = requireVault(options.vaultPath)
    const folder = normalizeFolder(options.folder)
    const limit = clampLimit(options.limit, SEARCH_LIMIT_DEFAULT, SEARCH_LIMIT_MAX)
    const tokens = tokenizeQuery(options.query)
    if (tokens.length === 0) return { ok: true, matches: [] }

    const matches = []
    for (const entry of collectEntries(join(vaultAbsolute, folder))) {
      const titleLower = entry.title.toLowerCase()
      const tagsLower = entry.tags.join(' ').toLowerCase()
      const bodyLower = entry.body.toLowerCase()
      let score = 0
      for (const token of tokens) {
        score += countOccurrences(titleLower, token) * TITLE_WEIGHT
        score += countOccurrences(tagsLower, token) * TAG_WEIGHT
        score += countOccurrences(bodyLower, token) * BODY_WEIGHT
      }
      if (score <= 0) continue
      matches.push({
        ...publicNote(entry),
        score,
        snippet: makeSnippet(entry.body, tokens),
      })
    }
    matches.sort((left, right) => {
      const byScore = right.score - left.score
      if (byScore !== 0) return byScore
      const byTime = Date.parse(right.updatedAt) - Date.parse(left.updatedAt)
      return byTime !== 0 ? byTime : left.relativePath.localeCompare(right.relativePath)
    })
    return { ok: true, matches: matches.slice(0, limit) }
  } catch (error) {
    return fail(error)
  }
}

/**
 * Read one note (`.md` only) inside `<vault>/<folder>`.
 *
 * @param {object} input
 * @returns {{ ok: boolean, relativePath?: string, content?: string, error?: string }}
 */
export function readNote(input = {}) {
  const options = input !== null && typeof input === 'object' ? input : {}
  try {
    const vaultAbsolute = requireVault(options.vaultPath)
    const folder = normalizeFolder(options.folder)
    const target = notePath(vaultAbsolute, folder, options.relativePath)
    let stat
    try {
      stat = statSync(target.absolutePath)
    } catch {
      throw new Error(`笔记不存在：${target.relativePath}`)
    }
    if (!stat.isFile()) throw new Error(`笔记不存在：${target.relativePath}`)
    let content
    try {
      content = readFileSync(target.absolutePath, 'utf8')
    } catch (error) {
      throw new Error(`读取笔记失败：${asMessage(error)}`)
    }
    return { ok: true, relativePath: target.relativePath, content }
  } catch (error) {
    return fail(error)
  }
}

/**
 * Update one note's body while preserving its existing YAML frontmatter.
 * User-initiated from the panel only; the model has no edit tool.
 */
export function updateNote(input = {}) {
  const options = input !== null && typeof input === 'object' ? input : {}
  try {
    const vaultAbsolute = requireVault(options.vaultPath)
    const folder = normalizeFolder(options.folder)
    const target = notePath(vaultAbsolute, folder, options.relativePath)
    let original
    try { original = readFileSync(target.absolutePath, 'utf8') } catch { throw new Error(`笔记不存在：${target.relativePath}`) }
    const frontmatterMatch = original.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/)
    const frontmatter = frontmatterMatch === null ? '' : frontmatterMatch[0]
    let body = String(options.content ?? '')
    if (body !== '' && !body.endsWith('\n')) body += '\n'
    const text = `${frontmatter}${body}`
    const tempPath = join(target.absolutePath.replace(/[^\\/]+$/, ''), `.${target.relativePath.split('/').pop()}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`)
    writeFileSync(tempPath, text, { encoding: 'utf8', mode: 0o600 })
    renameSync(tempPath, target.absolutePath)
    return { ok: true, relativePath: target.relativePath, bytes: Buffer.byteLength(text, 'utf8') }
  } catch (error) {
    return fail(error)
  }
}

/**
 * Delete one note (`.md` only). Explicit user action in the knowledge panel;
 * the model/tool surface has no delete capability.
 */
export function deleteNote(input = {}) {
  const options = input !== null && typeof input === 'object' ? input : {}
  try {
    const vaultAbsolute = requireVault(options.vaultPath)
    const folder = normalizeFolder(options.folder)
    const target = notePath(vaultAbsolute, folder, options.relativePath)
    let exists = false
    try { exists = statSync(target.absolutePath).isFile() } catch { exists = false }
    if (!exists) return { ok: true, deleted: false, relativePath: target.relativePath }
    unlinkSync(target.absolutePath)
    return { ok: true, deleted: true, relativePath: target.relativePath }
  } catch (error) {
    return fail(error)
  }
}
