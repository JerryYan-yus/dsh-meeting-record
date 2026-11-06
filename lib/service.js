/**
 * Business service for the meeting-record plugin (v2).
 *
 * One implementation is shared by the HTTP panel routes and the agent tools.
 * The model drives the conversation: it reads templates/organisation data,
 * saves a draft, saves the generated record, and stores knowledge notes into
 * the user's Obsidian vault. The plugin never calls a model itself.
 */
import { accessSync, constants, existsSync, mkdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, dirname, extname, join } from 'node:path'
import {
  clone,
  dataDir,
  ensureDir,
  findBranch,
  findMeeting,
  findTemplate,
  importsDir,
  createEmptyStore,
  loadStore,
  newId,
  nowIso,
  saveStore,
  templatesOf,
} from './store.js'
import { docxToText } from './docx-text.js'
import { buildMeetingDocx } from './docx-export.js'
import { deleteNote, ensureVault, readNote, scanNotes, searchNotes, updateNote, vaultState, writeNote } from './knowledge.js'
import { getSeedDoc, listSeedDocs, SEED_VERSION } from './seed.js'
import { getSkillRef, listSkillRefs, SKILL_REF_VERSION } from './skill-refs.js'

const MAX_RECORD_CHARS = 300000
const MAX_IMPORT_BYTES = 10 * 1024 * 1024
const MAX_DOCX_READ_CHARS = 60000
const PENDING_MARK = '【待核对'
const FILE_DELETE_WAIT_MS = Math.max(0, Number(process.env.MEETRECORD_FILE_DELETE_WAIT_MS ?? 5000) || 5000)
const FILE_DELETE_TTL_MS = 10 * 60 * 1000
const MAX_VISION_PAGES = 3
const PROFILE_LEVELS = { novice: '新手', regular: '一般', expert: '熟练' }
const PROFILE_ROLES = { secretary: '支部书记', organizer: '组织委员', committee: '其他支委', member: '普通党员', other: '其他' }
const PROFILE_PURPOSES = { handwrite: '手抄记录本', archive: '电子归档', report: '上报材料' }
const DELETE_WAIT_MS = Math.max(1000, Number(process.env.MEETRECORD_DELETE_WAIT_MS) || 15000)

const RECORD_LENGTHS = {
  short: { label: '短', total: [600, 1000], perTopic: [150, 250], speeches: '每人 1–3 句', hint: '适合手抄：全篇约 600–1000 字，每议题 150–250 字，只保留关键发言。' },
  medium: { label: '中', total: [1000, 1600], perTopic: [250, 400], speeches: '每人 2–4 句', hint: '全篇约 1000–1600 字，每议题 250–400 字。' },
  long: { label: '长', total: [1600, 2600], perTopic: [400, 700], speeches: '每人 3–6 句', hint: '全篇约 1600–2600 字，每议题 400–700 字。' },
}

function recordLengthInfo(value) {
  const key = typeof value === 'string' && RECORD_LENGTHS[value] !== undefined ? value : 'short'
  return { key, ...RECORD_LENGTHS[key] }
}

function expandHome(path) {
  const raw = String(path ?? '').trim()
  if (raw === '') return ''
  if (raw === '~') return homedir()
  if (/^~[\\/]/.test(raw)) return join(homedir(), raw.slice(2).replace(/^[\\/]+/, ''))
  return raw
}

function countOccurrences(text, needle) {
  if (!text) return 0
  let count = 0
  let index = text.indexOf(needle)
  while (index >= 0) {
    count += 1
    index = text.indexOf(needle, index + needle.length)
  }
  return count
}

function sanitizeFolder(value) {
  const raw = String(value ?? '').trim().replace(/[\\/]/g, '').replace(/\.\./g, '')
  return raw === '' ? '党建会议记录' : raw.slice(0, 80)
}

function sanitizeFileName(title, fallback = '会议记录') {
  let name = String(title ?? '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').replace(/[. ]+$/g, '').trim().slice(0, 60)
  if (name === '') name = fallback
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(name)) name = `_${name}`
  return name
}

function defaultVaultPath() {
  return join(homedir(), 'Documents', '党建会议记录知识库')
}

function ensureVaultWritable(vaultPath) {
  ensureVault(vaultPath)
  mkdirSync(vaultPath, { recursive: true })
  accessSync(vaultPath, constants.W_OK)
}

function uniqueFilePath(target) {
  if (!existsSync(target)) return target
  const extension = extname(target)
  const base = target.slice(0, target.length - extension.length)
  let index = 2
  while (existsSync(`${base}-${index}${extension}`)) index += 1
  return `${base}-${index}${extension}`
}

function normalizeDialogueSpacing(markdown) {
  const lines = String(markdown ?? '').split('\n')
  const out = []
  const isDialogue = line => /^[^：:\n]{1,20}（[^）\n]+）[：:]\s*/.test(line.trim())
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed === '') {
      out.push('')
      continue
    }
    if (isDialogue(trimmed)) {
      const previous = out.length > 0 ? out[out.length - 1].trim() : ''
      if (previous !== '' && !/^#{1,6}\s/.test(previous) && !/^\|/.test(previous) && !/^[-*]\s/.test(previous)) {
        out.push('')
      }
    }
    out.push(line)
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n')
}

function sanitizeSources(input) {
  if (!Array.isArray(input)) return []
  const out = []
  for (const item of input.slice(0, 50)) {
    if (item === null || typeof item !== 'object') continue
    const title = typeof item.title === 'string' ? item.title.slice(0, 300) : ''
    const url = typeof item.url === 'string' ? item.url.slice(0, 2000) : ''
    const publishedAt = typeof item.publishedAt === 'string' ? item.publishedAt.slice(0, 60) : ''
    if (url !== '' && !/^https?:\/\//i.test(url)) continue
    if (title === '' && url === '') continue
    out.push({ title, url, publishedAt })
  }
  const seen = new Set()
  return out.filter(item => {
    const key = item.url || item.title
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function normalizeTopics(input, template) {
  const source = Array.isArray(input) && input.length > 0
    ? input
    : (template?.topics ?? []).map(topic => ({ title: topic.label, points: '', needsResearch: Boolean(topic.needsResearch), key: topic.key }))
  return source.slice(0, 50).map((topic, index) => ({
    id: typeof topic.id === 'string' && topic.id !== '' ? topic.id : newId('tp'),
    seq: index,
    key: typeof topic.key === 'string' ? topic.key : '',
    title: String(topic.title ?? topic.label ?? `议题${index + 1}`).trim() || `议题${index + 1}`,
    points: String(topic.points ?? ''),
    needsResearch: Boolean(topic.needsResearch),
    expectedChars: Math.max(100, Math.min(5000, Number(topic.expectedChars) || 500)),
  }))
}

function normalizeAttendees(input) {
  const people = {}
  if (Array.isArray(input)) {
    for (const item of input.slice(0, 500)) {
      if (typeof item === 'string') people[item] = 'present'
      else if (item !== null && typeof item === 'object' && typeof item.memberId === 'string') {
        people[item.memberId] = item.status === 'leave' || item.status === 'absent' ? item.status : 'present'
      }
    }
  } else if (input !== null && typeof input === 'object') {
    for (const [memberId, status] of Object.entries(input)) {
      if (status === 'present' || status === 'leave' || status === 'absent') people[memberId] = status
    }
  }
  return people
}

export function createService(store) {
  const pendingFileDeletions = new Map()
  const persist = () => saveStore(store)
  const skill = { installed: false, path: '', version: '', installedAt: '' }
  let pendingDelete = null

  function touch(meeting) {
    meeting.updatedAt = nowIso()
    persist()
    return meeting
  }

  function getMeeting(meetingId) {
    const meeting = findMeeting(store, meetingId)
    if (meeting === undefined) throw new Error('会议不存在：' + meetingId)
    return meeting
  }

  function getVault() {
    return { vaultPath: expandHome(store.settings.vaultPath), folder: sanitizeFolder(store.settings.knowledgeFolder) }
  }

  function knowledgeWordDir() {
    let vaultPath = expandHome(store.settings.vaultPath)
    if (vaultPath === '') {
      vaultPath = defaultVaultPath()
      ensureVaultWritable(vaultPath)
      store.settings.vaultPath = vaultPath
      persist()
    }
    const dir = join(vaultPath, sanitizeFolder(store.settings.knowledgeFolder), 'Word导出')
    ensureDir(dir)
    return dir
  }

  function normalizeProfile(input) {
    const source = input !== null && typeof input === 'object' ? input : {}
    const level = Object.prototype.hasOwnProperty.call(PROFILE_LEVELS, source.level) ? source.level : ''
    const role = Object.prototype.hasOwnProperty.call(PROFILE_ROLES, source.role) ? source.role : ''
    const purpose = Object.prototype.hasOwnProperty.call(PROFILE_PURPOSES, source.purpose) ? source.purpose : ''
    return {
      level,
      role,
      purpose,
      notes: String(source.notes ?? store.profile?.notes ?? '').trim().slice(0, 500),
      styleNotes: String(source.styleNotes ?? store.profile?.styleNotes ?? '').trim().slice(0, 1000),
      updatedAt: nowIso(),
    }
  }

  function saveProfile(input) {
    const next = normalizeProfile(input)
    if (next.level === '' && next.role === '' && next.purpose === '') throw new Error('请至少提供 level / role / purpose 中的一项')
    store.profile = next
    persist()
    return { ok: true, profile: profileView(), guidance: profileGuidance() }
  }

  function profileView() {
    const profile = store.profile ?? {}
    return {
      level: profile.level ?? '', levelLabel: PROFILE_LEVELS[profile.level] ?? '',
      role: profile.role ?? '', roleLabel: PROFILE_ROLES[profile.role] ?? '',
      purpose: profile.purpose ?? '', purposeLabel: PROFILE_PURPOSES[profile.purpose] ?? '',
      notes: profile.notes ?? '', styleNotes: profile.styleNotes ?? '', updatedAt: profile.updatedAt ?? '',
    }
  }

  function profileGuidance() {
    const profile = store.profile ?? {}
    const level = profile.level ?? ''
    const purpose = profile.purpose ?? ''
    const suggestedRecordLength = purpose === 'handwrite' ? 'short' : purpose === 'report' ? 'long' : purpose === 'archive' ? 'medium' : (level === 'novice' ? 'short' : level === 'expert' ? 'long' : 'medium')
    const style = level === 'novice'
      ? '新手：每次只给一步操作，用“点这里/复制这句话”的说法；不解释插件、模板、专项流程；信息不全时一次只问一组。'
      : level === 'expert'
        ? '熟练：跳过基础说明，直接确认会议类型、流程和材料缺项。'
        : '一般：简要说明步骤，确认关键信息即可。'
    const roleHint = profile.role === 'organizer'
      ? '用户是组织委员：记录人默认其本人（组织委员），仍以用户指定为准。'
      : profile.role === 'secretary'
        ? '用户是支部书记：主持人默认支部书记，仍以用户指定为准。'
        : ''
    const purposeHint = purpose === 'handwrite' ? '用户要手抄：优先用短长度、精炼对话。' : purpose === 'report' ? '用户要上报：可用长长度、表述更完整。' : ''
    const nextSteps = level === 'novice'
      ? ['在侧栏点「会议记录」完成首次配置。', '复制“帮我写一份会议记录”到对话，并附材料。', '按助手提示确认人员、时间和会议类型。', '生成后回面板查看；满意后导出 Word 或存入知识库。']
      : ['确认会议类型、时间、地点、主持人、参会人员。', '提供材料或说明材料路径。', '生成后确认修改；需要时导出 Word 或存入知识库。']
    return {
      level: profile.level ?? '', levelLabel: PROFILE_LEVELS[profile.level] ?? '',
      role: profile.role ?? '', roleLabel: PROFILE_ROLES[profile.role] ?? '',
      purpose: profile.purpose ?? '', purposeLabel: PROFILE_PURPOSES[profile.purpose] ?? '',
      styleNotes: profile.styleNotes ?? '',
      style, roleHint, purposeHint, suggestedRecordLength, nextSteps,
    }
  }

  function defaultRecorderFor(branchId) {
    const members = store.members.filter(member => member.active !== false && (branchId === '' || member.branchId === branchId))
    const recorder = members.find(member => String(member.position ?? '').includes('组织委员'))
      ?? members.find(member => /组织|组委/.test(String(member.position ?? '')))
    return recorder?.name ?? ''
  }

  const COMMITTEE_ROLE = /(书记|副书记|委员)/
  const ROLE_ORDER = ['支部书记', '副书记', '组织委员', '宣传委员', '纪检委员', '青年委员', '统战委员', '保密委员', '群工委员']

  function summarizeBranch(branchId) {
    const branch = findBranch(store, branchId)
    const members = store.members
      .filter(member => member.active !== false && member.branchId === branchId)
      .map(member => ({ memberId: member.id, name: member.name, position: member.position ?? '', detail: member.detail ?? '' }))
    const committee = members.filter(member => COMMITTEE_ROLE.test(member.position))
    const partyMembers = members.filter(member => !COMMITTEE_ROLE.test(member.position))
    const roles = new Set(members.map(member => member.position).filter(Boolean))
    const missingRoles = []
    if (![...roles].some(role => role.includes('书记'))) missingRoles.push('支部书记')
    if (![...roles].some(role => role.includes('组织委员'))) missingRoles.push('组织委员')
    if (![...roles].some(role => role.includes('宣传委员'))) missingRoles.push('宣传委员')
    const unassigned = partyMembers.filter(member => member.position === '').map(member => member.name)
    return {
      branchId,
      branchName: branch?.name ?? '',
      orgName: branch?.orgName ?? '',
      notes: branch?.notes ?? '',
      committee,
      partyMembers,
      counts: { total: members.length, committee: committee.length, members: partyMembers.length },
      missingRoles,
      unassignedNames: unassigned,
      hasMembers: members.length > 0,
    }
  }

  function decorateMeeting(meeting) {
    const template = findTemplate(store, meeting.templateId)
    const branch = findBranch(store, meeting.branchId)
    const procedures = (meeting.procedureTemplateIds ?? []).map(id => findTemplate(store, id)?.name ?? id)
    const record = String(meeting.recordMarkdown ?? '')
    return {
      ...meeting,
      branchName: branch?.name ?? '',
      templateName: template?.name ?? '',
      procedureNames: procedures,
      charCount: [...record].length,
      pendingCount: countOccurrences(record, PENDING_MARK),
      sourcesCount: Array.isArray(meeting.sources) ? meeting.sources.length : 0,
      hasRecord: record.trim() !== '',
      knowledgeCount: Array.isArray(meeting.knowledgePaths) ? meeting.knowledgePaths.length : 0,
    }
  }

  function meetingSummary(meeting) {
    const decorated = decorateMeeting(meeting)
    return {
      meetingId: decorated.id,
      title: decorated.title,
      meetingDate: decorated.meetingDate,
      meetingTime: decorated.meetingTime,
      meetingType: decorated.meetingType,
      status: decorated.status,
      branchName: decorated.branchName,
      templateName: decorated.templateName,
      procedureNames: decorated.procedureNames,
      charCount: decorated.charCount,
      pendingCount: decorated.pendingCount,
      sourcesCount: decorated.sourcesCount,
      hasRecord: decorated.hasRecord,
      updatedAt: decorated.updatedAt,
    }
  }

  function resolveToolMeeting(input) {
    if (typeof input?.meetingId === 'string' && input.meetingId !== '') return getMeeting(input.meetingId)
    const branchId = store.settings.defaultBranchId
    const candidates = store.meetings
      .filter(meeting => meeting.status !== 'archived')
      .filter(meeting => branchId === '' || meeting.branchId === branchId || meeting.branchId === '')
      .sort((a, b) => String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')))
    if (candidates.length === 0) throw new Error('还没有会议记录，请先让模型用 meeting_draft_save 创建会议草稿，或在面板新建会议')
    return candidates[0]
  }

  function knowledgeView() {
    const { vaultPath, folder } = getVault()
    if (vaultPath === '') return { configured: false, vaultPath: '', folder, notes: [], error: '', skill }
    try {
      const result = scanNotes({ vaultPath, folder, limit: 500 })
      const notes = result.ok ? result.notes : []
      const counts = {}
      for (const note of notes) counts[note.kind ?? 'record'] = (counts[note.kind ?? 'record'] ?? 0) + 1
      const indexNote = notes.find(note => note.kind === 'index')
      return {
        configured: true,
        vaultPath,
        folder,
        notes,
        stats: counts,
        total: notes.filter(note => note.kind !== 'index').length,
        indexPath: indexNote?.relativePath ?? '',
        lastOrganizedAt: indexNote?.updatedAt ?? '',
        error: result.ok ? '' : result.error ?? '',
        skill,
      }
    } catch (error) {
      return { configured: true, vaultPath, folder, notes: [], error: error instanceof Error ? error.message : String(error), skill }
    }
  }

  function buildBranchKnowledgeContent(branch) {
    const members = store.members.filter(member => member.branchId === branch.id && member.active !== false)
    const committee = members.filter(member => /(书记|副书记|委员)/.test(String(member.position ?? '')))
    const partyMembers = members.filter(member => !/(书记|副书记|委员)/.test(String(member.position ?? '')))
    const lines = [
      `# 支部信息：${branch.name}`,
      '',
      `- 单位：${branch.orgName || '未填写'}`,
      `- 补充说明：${branch.notes || '无'}`,
      `- 党员人数：${members.length} 人（支部委员 ${committee.length} 人、党员 ${partyMembers.length} 人）`,
      '',
      '## 支部委员',
      ...(committee.length === 0 ? ['- 无'] : committee.map(member => `- ${member.name}${member.position ? `（${member.position}）` : ''}${member.detail ? `：${member.detail}` : ''}`)),
      '',
      '## 党员',
      ...(partyMembers.length === 0 ? ['- 无'] : partyMembers.map(member => `- ${member.name}${member.position ? `（${member.position}）` : ''}${member.detail ? `：${member.detail}` : ''}`)),
      '',
    ]
    return lines.join('\n')
  }

  function syncBranchKnowledge(branchId) {
    const branch = findBranch(store, branchId)
    if (branch === undefined) throw new Error('支部不存在')
    const result = saveKnowledgeNote({
      kind: 'branch',
      title: `支部信息-${branch.name}`,
      content: buildBranchKnowledgeContent(branch),
      tags: ['支部信息'],
      date: nowIso().slice(0, 10),
    }, 'branch')
    branch.knowledgePath = result.relativePath
    branch.updatedAt = nowIso()
    persist()
    return { ok: true, branchId: branch.id, relativePath: result.relativePath, absolutePath: result.absolutePath }
  }

  function writeKnowledgeSnapshot() {
    try {
      const vaultPath = expandHome(store.settings.vaultPath)
      if (vaultPath === '') return null
      const folder = sanitizeFolder(store.settings.knowledgeFolder)
      const scanned = scanNotes({ vaultPath, folder, limit: 1000 })
      if (scanned.ok !== true) return null
      const notes = []
      for (const note of scanned.notes) {
        const read = readNote({ vaultPath, folder, relativePath: note.relativePath })
        if (read.ok === true) notes.push({ relativePath: note.relativePath, content: read.content })
      }
      const file = join(dataDir(), 'knowledge-backup.json')
      const temp = `${file}.${process.pid}.${Date.now()}.tmp`
      writeFileSync(temp, JSON.stringify({ version: 1, exportedAt: nowIso(), notes }, null, 2), { encoding: 'utf8', mode: 0o600 })
      renameSync(temp, file)
      return file
    } catch {
      return null
    }
  }

  function readKnowledgeSnapshot() {
    try {
      const file = join(dataDir(), 'knowledge-backup.json')
      if (!existsSync(file)) return []
      const parsed = JSON.parse(readFileSync(file, 'utf8'))
      return Array.isArray(parsed?.notes) ? parsed.notes.filter(item => item && typeof item.relativePath === 'string' && typeof item.content === 'string') : []
    } catch {
      return []
    }
  }

  function repairKnowledge(options = {}) {
    const includeHistory = options?.includeHistory === true
    let vaultPath = expandHome(store.settings.vaultPath)
    if (vaultPath === '') {
      vaultPath = defaultVaultPath()
      ensureVaultWritable(vaultPath)
      store.settings.vaultPath = vaultPath
      persist()
    }
    const folder = sanitizeFolder(store.settings.knowledgeFolder)
    ensureVaultWritable(vaultPath)
    let scanned = scanNotes({ vaultPath, folder, limit: 1000 })
    if (scanned.ok !== true) throw new Error(scanned.error ?? '读取知识库失败')
    const report = { mode: includeHistory ? 'full' : 'essential', seed: { installed: 0, skipped: 0 }, branches: [], records: [], restored: [], index: null }
    try {
      const seed = installSeedKnowledgeInternal()
      report.seed = { installed: seed.installed, skipped: seed.skipped }
    } catch (error) {
      report.seed = { installed: 0, skipped: 0, error: error instanceof Error ? error.message : String(error) }
    }
    scanned = scanNotes({ vaultPath, folder, limit: 1000 })
    const paths = new Set(scanned.notes.map(note => note.relativePath))
    if (includeHistory) {
    for (const branch of store.branches) {
      if (branch.knowledgePath !== '' && paths.has(branch.knowledgePath)) continue
      const existing = scanned.notes.find(note => note.kind === 'branch' && note.title.includes(branch.name))
      if (existing !== undefined) {
        branch.knowledgePath = existing.relativePath
        branch.updatedAt = nowIso()
        report.branches.push({ branchId: branch.id, action: 'relinked', path: existing.relativePath })
        continue
      }
      const linked = syncBranchKnowledge(branch.id)
      report.branches.push({ branchId: branch.id, action: 'recreated', path: linked.relativePath })
      paths.add(linked.relativePath)
    }
    for (const meeting of store.meetings) {
      const markdown = String(meeting.recordMarkdown ?? '').trim()
      if (markdown === '') continue
      const linkedPaths = Array.isArray(meeting.knowledgePaths) ? meeting.knowledgePaths : []
      if (linkedPaths.some(path => paths.has(path))) continue
      const existing = scanned.notes.find(note => note.kind === 'record' && note.title.includes(meeting.meetingType ?? '会议记录'))
      if (existing !== undefined) {
        meeting.knowledgePaths = Array.from(new Set([...linkedPaths, existing.relativePath]))
        touch(meeting)
        report.records.push({ meetingId: meeting.id, action: 'relinked', path: existing.relativePath })
        continue
      }
      const branch = findBranch(store, meeting.branchId)
      const title = `${branch?.name ?? ''}${meeting.meetingType ?? ''}会议记录`
      const saved = saveKnowledgeNote({ kind: 'record', title, content: meeting.recordMarkdown, meetingId: meeting.id, date: meeting.meetingDate }, 'repair')
      meeting.knowledgePaths = Array.from(new Set([...linkedPaths, saved.relativePath]))
      touch(meeting)
      report.records.push({ meetingId: meeting.id, action: 'recreated', path: saved.relativePath })
      paths.add(saved.relativePath)
    }
    }
    const snapshotNotes = includeHistory ? readKnowledgeSnapshot() : []
    report.restored = []
    const known = new Set(scanNotes({ vaultPath, folder, limit: 1000 }).notes.map(note => note.relativePath))
    const kindByDir = { 会议记录: 'record', 检索资料: 'reference', 支部信息: 'branch', 支部材料: 'material', 日常工作: 'daily', 规范制度: 'spec', 知识库索引: 'index' }
    for (const item of snapshotNotes) {
      if (known.has(item.relativePath)) continue
      const dir = item.relativePath.split('/')[0]
      const kind = kindByDir[dir]
      if (kind === undefined || kind === 'index') continue
      const titleLine = item.content.split(/\r?\n/).find(line => /^#\s+/.test(line))
      const title = titleLine ? titleLine.replace(/^#\s+/, '').trim() : item.relativePath.split('/').pop().replace(/\.md$/, '')
      const written = writeNote({ vaultPath, folder, kind, title, content: item.content, tags: ['恢复'] })
      if (written.ok === true) {
        known.add(written.relativePath)
        report.restored.push({ relativePath: written.relativePath, originalPath: item.relativePath })
      }
    }
    writeKnowledgeSnapshot()
    try {
      report.index = organizeKnowledge(true).indexPath
    } catch {
      report.index = null
    }
    persist()
    return { ok: true, ...report }
  }

  function ensureKnowledgeBaseline() {
    if (expandHome(store.settings.vaultPath) === '' || store.branches.length === 0) return { ok: true, skipped: true }
    try {
      const scanned = scanNotes({ vaultPath: expandHome(store.settings.vaultPath), folder: sanitizeFolder(store.settings.knowledgeFolder), limit: 1000 })
      if (scanned.ok !== true) return repairKnowledge({ includeHistory: false })
      const notes = scanned.notes
      const missingSeed = listSeedDocs().some(doc => !notes.some(note => note.kind === 'spec' && note.title === `规范-${doc.title}`))
      if (notes.length === 0 || missingSeed) return repairKnowledge({ includeHistory: false })
      return { ok: true, skipped: true }
    } catch {
      return { ok: false, skipped: true }
    }
  }

  function installSeedKnowledgeInternal() {
    let vaultPath = expandHome(store.settings.vaultPath)
    if (vaultPath === '') {
      vaultPath = defaultVaultPath()
      ensureVaultWritable(vaultPath)
      store.settings.vaultPath = vaultPath
      persist()
    }
    const folder = sanitizeFolder(store.settings.knowledgeFolder)
    const scanned = scanNotes({ vaultPath, folder, limit: 1000 })
    if (scanned.ok !== true) throw new Error(scanned.error ?? '读取知识库失败')
    const existing = new Set(scanned.notes.filter(note => note.kind === 'spec').map(note => note.title.replace(/^规范-/, '')))
    let installed = 0
    for (const doc of listSeedDocs()) {
      if (existing.has(doc.title)) continue
      const written = writeNote({
        vaultPath, folder, kind: 'spec', title: `规范-${doc.title}`, content: doc.content,
        tags: ['规范制度', '种子包'], meta: { date: nowIso().slice(0, 10) },
      })
      if (written.ok !== true) throw new Error(written.error ?? '写入规范失败')
      installed += 1
    }
    return { ok: true, installed, skipped: listSeedDocs().length - installed, total: listSeedDocs().length, version: SEED_VERSION }
  }

  const KNOWLEDGE_KIND_LABEL = {
    branch: '支部信息', record: '会议记录', reference: '检索资料',
    material: '支部材料', daily: '日常工作', index: '索引', spec: '规范制度',
  }

  function organizeKnowledge(force = false) {
    let vaultPath = expandHome(store.settings.vaultPath)
    if (vaultPath === '') {
      vaultPath = defaultVaultPath()
      ensureVaultWritable(vaultPath)
      store.settings.vaultPath = vaultPath
      persist()
    }
    const folder = sanitizeFolder(store.settings.knowledgeFolder)
    const scanned = scanNotes({ vaultPath, folder, limit: 1000 })
    if (scanned.ok !== true) throw new Error(scanned.error ?? '读取知识库失败')
    const notes = scanned.notes.filter(note => note.kind !== 'index')
    const indexNote = scanned.notes.find(note => note.kind === 'index')
    if (!force && indexNote !== undefined) {
      const ageDays = (Date.now() - Date.parse(indexNote.updatedAt)) / 86400000
      if (Number.isFinite(ageDays) && ageDays < 30) return { skipped: true, indexPath: indexNote.relativePath, lastOrganizedAt: indexNote.updatedAt }
    }
    const counts = {}
    for (const note of notes) counts[note.kind ?? 'record'] = (counts[note.kind ?? 'record'] ?? 0) + 1
    const recent = [...notes]
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
      .slice(0, 20)
      .map(note => `- ${String(note.date ?? '').slice(0, 10)} ${KNOWLEDGE_KIND_LABEL[note.kind] ?? note.kind}｜${note.title}（${note.relativePath}）`)
    const content = [
      '# 知识库索引',
      '',
      `- 更新时间：${nowIso().slice(0, 19).replace('T', ' ')}`,
      `- 笔记总数：${notes.length} 条`,
      '',
      '## 分类统计',
      ...Object.entries(KNOWLEDGE_KIND_LABEL).filter(([kind]) => kind !== 'index').map(([kind, label]) => `- ${label}：${counts[kind] ?? 0} 条`),
      '',
      '## 最近更新',
      ...(recent.length === 0 ? ['- 暂无'] : recent),
      '',
    ].join('\n')
    const indexDate = String(indexNote?.date ?? nowIso()).slice(0, 10)
    const written = writeNote({ vaultPath, folder, kind: 'index', title: '知识库索引', content, overwrite: true, meta: { date: indexDate, tags: ['知识库索引'] } })
    if (written.ok !== true) throw new Error(written.error ?? '写入索引失败')
    return { skipped: false, indexPath: written.relativePath, total: notes.length, counts, lastOrganizedAt: nowIso() }
  }

  function saveKnowledgeNote(payload, source = 'model') {
    let vaultPath = expandHome(store.settings.vaultPath)
    if (vaultPath === '') {
      vaultPath = defaultVaultPath()
      ensureVaultWritable(vaultPath)
      store.settings.vaultPath = vaultPath
      persist()
    }
    const folder = sanitizeFolder(store.settings.knowledgeFolder)
    const requestedKind = typeof payload?.kind === 'string' ? payload.kind : 'record'
    const kind = ['reference', 'branch', 'material', 'daily', 'index'].includes(requestedKind) ? requestedKind : 'record'
    const title = String(payload?.title ?? '').trim() || (kind === 'record' ? '会议记录' : kind === 'branch' ? '支部信息' : kind === 'material' ? '支部材料' : kind === 'daily' ? '日常工作' : '检索资料')
    const content = String(payload?.content ?? '')
    if (content.trim() === '') throw new Error('知识库内容为空')
    const linkedMeeting = typeof payload?.meetingId === 'string' && payload.meetingId !== ''
      ? findMeeting(store, payload.meetingId)
      : undefined
    const payloadDate = String(payload?.date ?? '').slice(0, 10)
    const date = payloadDate !== '' ? payloadDate : (linkedMeeting?.meetingDate || nowIso().slice(0, 10))
    const payloadMeetingType = String(payload?.meetingType ?? '').trim()
    const meetingType = payloadMeetingType !== '' ? payloadMeetingType : (linkedMeeting?.meetingType ?? '')
    const result = writeNote({
      vaultPath,
      folder,
      kind,
      title,
      content,
      meta: {
        date,
        meetingId: typeof payload?.meetingId === 'string' ? payload.meetingId : '',
        meetingType,
        tags: Array.isArray(payload?.tags) ? payload.tags.slice(0, 20).map(String) : [],
        sources: sanitizeSources(payload?.sources),
        origin: source,
      },
    })
    if (result.ok !== true) throw new Error(result.error ?? '写入知识库失败')
    if (linkedMeeting !== undefined) {
      linkedMeeting.knowledgePaths = Array.from(new Set([...(linkedMeeting.knowledgePaths ?? []), result.relativePath]))
      touch(linkedMeeting)
    }
    writeKnowledgeSnapshot()
    let organized = null
    if (kind !== 'index') {
      try { organized = organizeKnowledge(false) } catch { organized = null }
    }
    return { ...result, organized }
  }

  return {
    get store() {
      return store
    },
    get skill() {
      return skill
    },
    setSkillStatus(status) {
      Object.assign(skill, status)
      if (status.installed) store.settings.skillVersion = status.version ?? ''
      persist()
      return skill
    },

    requestDelete() {
      const token = `del-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      const now = Date.now()
      pendingDelete = { token, requestedAt: now, availableAt: now + DELETE_WAIT_MS }
      return { token, waitSeconds: Math.ceil(DELETE_WAIT_MS / 1000), waitMs: DELETE_WAIT_MS, availableAt: new Date(pendingDelete.availableAt).toISOString() }
    },

    confirmDelete(token) {
      if (pendingDelete === null || pendingDelete.token !== token) {
        return { ok: false, code: 'invalid-token', error: '删除请求无效或已过期，请重新点击“删除数据”。' }
      }
      const remaining = pendingDelete.availableAt - Date.now()
      if (remaining > 0) {
        return { ok: false, code: 'wait', remainingMs: remaining, waitSeconds: Math.ceil(remaining / 1000), error: `请再等待 ${Math.ceil(remaining / 1000)} 秒后确认。` }
      }
      const fresh = createEmptyStore()
      for (const key of Object.keys(store)) delete store[key]
      Object.assign(store, fresh)
      saveStore(store)
      pendingDelete = null
      return { ok: true, message: '已清空插件数据（支部、人员、会议记录）。Obsidian 笔记和导入/导出文件未删除。' }
    },

    reload() {
      const fresh = loadStore()
      for (const key of Object.keys(store)) delete store[key]
      Object.assign(store, fresh)
      return this.state()
    },

    state() {
      const meetings = [...store.meetings]
        .sort((a, b) => String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')))
        .map(decorateMeeting)
      const { vaultPath, folder } = getVault()
      return {
        settings: store.settings,
        branches: store.branches,
        members: store.members,
        templates: templatesOf(store),
        meetings,
        tasks: [...store.tasks]
          .map(task => {
            const meeting = findMeeting(store, task.meetingId)
            return { ...task, meetingTitle: meeting?.title ?? '', meetingDate: meeting?.meetingDate ?? '', meetingType: meeting?.meetingType ?? '' }
          })
          .sort((a, b) => String(a.dueDate || '9999').localeCompare(String(b.dueDate || '9999'))),
        knowledge: knowledgeView(),
        profile: profileView(),
        guidance: profileGuidance(),
        skill,
        vault: { ...vaultState(vaultPath, folder), vaultPath, folder },
      }
    },

    // ---- settings ----
    updateSettings(patch) {
      const next = { ...store.settings }
      if (patch?.vaultPath !== undefined) {
        const vaultPath = expandHome(patch.vaultPath)
        if (vaultPath !== '') {
          try {
            ensureVaultWritable(vaultPath)
          } catch (error) {
            throw new Error('Vault 目录不可写：' + vaultPath + '（' + (error instanceof Error ? error.message : String(error)) + '）')
          }
        }
        next.vaultPath = vaultPath
      }
      if (patch?.knowledgeFolder !== undefined) next.knowledgeFolder = sanitizeFolder(patch.knowledgeFolder)
      if (patch?.defaultBranchId !== undefined) next.defaultBranchId = String(patch.defaultBranchId ?? '')
      if (patch?.defaultTemplateId !== undefined) next.defaultTemplateId = String(patch.defaultTemplateId ?? '')
      if (patch?.recordLength !== undefined) {
        const value = String(patch.recordLength)
        if (RECORD_LENGTHS[value] === undefined) throw new Error('记录长度只能是 short / medium / long')
        next.recordLength = value
      }
      if (patch?.allowWebSearch !== undefined) next.allowWebSearch = Boolean(patch.allowWebSearch)
      if (patch?.maxSearches !== undefined) next.maxSearches = Math.max(0, Math.min(50, Number(patch.maxSearches) || 0))
      store.settings = next
      persist()
      return next
    },

    // ---- branches / members ----
    branchCreate(input) {
      const name = String(input?.name ?? '').trim()
      if (name === '') throw new Error('支部名称不能为空')
      const branch = { id: newId('br'), name, orgName: String(input?.orgName ?? '').trim(), notes: String(input?.notes ?? '').trim(), createdAt: nowIso() }
      store.branches.push(branch)
      persist()
      return branch
    },

    branchUpdate(branchId, patch) {
      const branch = store.branches.find(item => item.id === branchId)
      if (branch === undefined) throw new Error('支部不存在')
      for (const key of ['name', 'orgName', 'notes']) {
        if (patch?.[key] !== undefined) branch[key] = String(patch[key]).trim()
      }
      persist()
      return branch
    },

    memberCreate(input) {
      const name = String(input?.name ?? '').trim()
      if (name === '') throw new Error('成员姓名不能为空')
      const member = {
        id: newId('mb'),
        branchId: String(input?.branchId ?? ''),
        name,
        position: String(input?.position ?? '').trim(),
        detail: String(input?.detail ?? '').trim(),
        active: true,
        createdAt: nowIso(),
      }
      store.members.push(member)
      persist()
      return member
    },

    memberUpdate(memberId, patch) {
      const member = store.members.find(item => item.id === memberId)
      if (member === undefined) throw new Error('成员不存在')
      for (const key of ['name', 'branchId', 'position', 'detail']) {
        if (patch?.[key] !== undefined) member[key] = String(patch[key]).trim()
      }
      if (patch?.active !== undefined) member.active = Boolean(patch.active)
      persist()
      return member
    },

    memberRemove(memberId) {
      const member = store.members.find(item => item.id === memberId)
      if (member === undefined) throw new Error('成员不存在')
      member.active = false
      member.removedAt = nowIso()
      persist()
      return { ok: true }
    },

    // ---- templates ----
    templateCreate(input) {
      const name = String(input?.name ?? '').trim()
      if (name === '') throw new Error('模板名称不能为空')
      const kind = input?.kind === 'procedure' ? 'procedure' : 'meeting'
      const template = {
        id: newId('tpl-custom'),
        kind,
        name,
        meetingType: String(input?.meetingType ?? '').trim(),
        label: String(input?.label ?? name).trim(),
        description: String(input?.description ?? '').trim(),
        applicableMeetingTypes: Array.isArray(input?.applicableMeetingTypes) ? input.applicableMeetingTypes.map(String) : [],
        requiredInfo: Array.isArray(input?.requiredInfo) ? input.requiredInfo.map(String) : ['meetingDate', 'meetingTime', 'location', 'host', 'recorder', 'attendees'],
        topics: Array.isArray(input?.topics)
          ? input.topics.map((topic, index) => ({
            key: String(topic?.key ?? `custom_${index + 1}`),
            label: String(topic?.label ?? topic?.title ?? `议题${index + 1}`),
            fields: Array.isArray(topic?.fields) ? topic.fields : [],
            structure: Array.isArray(topic?.structure) ? topic.structure.map(String) : [],
            speakingOrder: Array.isArray(topic?.speakingOrder) ? topic.speakingOrder.map(String) : [],
            keyPoints: String(topic?.keyPoints ?? ''),
            tone: String(topic?.tone ?? ''),
            minSpeeches: Number(topic?.minSpeeches) || 0,
            needsResearch: Boolean(topic?.needsResearch),
          }))
          : [],
        procedureSteps: Array.isArray(input?.procedureSteps) ? input.procedureSteps.map(String) : [],
        speakingOrder: Array.isArray(input?.speakingOrder) ? input.speakingOrder.map(String) : [],
        keyPoints: String(input?.keyPoints ?? ''),
        tone: String(input?.tone ?? ''),
        writingRequirements: String(input?.writingRequirements ?? '').trim(),
        builtin: false,
        createdAt: nowIso(),
      }
      store.customTemplates.push(template)
      persist()
      return template
    },

    templateUpdate(templateId, patch) {
      const template = store.customTemplates.find(item => item.id === templateId)
      if (template === undefined) throw new Error('只能编辑自定义模板（内置模板请先复制）')
      for (const key of ['name', 'meetingType', 'label', 'description', 'writingRequirements', 'keyPoints', 'tone']) {
        if (patch?.[key] !== undefined) template[key] = String(patch[key])
      }
      if (Array.isArray(patch?.topics)) {
        template.topics = patch.topics.map((topic, index) => ({
          key: String(topic?.key ?? `custom_${index + 1}`),
          label: String(topic?.label ?? topic?.title ?? `议题${index + 1}`),
          fields: Array.isArray(topic?.fields) ? topic.fields : [],
          structure: Array.isArray(topic?.structure) ? topic.structure.map(String) : [],
          speakingOrder: Array.isArray(topic?.speakingOrder) ? topic.speakingOrder.map(String) : [],
          keyPoints: String(topic?.keyPoints ?? ''),
          tone: String(topic?.tone ?? ''),
          minSpeeches: Number(topic?.minSpeeches) || 0,
          needsResearch: Boolean(topic?.needsResearch),
        }))
      }
      if (Array.isArray(patch?.procedureSteps)) template.procedureSteps = patch.procedureSteps.map(String)
      persist()
      return template
    },

    templateDuplicate(templateId) {
      const source = templatesOf(store).find(item => item.id === templateId)
      if (source === undefined) throw new Error('模板不存在：' + templateId)
      const copy = { ...clone(source), id: newId('tpl-custom'), name: source.name.replace(/（内置.*）$/, '') + '（自定义）', builtin: false, createdAt: nowIso() }
      store.customTemplates.push(copy)
      persist()
      return copy
    },

    // ---- meetings ----
    meetingCreate(input) {
      const template = findTemplate(store, input?.templateId ?? store.settings.defaultTemplateId)
      if (template === undefined || template.kind !== 'meeting') throw new Error('无效的会议模板')
      const branch = findBranch(store, String(input?.branchId ?? store.settings.defaultBranchId ?? ''))
      const meeting = {
        id: newId('mr'),
        branchId: branch?.id ?? String(input?.branchId ?? ''),
        templateId: template.id,
        procedureTemplateIds: Array.isArray(input?.procedureTemplateIds) ? input.procedureTemplateIds.filter(String) : [],
        title: String(input?.title ?? '').trim() || `${branch?.name ?? ''}${template.meetingType}会议记录`,
        meetingDate: String(input?.meetingDate ?? '').trim(),
        meetingTime: String(input?.meetingTime ?? '').trim(),
        meetingType: template.meetingType,
        location: String(input?.location ?? '').trim(),
        host: String(input?.host ?? '').trim(),
        recorder: String(input?.recorder ?? '').trim() || defaultRecorderFor(branch?.id ?? String(input?.branchId ?? '')),
        expectedCount: Math.max(0, Number(input?.expectedCount) || 0),
        actualCount: Math.max(0, Number(input?.actualCount) || 0),
        attendees: normalizeAttendees(input?.attendees),
        topics: normalizeTopics(input?.topics, template),
        recordMarkdown: '',
        sources: sanitizeSources(input?.sources),
        knowledgePaths: [],
        versions: [],
        status: 'draft',
        revision: 0,
        sessionId: null,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      }
      store.meetings.push(meeting)
      persist()
      return decorateMeeting(meeting)
    },

    meetingUpdate(meetingId, patch) {
      const meeting = getMeeting(meetingId)
      if (patch?.templateId !== undefined) {
        const template = findTemplate(store, String(patch.templateId))
        if (template !== undefined && template.kind === 'meeting') {
          meeting.templateId = template.id
          meeting.meetingType = template.meetingType
        }
      }
      for (const key of ['title', 'meetingDate', 'meetingTime', 'location', 'host', 'recorder', 'branchId']) {
        if (patch?.[key] !== undefined) meeting[key] = String(patch[key]).trim()
      }
      if (meeting.recorder === '') meeting.recorder = defaultRecorderFor(meeting.branchId)
      for (const key of ['expectedCount', 'actualCount']) {
        if (patch?.[key] !== undefined) meeting[key] = Math.max(0, Number(patch[key]) || 0)
      }
      if (patch?.attendees !== undefined) meeting.attendees = normalizeAttendees(patch.attendees)
      if (Array.isArray(patch?.procedureTemplateIds)) {
        meeting.procedureTemplateIds = patch.procedureTemplateIds.map(String).filter(id => {
          const template = findTemplate(store, id)
          return template !== undefined && template.kind === 'procedure'
        })
      }
      if (Array.isArray(patch?.topics)) {
        const template = findTemplate(store, meeting.templateId)
        meeting.topics = normalizeTopics(patch.topics, template)
      }
      if (patch?.recordMarkdown !== undefined) meeting.recordMarkdown = String(patch.recordMarkdown).slice(0, MAX_RECORD_CHARS)
      if (patch?.sources !== undefined) meeting.sources = sanitizeSources(patch.sources)
      meeting.revision = (Number(meeting.revision) || 0) + 1
      return decorateMeeting(touch(meeting))
    },

    draftSave(input) {
      if (typeof input?.meetingId === 'string' && input.meetingId !== '' && findMeeting(store, input.meetingId) !== undefined) {
        return this.meetingUpdate(input.meetingId, input)
      }
      const template = findTemplate(store, String(input?.templateId ?? '').trim())
      if (template === undefined || template.kind !== 'meeting') {
        throw new Error('请先指定一个会议模板（meeting_template_list 可查看模板 id）')
      }
      return this.meetingCreate({ ...input, templateId: template.id })
    },

    recordSave(meetingId, { markdown, sources, final = false, sessionId } = {}) {
      const meeting = getMeeting(meetingId)
      if (typeof markdown === 'string') meeting.recordMarkdown = normalizeDialogueSpacing(markdown).slice(0, MAX_RECORD_CHARS)
      if (sources !== undefined) meeting.sources = sanitizeSources(sources)
      if (typeof sessionId === 'string' && sessionId !== '') meeting.sessionId = sessionId
      meeting.revision = (Number(meeting.revision) || 0) + 1
      if (final) {
        if (String(meeting.recordMarkdown ?? '').trim() === '') throw new Error('正文为空，不能定稿')
        meeting.status = 'finalized'
        meeting.finalizedAt = nowIso()
        meeting.versions = [...(meeting.versions ?? []), {
          versionNo: (meeting.versions?.length ?? 0) + 1,
          type: 'finalized',
          createdAt: meeting.finalizedAt,
          recordMarkdown: meeting.recordMarkdown,
          sources: meeting.sources,
          procedureTemplateIds: meeting.procedureTemplateIds,
        }]
      } else if (String(meeting.recordMarkdown ?? '').trim() !== '') {
        meeting.status = 'generated'
        meeting.finalizedAt = null
      }
      touch(meeting)
      return {
        ok: true,
        meetingId: meeting.id,
        status: meeting.status,
        revision: meeting.revision,
        chars: [...String(meeting.recordMarkdown ?? '')].length,
        pendingCount: countOccurrences(String(meeting.recordMarkdown ?? ''), PENDING_MARK),
      }
    },

    finalize(meetingId, reason = '') {
      const meeting = getMeeting(meetingId)
      const issues = this.check(meetingId)
      if (issues.some(item => item.level === 'block')) return { ok: false, code: 'blocked', issues }
      const result = this.recordSave(meetingId, { final: true })
      meeting.finalReason = String(reason ?? '')
      persist()
      return { ok: true, issues, meeting: decorateMeeting(meeting), ...result }
    },

    check(meetingId) {
      const meeting = getMeeting(meetingId)
      const issues = []
      const record = String(meeting.recordMarkdown ?? '')
      if (record.trim() === '') issues.push({ level: 'block', message: '还没有会议记录正文' })
      if (String(meeting.meetingDate ?? '').trim() === '') issues.push({ level: 'confirm', message: '缺少会议日期' })
      if (String(meeting.host ?? '').trim() === '') issues.push({ level: 'confirm', message: '主持人未填写' })
      if (String(meeting.recorder ?? '').trim() === '') issues.push({ level: 'confirm', message: '记录人未填写' })
      const present = Object.values(meeting.attendees ?? {}).filter(status => status === 'present').length
      if (Number(meeting.expectedCount) > 0 && present > 0 && present !== Number(meeting.expectedCount)) {
        issues.push({ level: 'confirm', message: `勾选出席 ${present} 人，与“应到人数” ${meeting.expectedCount} 人不一致` })
      }
      const pending = countOccurrences(record, PENDING_MARK)
      if (pending > 0) issues.push({ level: 'confirm', message: `正文中仍有 ${pending} 处【待核对】，请确认已逐项核对` })
      if (record.length > 0 && [...record].length < 300) issues.push({ level: 'suggest', message: '正文偏短，可能不完整' })
      for (const id of meeting.procedureTemplateIds ?? []) {
        const template = findTemplate(store, id)
        if (template === undefined) continue
        if ((template.keyPoints ?? '').includes('票数') && !/票/.test(record)) {
          issues.push({ level: 'confirm', message: `专项流程“${template.name}”要求记录票数，正文中未检测到票数` })
        }
      }
      const typeAndProcedures = `${meeting.meetingType ?? ''} ${(meeting.procedureTemplateIds ?? []).join(' ')}`
      if (/发展党员|fazhan/.test(typeAndProcedures) && !/票|表决|赞成/.test(record)) {
        issues.push({ level: 'confirm', message: '发展党员环节应记录表决方式或票数，正文中未检测到' })
      }
      if (/选举|xuanju/.test(typeAndProcedures) && !/票/.test(record)) {
        issues.push({ level: 'confirm', message: '选举环节应记录选票/得票情况，正文中未检测到' })
      }
      if (/组织生活会|民主评议/.test(typeAndProcedures) && !/批评|整改|评议/.test(record)) {
        issues.push({ level: 'confirm', message: '组织生活会/民主评议应包含批评意见、整改或评议内容，正文中未检测到' })
      }
      return issues
    },

    importDocx(meetingId, payload) {
      const meeting = getMeeting(meetingId)
      const name = String(payload?.name ?? '修订稿.docx')
      const base64 = String(payload?.dataBase64 ?? '')
      if (base64 === '') throw new Error('文件内容为空')
      const buffer = Buffer.from(base64, 'base64')
      if (buffer.length > MAX_IMPORT_BYTES) throw new Error('文件超过 10MB')
      const ext = (extname(name).replace('.', '') || '').toLowerCase()
      let text = ''
      try {
        if (ext === 'docx') text = docxToText(buffer)
        else if (ext === 'txt' || ext === 'md' || ext === 'markdown') text = buffer.toString('utf8')
        else throw new Error('只支持 Word(.docx) 或文本文件')
      } catch (error) {
        throw new Error('读取文件失败：' + (error instanceof Error ? error.message : String(error)))
      }
      if (text.trim() === '') throw new Error('文件中没有可读取的文字')
      ensureDir(importsDir())
      const originalFile = join(importsDir(), `${newId('imp')}${ext === '' ? '' : `.${ext}`}`)
      writeFileSync(originalFile, buffer)
      meeting.recordMarkdown = normalizeDialogueSpacing(text).slice(0, MAX_RECORD_CHARS)
      meeting.sourceImport = { name, ext, bytes: buffer.length, chars: [...text].length, importedAt: nowIso(), originalFile }
      meeting.status = 'generated'
      meeting.revision = (Number(meeting.revision) || 0) + 1
      touch(meeting)
      return decorateMeeting(meeting)
    },

    exportDocx(meetingId) {
      const meeting = getMeeting(meetingId)
      const buffer = buildMeetingDocx(store, meeting)
      const safeTitle = sanitizeFileName(meeting.title)
      return { base64: buffer.toString('base64'), filename: `${safeTitle}.docx`, bytes: buffer.length }
    },

    exportDocxToVault(meetingId) {
      const meeting = getMeeting(meetingId)
      const buffer = buildMeetingDocx(store, meeting)
      const safeTitle = sanitizeFileName(meeting.title)
      const date = String(meeting.meetingDate ?? '').slice(0, 10) || nowIso().slice(0, 10)
      const target = uniqueFilePath(join(knowledgeWordDir(), `${date}-${safeTitle}.docx`))
      writeFileSync(target, buffer)
      meeting.wordExportPath = target
      persist()
      return { ok: true, path: target, filename: basename(target), bytes: buffer.length }
    },

    toolExportDocx(input) {
      const meeting = resolveToolMeeting(input)
      const buffer = buildMeetingDocx(store, meeting)
      const safeTitle = sanitizeFileName(meeting.title)
      const date = String(meeting.meetingDate ?? '').slice(0, 10) || nowIso().slice(0, 10)
      const requested = String(input?.outputPath ?? '').trim()
      let target
      if (requested !== '') {
        target = expandHome(requested)
        if (!/\.docx$/i.test(target)) target = `${target}.docx`
        ensureDir(dirname(target))
      } else {
        const buffered = buildMeetingDocx(store, meeting)
        const dir = knowledgeWordDir()
        target = uniqueFilePath(join(dir, `${date}-${safeTitle}.docx`))
        writeFileSync(target, buffered)
        return { ok: true, path: target, filename: basename(target), bytes: buffered.length }
      }
      writeFileSync(target, buffer)
      return { ok: true, path: target, filename: basename(target), bytes: buffer.length }
    },

    // ---- knowledge ----
    knowledgeList() {
      return knowledgeView()
    },

    knowledgeSearch(query, limit = 10) {
      const { vaultPath, folder } = getVault()
      if (vaultPath === '') throw new Error('尚未配置 Obsidian Vault 目录')
      return searchNotes({ vaultPath, folder, query: String(query ?? ''), limit: Math.max(1, Math.min(50, Number(limit) || 10)) })
    },

    knowledgeRead(relativePath) {
      const { vaultPath, folder } = getVault()
      if (vaultPath === '') throw new Error('尚未配置 Obsidian Vault 目录')
      return readNote({ vaultPath, folder, relativePath: String(relativePath ?? '') })
    },

    saveProfile(input) { return saveProfile(input) },

    profile() { return { profile: profileView(), guidance: profileGuidance() } },

    syncBranchKnowledge(branchId) {
      return syncBranchKnowledge(String(branchId ?? ''))
    },

    organizeKnowledge(force = false) { return organizeKnowledge(force === true) },

    repairKnowledge(options = {}) { return repairKnowledge(options) },

    ensureKnowledgeBaseline() { return ensureKnowledgeBaseline() },

    taskSave(input) {
      const meeting = typeof input?.meetingId === 'string' && input.meetingId !== '' ? findMeeting(store, input.meetingId) : undefined
      if (meeting === undefined) throw new Error('请提供有效的 meetingId')
      const rawTasks = Array.isArray(input?.tasks) ? input.tasks.slice(0, 50) : []
      const saved = []
      for (const item of rawTasks) {
        const content = String(typeof item === 'string' ? item : item?.content ?? '').trim()
        if (content === '') continue
        const exists = store.tasks.some(task => task.meetingId === meeting.id && task.content === content)
        if (exists) continue
        const task = {
          id: newId('tk'),
          meetingId: meeting.id,
          branchId: meeting.branchId,
          content,
          owner: String(item?.owner ?? '').trim(),
          dueDate: String(item?.dueDate ?? '').slice(0, 10),
          status: 'open',
          createdAt: nowIso(),
          updatedAt: nowIso(),
        }
        store.tasks.push(task)
        saved.push(task)
      }
      persist()
      return { ok: true, saved: saved.map(task => ({ id: task.id, content: task.content, owner: task.owner, dueDate: task.dueDate })), count: saved.length }
    },

    taskList(input) {
      const status = ['open', 'done', 'cancelled', 'all'].includes(input?.status) ? input.status : 'open'
      const meetingId = String(input?.meetingId ?? '')
      const branchId = String(input?.branchId ?? '')
      const limit = Math.max(1, Math.min(100, Number(input?.limit) || 30))
      return {
        tasks: [...store.tasks]
          .filter(task => (status === 'all' || task.status === status) && (meetingId === '' || task.meetingId === meetingId) && (branchId === '' || task.branchId === branchId))
          .slice(0, limit)
          .map(task => {
            const meeting = findMeeting(store, task.meetingId)
            return { ...task, meetingTitle: meeting?.title ?? '', meetingDate: meeting?.meetingDate ?? '', meetingType: meeting?.meetingType ?? '' }
          }),
      }
    },

    taskUpdate(taskId, patch) {
      const task = store.tasks.find(item => item.id === taskId)
      if (task === undefined) throw new Error('任务不存在')
      if (patch?.content !== undefined) task.content = String(patch.content).trim()
      if (patch?.owner !== undefined) task.owner = String(patch.owner).trim()
      if (patch?.dueDate !== undefined) task.dueDate = String(patch.dueDate).slice(0, 10)
      if (patch?.status !== undefined) {
        if (!['open', 'done', 'cancelled'].includes(patch.status)) throw new Error('任务状态只能是 open / done / cancelled')
        task.status = patch.status
      }
      task.updatedAt = nowIso()
      persist()
      return { ok: true, task }
    },

    prepPack(input) {
      const meeting = typeof input?.meetingId === 'string' && input.meetingId !== '' ? findMeeting(store, input.meetingId) : undefined
      const branch = meeting !== undefined
        ? findBranch(store, meeting.branchId)
        : (findBranch(store, String(input?.branchId ?? '')) ?? findBranch(store, store.settings.defaultBranchId) ?? store.branches[0])
      const template = meeting !== undefined ? findTemplate(store, meeting.templateId) : findTemplate(store, String(input?.templateId ?? store.settings.defaultTemplateId))
      const meetingType = meeting?.meetingType || template?.meetingType || '支委会'
      const date = meeting?.meetingDate || String(input?.meetingDate ?? '').slice(0, 10)
      const time = meeting?.meetingTime || String(input?.meetingTime ?? '').trim()
      const location = meeting?.location || String(input?.location ?? '').trim()
      const host = meeting?.host || String(input?.host ?? '').trim()
      const recorder = meeting?.recorder || String(input?.recorder ?? '').trim()
      const topics = (Array.isArray(input?.topics) && input.topics.length > 0
        ? input.topics.map(item => typeof item === 'string' ? item : item?.title ?? '').filter(Boolean)
        : (meeting?.topics?.length ? meeting.topics.map(topic => topic.title ?? topic.label) : (template?.topics ?? []).map(topic => topic.label))).slice(0, 10)
      const members = store.members.filter(member => member.active !== false && branch !== undefined && member.branchId === branch.id)
      const lines = [
        `# ${branch?.name ?? ''}${meetingType}会议材料`,
        '',
        '## 一、会议方案',
        `- 会议类型：${meetingType}`,
        `- 会议时间：${date || '【待核对：日期】'}${time ? ` ${time}` : ''}`,
        `- 会议地点：${location || '【待核对：地点】'}`,
        `- 主持人：${host || '【待核对：主持人】'}`,
        `- 记录人：${recorder || '【待核对：记录人】'}`,
        `- 参会人员：${members.length > 0 ? members.map(member => member.name).join('、') : '【待核对：参会人员】'}`,
        '',
        '## 二、会议议程',
        ...(topics.length === 0 ? ['1. 【待核对：议题】'] : topics.map((topic, index) => `${index + 1}. ${topic}`)),
        '',
        '## 三、会议通知',
        '',
        `${branch?.name ?? 'XX党支部'}定于${date || '【待核对：日期】'}${time ? ` ${time}` : ''}在${location || '【待核对：地点】'}召开${meetingType}，请参会人员准时参加。`,
        '',
        '## 四、签到表',
        '',
        '| 姓名 | 职务 | 签到 |',
        '| --- | --- | --- |',
        ...(members.length === 0 ? ['|  |  |  |'] : members.map(member => `| ${member.name} | ${member.position || ''} |  |`)),
        '',
        '## 五、主持词（参考）',
        '',
        `各位同志：现在开会。今天召开${meetingType}，应到${members.length}人。`,
        '本次会议议题：',
        ...(topics.length === 0 ? ['1. 【待核对：议题】'] : topics.map((topic, index) => `${index + 1}. ${topic}`)),
        '下面逐项进行。',
        '',
      ]
      return { ok: true, title: `${branch?.name ?? ''}${meetingType}会议材料`, markdown: lines.join('\n'), meetingId: meeting?.id ?? '', meetingType }
    },

    skillGuideList() {
      return { ok: true, version: SKILL_REF_VERSION, topics: listSkillRefs().map(doc => ({ id: doc.id, title: doc.title })) }
    },

    skillGuideGet(topic) {
      const doc = getSkillRef(topic)
      if (doc === undefined) {
        return { ok: false, error: '没有找到对应参考模块，可先调用 meeting_skill_guide 查看目录', topics: listSkillRefs().map(item => ({ id: item.id, title: item.title })) }
      }
      return { ok: true, id: doc.id, title: doc.title, version: doc.version, content: doc.content.slice(0, 12000), truncated: doc.content.length > 12000 }
    },

    guideList() {
      return { ok: true, version: SEED_VERSION, docs: listSeedDocs().map(doc => ({ id: doc.id, title: doc.title, summary: doc.summary })) }
    },

    guideGet(topic) {
      const doc = getSeedDoc(topic)
      if (doc === undefined) {
        return { ok: false, error: '没有找到对应规范，可先调用 meeting_guide_list 查看目录', docs: listSeedDocs().map(item => ({ id: item.id, title: item.title })) }
      }
      return { ok: true, id: doc.id, title: doc.title, version: doc.version, content: doc.content.slice(0, 12000), truncated: doc.content.length > 12000 }
    },

    installSeedKnowledge() {
      return installSeedKnowledgeInternal()
    },

    knowledgeImportFiles(input) {
      const rawFiles = Array.isArray(input?.files) ? input.files : []
      if (rawFiles.length === 0) throw new Error('请提供要导入的文件路径')
      if (rawFiles.length > 20) throw new Error('一次最多导入 20 个文件')
      let vaultPath = expandHome(store.settings.vaultPath)
      if (vaultPath === '') {
        vaultPath = defaultVaultPath()
        ensureVaultWritable(vaultPath)
        store.settings.vaultPath = vaultPath
        persist()
      }
      const folder = sanitizeFolder(store.settings.knowledgeFolder)
      const results = []
      for (const item of rawFiles) {
        const rawPath = expandHome(String(item?.path ?? '').trim())
        const name = basename(rawPath)
        try {
          if (!existsSync(rawPath) || !statSync(rawPath).isFile()) throw new Error('文件不存在')
          const ext = (extname(rawPath).replace('.', '') || '').toLowerCase()
          if (!['docx', 'txt', 'md', 'markdown'].includes(ext)) throw new Error('只支持 .docx/.txt/.md；PDF/图片需先转文字')
          if (statSync(rawPath).size > MAX_IMPORT_BYTES) throw new Error('文件超过 10MB')
          const text = ext === 'docx' ? docxToText(readFileSync(rawPath)) : readFileSync(rawPath, 'utf8')
          const limit = 200000
          const truncated = [...text].length > limit
          const body = truncated ? [...text].slice(0, limit).join('') : text
          const title = String(item?.title ?? '').trim() || name.replace(/\.[^.]+$/, '')
          const summary = String(item?.summary ?? '').trim()
          const kind = ['material', 'daily', 'reference'].includes(item?.kind) ? item.kind : 'material'
          const content = `# ${title}\n${summary !== '' ? `\n> 摘要：${summary}\n` : ''}\n## 原文\n\n${body}${truncated ? '\n\n【原文过长，已截断；完整文件：' + rawPath + '】' : ''}\n`
          const written = writeNote({
            vaultPath, folder, kind, title, content,
            tags: Array.isArray(item?.tags) ? item.tags.slice(0, 6).map(tag => String(tag)) : ['导入'],
            meta: { date: nowIso().slice(0, 10) },
          })
          if (written.ok !== true) throw new Error(written.error ?? '写入知识库失败')
          results.push({ name, relativePath: written.relativePath, chars: [...body].length, truncated })
        } catch (error) {
          results.push({ name, error: error instanceof Error ? error.message : String(error) })
        }
      }
      return { ok: true, count: results.filter(item => item.error === undefined).length, results }
    },

    knowledgeImport(files, kind = 'material') {
      if (!Array.isArray(files) || files.length === 0) throw new Error('请提供要导入的文件')
      if (files.length > 20) throw new Error('一次最多导入 20 个文件')
      let vaultPath = expandHome(store.settings.vaultPath)
      if (vaultPath === '') {
        vaultPath = defaultVaultPath()
        ensureVaultWritable(vaultPath)
        store.settings.vaultPath = vaultPath
        persist()
      }
      const folder = sanitizeFolder(store.settings.knowledgeFolder)
      const results = []
      for (const file of files) {
        const name = basename(String(file?.name ?? '').trim())
        const ext = extname(name).replace('.', '').toLowerCase()
        if (!['md', 'txt', 'docx'].includes(ext)) throw new Error(`不支持的文件类型：${name}（只支持 .md/.txt/.docx）`)
        const buffer = Buffer.from(String(file?.dataBase64 ?? ''), 'base64')
        if (buffer.length === 0) throw new Error(`文件为空：${name}`)
        if (buffer.length > MAX_IMPORT_BYTES) throw new Error(`文件过大：${name}`)
        const text = ext === 'docx' ? docxToText(buffer) : buffer.toString('utf8')
        const content = text.slice(0, MAX_DOCX_READ_CHARS)
        const title = name.slice(0, name.length - ext.length - 1).trim() || '导入材料'
        const written = writeNote({
          vaultPath, folder, kind: kind === 'daily' ? 'daily' : 'material',
          title, content, tags: ['导入', kind === 'daily' ? '日常工作' : '支部材料'],
          meta: { date: nowIso().slice(0, 10) },
        })
        if (written.ok !== true) throw new Error(written.error ?? '写入知识库失败')
        results.push({ name, relativePath: written.relativePath, chars: content.length })
      }
      return { ok: true, count: results.length, results }
    },

    requestFileDeletion(targetType, targetPath) {
      const type = String(targetType ?? '').trim()
      if (!['knowledge_note', 'word_export'].includes(type)) throw new Error('只支持删除知识库笔记（knowledge_note）或 Word 导出文件（word_export）')
      const pathText = String(targetPath ?? '').trim().replace(/\\/g, '/')
      if (pathText === '' || pathText.includes('..') || pathText.startsWith('/')) throw new Error('路径无效')
      let label = pathText
      if (type === 'knowledge_note') {
        if (!pathText.endsWith('.md')) throw new Error('只能删除知识库中的 .md 笔记')
        const { vaultPath, folder } = getVault()
        const read = readNote({ vaultPath, folder, relativePath: pathText })
        if (read.ok !== true) throw new Error(read.error ?? '笔记不存在')
        label = pathText
      } else {
        if (!pathText.endsWith('.docx')) throw new Error('只能删除 Word 导出文件（.docx）')
        const { vaultPath, folder } = getVault()
        if (!pathText.startsWith('Word导出/')) throw new Error('只能删除知识库 Word导出/ 目录下的文件')
        const target = join(vaultPath, folder, pathText)
        if (!existsSync(target) || !statSync(target).isFile()) throw new Error('Word 导出文件不存在')
        label = pathText
      }
      const token = `del-file-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      const now = Date.now()
      const configuredWait = process.env.MEETRECORD_FILE_DELETE_WAIT_MS
      const waitMs = configuredWait !== undefined ? Math.max(0, Number(configuredWait) || 0) : FILE_DELETE_WAIT_MS
      for (const [key, value] of pendingFileDeletions) {
        if (now - value.createdAt > FILE_DELETE_TTL_MS) pendingFileDeletions.delete(key)
      }
      pendingFileDeletions.set(token, { type, path: pathText, createdAt: now, availableAt: now + waitMs })
      return {
        ok: true,
        token,
        targetType: type,
        target: label,
        waitSeconds: Math.ceil(waitMs / 1000),
        message: '请先向用户说明将删除的文件，等用户明确回复确认后再调用 deletion_confirm；确认令牌 10 分钟内有效。',
      }
    },

    confirmFileDeletion(token) {
      const pending = pendingFileDeletions.get(String(token ?? ''))
      if (pending === undefined) return { ok: false, error: '删除请求无效或已过期，请重新发起并征得用户确认' }
      if (Date.now() - pending.createdAt > FILE_DELETE_TTL_MS) {
        pendingFileDeletions.delete(String(token ?? ''))
        return { ok: false, error: '删除请求已过期，请重新发起' }
      }
      const remaining = pending.availableAt - Date.now()
      if (remaining > 0) return { ok: false, error: `请先征得用户确认，约 ${Math.ceil(remaining / 1000)} 秒后再确认`, remainingSeconds: Math.ceil(remaining / 1000) }
      pendingFileDeletions.delete(String(token ?? ''))
      if (pending.type === 'knowledge_note') {
        this.knowledgeDelete(pending.path)
        return { ok: true, deleted: true, targetType: pending.type, target: pending.path }
      }
      const { vaultPath, folder } = getVault()
      const target = join(vaultPath, folder, pending.path)
      if (existsSync(target)) unlinkSync(target)
      return { ok: true, deleted: true, targetType: pending.type, target: pending.path }
    },

    knowledgeUpdate(relativePath, content) {
      const { vaultPath, folder } = getVault()
      if (vaultPath === '') throw new Error('尚未配置知识库')
      const result = updateNote({ vaultPath, folder, relativePath: String(relativePath ?? ''), content: String(content ?? '') })
      if (result.ok !== true) throw new Error(result.error ?? '更新笔记失败')
      return result
    },

    knowledgeDelete(relativePath) {
      const { vaultPath, folder } = getVault()
      if (vaultPath === '') throw new Error('尚未配置知识库')
      const pathText = String(relativePath ?? '')
      writeKnowledgeSnapshot()
      const result = deleteNote({ vaultPath, folder, relativePath: pathText })
      if (result.ok !== true) throw new Error(result.error ?? '删除笔记失败')
      if (result.deleted === true) {
        for (const meeting of store.meetings) {
          if (Array.isArray(meeting.knowledgePaths) && meeting.knowledgePaths.includes(pathText)) {
            meeting.knowledgePaths = meeting.knowledgePaths.filter(item => item !== pathText)
            touch(meeting)
          }
        }
        for (const branch of store.branches) {
          if (branch.knowledgePath === pathText) branch.knowledgePath = ''
        }
        persist()
      }
      return result
    },

    knowledgeSave(payload) {
      return saveKnowledgeNote(payload, 'panel')
    },

    // ---- tool-facing helpers ----
    toolTemplateList() {
      const templates = templatesOf(store)
      return {
        meetingTemplates: templates.filter(item => item.kind === 'meeting').map(item => ({
          templateId: item.id,
          name: item.name,
          meetingType: item.meetingType,
          description: item.description,
          topicCount: (item.topics ?? []).length,
          builtin: Boolean(item.builtin),
        })),
        procedureTemplates: templates.filter(item => item.kind === 'procedure').map(item => ({
          templateId: item.id,
          name: item.name,
          description: item.description,
          stepCount: (item.procedureSteps ?? []).length,
          builtin: Boolean(item.builtin),
        })),
      }
    },

    toolTemplateGet(templateId) {
      const template = findTemplate(store, String(templateId ?? ''))
      if (template === undefined) throw new Error('模板不存在：' + String(templateId ?? ''))
      return clone(template)
    },

    toolOrgInfo(branchId, verbose = false) {
      const branches = store.branches.map(branch => ({
        branchId: branch.id,
        name: branch.name,
        orgName: branch.orgName ?? '',
        ...(verbose === true ? { notes: branch.notes ?? '', memberCount: store.members.filter(member => member.branchId === branch.id && member.active !== false).length } : {}),
      }))
      const selected = typeof branchId === 'string' && branchId !== '' ? branchId : (store.settings.defaultBranchId || branches[0]?.branchId || '')
      const members = store.members
        .filter(member => member.active !== false && (selected === '' || member.branchId === selected))
        .map(member => ({
          memberId: member.id,
          name: member.name,
          position: member.position,
          ...(verbose === true ? { detail: member.detail ?? '', branchId: member.branchId } : {}),
        }))
      const configured = branches.length > 0 && members.length > 0
      const profile = profileView()
      const hasProfile = profile.level !== '' || profile.role !== '' || profile.purpose !== ''
      return {
        configured,
        needsSetup: !configured,
        branches,
        selectedBranchId: selected,
        members,
        ...(verbose === true && selected !== '' ? { summary: summarizeBranch(selected) } : {}),
        ...(hasProfile ? { profile, guidance: profileGuidance() } : {}),
        defaults: {
          templateId: store.settings.defaultTemplateId,
          recordLength: recordLengthInfo(store.settings.recordLength).key,
          recordLengthLabel: recordLengthInfo(store.settings.recordLength).label,
          vaultPath: expandHome(store.settings.vaultPath),
          allowWebSearch: store.settings.allowWebSearch,
          maxSearches: store.settings.maxSearches,
        },
      }
    },

    toolOrgSetup(input) {
      const branchName = String(input?.branchName ?? input?.name ?? '').trim()
      if (branchName === '') throw new Error('请先告诉我支部全称，例如：XX党支部')
      let branch = typeof input?.branchId === 'string' && input.branchId !== ''
        ? store.branches.find(item => item.id === input.branchId)
        : store.branches.find(item => item.name === branchName)
      let createdBranch = false
      if (branch === undefined) {
        branch = { id: newId('br'), name: branchName, orgName: String(input?.orgName ?? '').trim(), notes: String(input?.notes ?? '').trim(), createdAt: nowIso() }
        store.branches.push(branch)
        createdBranch = true
      } else {
        if (input?.orgName !== undefined) branch.orgName = String(input.orgName).trim()
        if (input?.notes !== undefined) branch.notes = String(input.notes).trim()
      }
      const addedMembers = []
      const updatedMembers = []
      const rawMembers = Array.isArray(input?.members) ? input.members.slice(0, 200) : []
      for (const item of rawMembers) {
        const name = String(typeof item === 'string' ? item : item?.name ?? '').trim()
        if (name === '') continue
        const position = String(item?.position ?? '').trim()
        const detail = String(item?.detail ?? '').trim()
        const existing = store.members.find(member => member.branchId === branch.id && member.name === name)
        if (existing !== undefined) {
          let changed = false
          if (position !== '' && existing.position !== position) {
            existing.position = position
            changed = true
          }
          if (detail !== '' && existing.detail !== detail) {
            existing.detail = detail
            changed = true
          }
          if (changed) updatedMembers.push(name)
          if (existing.active === false) existing.active = true
        } else {
          store.members.push({ id: newId('mb'), branchId: branch.id, name, position, detail, active: true, createdAt: nowIso() })
          addedMembers.push(name)
        }
      }
      const makeDefault = input?.makeDefault === undefined
        ? (store.settings.defaultBranchId === '' || createdBranch)
        : Boolean(input.makeDefault)
      if (makeDefault) store.settings.defaultBranchId = branch.id
      if (typeof input?.defaultTemplateId === 'string' && input.defaultTemplateId !== '') {
        const template = findTemplate(store, input.defaultTemplateId)
        if (template !== undefined && template.kind === 'meeting') store.settings.defaultTemplateId = template.id
      }
      if (input?.profile !== undefined) {
        try { saveProfile(input.profile) } catch { /* profile is optional */ }
      }
      let vaultPath = expandHome(store.settings.vaultPath)
      let usedDefaultVault = false
      const requestedVault = typeof input?.vaultPath === 'string' ? expandHome(input.vaultPath) : ''
      if (requestedVault !== '') {
        try {
          ensureVaultWritable(requestedVault)
          vaultPath = requestedVault
        } catch (error) {
          throw new Error('知识库目录不可写：' + requestedVault + '（' + (error instanceof Error ? error.message : String(error)) + '）')
        }
      } else if (vaultPath === '') {
        vaultPath = defaultVaultPath()
        try {
          ensureVaultWritable(vaultPath)
          usedDefaultVault = true
        } catch (error) {
          throw new Error('默认知识库目录不可写：' + vaultPath + '（' + (error instanceof Error ? error.message : String(error)) + '）')
        }
      }
      store.settings.vaultPath = vaultPath

      const recorderName = defaultRecorderFor(branch.id)
      if (recorderName !== '') {
        for (const meeting of store.meetings) {
          if (meeting.branchId === branch.id && String(meeting.recorder ?? '').trim() === '') meeting.recorder = recorderName
        }
      }
      persist()
      const members = store.members
        .filter(member => member.branchId === branch.id && member.active !== false)
        .map(member => ({ memberId: member.id, name: member.name, position: member.position, detail: member.detail ?? '' }))
      let branchKnowledgePath = ''
      try {
        branchKnowledgePath = syncBranchKnowledge(branch.id).relativePath
      } catch {
        branchKnowledgePath = ''
      }
      let seedKnowledge = null
      try {
        seedKnowledge = this.installSeedKnowledge()
      } catch {
        seedKnowledge = null
      }
      return {
        ok: true,
        createdBranch,
        branchKnowledgePath,
        seedKnowledge,
        branch: { branchId: branch.id, name: branch.name, orgName: branch.orgName ?? '', notes: branch.notes ?? '' },
        addedMembers,
        updatedMembers,
        members,
        summary: summarizeBranch(branch.id),
        vault: { path: vaultPath, usedDefault: usedDefaultVault },
        message: `已保存：${branch.name}，共 ${members.length} 人。以后开会不用再提供名单。`,
        defaults: { branchId: store.settings.defaultBranchId, templateId: store.settings.defaultTemplateId },
      }
    },

    toolDraftSave(input) {
      const result = this.draftSave(input)
      return {
        ok: true,
        meetingId: result.id,
        title: result.title,
        status: result.status,
        attendees: Object.keys(result.attendees ?? {}).length,
        topics: (result.topics ?? []).map(topic => topic.label),
      }
    },

    toolRecordSave(input) {
      const meeting = resolveToolMeeting(input)
      return this.recordSave(meeting.id, {
        markdown: input?.markdown,
        sources: input?.sources,
        final: Boolean(input?.final),
        sessionId: input?.sessionId,
      })
    },

    toolRecordGet(input) {
      const meeting = resolveToolMeeting(input)
      const includeMarkdown = input?.includeMarkdown === true
      return {
        ...meetingSummary(meeting),
        location: meeting.location,
        host: meeting.host,
        recorder: meeting.recorder,
        expectedCount: meeting.expectedCount,
        actualCount: meeting.actualCount,
        attendees: Object.entries(meeting.attendees ?? {}).map(([memberId, status]) => ({ memberId, name: store.members.find(member => member.id === memberId)?.name ?? memberId, status })),
        procedureTemplateIds: meeting.procedureTemplateIds,
        topics: meeting.topics,
        sources: meeting.sources,
        ...(includeMarkdown ? { recordMarkdown: meeting.recordMarkdown } : {}),
        knowledgePaths: meeting.knowledgePaths,
      }
    },

    toolMeetingList(input) {
      const limit = Math.max(1, Math.min(50, Number(input?.limit) || 10))
      const status = typeof input?.status === 'string' ? input.status : ''
      return {
        meetings: [...store.meetings]
          .filter(meeting => status === '' || meeting.status === status)
          .sort((a, b) => String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')))
          .slice(0, limit)
          .map(meetingSummary),
      }
    },

    toolKnowledgeSave(input) {
      const result = saveKnowledgeNote(input, 'model')
      const kind = ['reference', 'branch', 'material', 'daily'].includes(input?.kind) ? input.kind : 'record'
      return { ok: true, ...result, kind }
    },

    toolKnowledgeSearch(input) {
      const result = this.knowledgeSearch(input?.query, input?.limit)
      if (result.ok !== true) throw new Error(result.error ?? '检索失败')
      return { ok: true, matches: result.matches }
    },

    toolKnowledgeRead(input) {
      const result = this.knowledgeRead(input?.path)
      if (result.ok !== true) throw new Error(result.error ?? '读取失败')
      return { ok: true, path: result.relativePath, content: result.content }
    },

    toolFilePreprocess(input) {
      const raw = String(input?.path ?? '').trim()
      if (raw === '') throw new Error('path 不能为空')
      const path = expandHome(raw)
      if (!existsSync(path) || !statSync(path).isFile()) throw new Error('文件不存在：' + path)
      const ext = (extname(path).replace('.', '') || '').toLowerCase()
      if (['pdf', 'png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
        const buffer = readFileSync(path)
        if (ext === 'pdf') {
          const pages = Math.max(1, (buffer.toString('latin1').match(/\/Type\s*\/Page\b/g) ?? []).length)
          return {
            ok: true, path, fileName: basename(path).replace(/\.[^.]+$/, ''), ext, chars: 0, truncated: false,
            title: basename(path).replace(/\.[^.]+$/, ''), date: '', docNumber: '', issuer: '',
            category: 'pdf', suggestedKind: '', suggestedAction: '扫描版/PDF 先让用户三选一，不要自动识图',
            needsOcr: true, pages, pageLimit: MAX_VISION_PAGES,
            options: [
              { id: 'text', label: '提供可复制文字的 Word/文本/PDF', recommended: true },
              { id: 'vision', label: '发 1–3 页截图逐页识图', pageLimit: MAX_VISION_PAGES, tokenHint: '约 1k–3k token/页，只提取标题/日期/文号/要点' },
              { id: 'save_only', label: '仅登记文件信息，稍后处理' },
            ],
            message: 'PDF 无法直接提取文字。请先给用户三选一：提供文字版（首选）/发 1–3 页截图识图/仅登记；不要自动识图，不要调用 LibreOffice。',
          }
        }
        return {
          ok: true, path, fileName: basename(path).replace(/\.[^.]+$/, ''), ext, chars: 0, truncated: false,
          title: basename(path).replace(/\.[^.]+$/, ''), date: '', docNumber: '', issuer: '',
          category: 'image', suggestedKind: '', suggestedAction: '图片需用户确认后识图，只处理必要页面',
          needsVision: true, pages: 1, pageLimit: MAX_VISION_PAGES,
          options: [
            { id: 'vision', label: '识图提取关键信息', pageLimit: MAX_VISION_PAGES, tokenHint: '约 1k–3k token/页' },
            { id: 'text', label: '改发文字版', recommended: true },
            { id: 'save_only', label: '仅登记文件信息，稍后处理' },
          ],
          message: '图片需要模型识图。先让用户选择：改发文字版（首选）/识图必要页面/仅登记；数字、姓名、文号需人工核对。',
        }
      }
      if (!['docx', 'txt', 'md', 'markdown'].includes(ext)) throw new Error('只支持 .docx/.txt/.md/.pdf 及常见图片；其他格式请先转换')
      const text = ext === 'docx' ? docxToText(readFileSync(path)) : readFileSync(path, 'utf8')
      const chars = [...text]
      const preview = chars.slice(0, 8000).join('')
      const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
      const fileName = basename(path).replace(/\.[^.]+$/, '')
      let title = fileName
      const firstLine = lines.find(line => !/^[-#*>|]/.test(line) && line.length >= 2)
      if (firstLine !== undefined && firstLine.length <= 80) title = firstLine
      const dateMatch = text.match(/(20\d{2})\s*[年./-]\s*(\d{1,2})\s*[月./-]\s*(\d{1,2})/)
      const date = dateMatch === null ? '' : `${dateMatch[1]}-${String(dateMatch[2]).padStart(2, '0')}-${String(dateMatch[3]).padStart(2, '0')}`
      const docNumberMatch = text.match(/[\u4e00-\u9fa5]{2,12}〔20\d{2}〕\d+号|\[20\d{2}\]\d+号/)
      const issuerMatch = text.match(/(中共[\u4e00-\u9fa5]{2,30}(?:委员会|党委|支部|党组|办公室))/)
      const head = lines.slice(0, 5).join(' ')
      let category = 'unknown'
      let suggestedKind = 'material'
      let suggestedAction = '询问用户是否存入知识库'
      if (/会议记录|会议纪要|议程|主持词|签到表|会议材料/.test(head)) {
        category = 'meeting_material'
        suggestedKind = ''
        suggestedAction = '询问是否按此文件生成会议记录，或仅存入知识库'
      } else if (/通知|决定|意见|办法|条例|规定|政策|文件|批复|函/.test(head)) {
        category = 'policy_notice'
        suggestedKind = 'reference'
        suggestedAction = '建议存入“检索资料”，问用户确认'
      } else if (/总结|报告|方案|计划|汇报|简报/.test(head)) {
        category = 'work_material'
        suggestedKind = 'material'
        suggestedAction = '建议存入“支部材料”，问用户确认'
      } else if (/台账|日志|记录表|工作记录/.test(head)) {
        category = 'daily_record'
        suggestedKind = 'daily'
        suggestedAction = '建议存入“日常工作”，问用户确认'
      }
      return {
        ok: true, path, fileName, ext, chars: chars.length, truncated: chars.length > 8000,
        title, date, docNumber: docNumberMatch === null ? '' : docNumberMatch[0], issuer: issuerMatch === null ? '' : issuerMatch[1],
        category, suggestedKind, suggestedAction, textPreview: preview,
      }
    },

    toolDocxRead(input) {
      const raw = String(input?.path ?? '').trim()
      if (raw === '') throw new Error('path 不能为空')
      const path = expandHome(raw)
      if (!existsSync(path) || !statSync(path).isFile()) throw new Error('文件不存在：' + path)
      const ext = (extname(path).replace('.', '') || '').toLowerCase()
      let text = ''
      if (ext === 'docx') text = docxToText(readFileSync(path))
      else if (ext === 'txt' || ext === 'md' || ext === 'markdown') text = readFileSync(path, 'utf8')
      else throw new Error('只支持 .docx/.txt/.md 文件')
      const chars = [...text]
      const truncated = chars.length > MAX_DOCX_READ_CHARS
      return { ok: true, path, chars: chars.length, truncated, text: truncated ? chars.slice(0, MAX_DOCX_READ_CHARS).join('') : text }
    },
  }
}
