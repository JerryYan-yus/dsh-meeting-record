/**
 * DOCX export for one meeting record (v3: "record book" layout).
 *
 * The record body is one complete conversational Markdown document:
 *
 *   # <支部><会议类型>会议记录
 *   ## 一、会议基本信息
 *   | 项目 | 内容 |
 *   | --- | --- |
 *   | 会议时间： | ... |
 *   ## 二、参会人员（参会、未参会）
 *   | 项目 | 内容 |
 *   ...
 *   ## 三、第一议题：...
 *   议题要点：
 *   - ...
 *   会议记录：
 *   张三（支部书记）： ...
 *
 * The exporter turns the `#` heading into the document title (it is not
 * repeated in the body), renders every Markdown pipe table as a real Word
 * two-column table (label column ≈22%–24%, value column the rest), keeps
 * conversational speech paragraphs flush (no first-line indent) with the
 * speaker name bold, and leaves the A4/GB-T page setup, Chinese `w:eastAsia`
 * fonts, footer `— PAGE —` field, sources appendix and dependency-free ZIP
 * packaging intact.
 */

import { zip } from './zip.js'
import { SEED_TEMPLATES } from './template-seed.js'

const A4_WIDTH_TWIPS = 11906
const A4_HEIGHT_TWIPS = 16838

// A4 with the same margins as the previous exporter: 3.7cm top, 2.6cm right,
// 3.5cm bottom, 2.8cm left.
const PAGE_MARGIN = { top: 2098, right: 1474, bottom: 1984, left: 1587 }
const CONTENT_WIDTH_TWIPS = A4_WIDTH_TWIPS - PAGE_MARGIN.left - PAGE_MARGIN.right

const BODY_FONT = '仿宋_GB2312'
const HEADING_FONT = '黑体'
const TITLE_FONT = '方正小标宋简体'

/** Long attendee lists break after this many names (legacy section records). */
const NAMES_PER_LINE = 40

// Two-column info table. The label column must fit “未参会人员：” — six
// full-width characters at 16pt are 1920 twips wide — so the nominal 22% of
// the text width is just too narrow once cell padding is added; 24/76 is the
// closest comfortable split.
const TABLE_LABEL_RATIO = 0.24
const TABLE_BORDER_SIZE = 4
const TABLE_CELL_MARGIN = 57
const TABLE_LINE_TWIPS = 360

/** `姓名（职务）： 发言…` — one conversational speech paragraph. */
const DIALOGUE_PATTERN = /^[^：\n]{1,20}（[^）\n]+）：\s/
const DIALOGUE_SPLIT_PATTERN = /^([^：\n]{1,20}（[^）\n]+）)：(.*)$/

const escapeXml = value => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')

const isBlank = value => value === undefined || value === null || String(value).trim() === ''

const plain = value => String(value ?? '').trim()

// ---------------------------------------------------------------------------
// WordprocessingML primitives
// ---------------------------------------------------------------------------

/** Run properties: Chinese font through `w:eastAsia`, size in half-points. */
function runProperties({ font = BODY_FONT, size = 16, bold = false } = {}) {
  return '<w:rPr>'
    + `<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="${font}"/>`
    + (bold ? '<w:b/>' : '')
    + `<w:sz w:val="${Math.round(size * 2)}"/><w:szCs w:val="${Math.round(size * 2)}"/>`
    + '</w:rPr>'
}

/** One or more runs for `text`; tabs become `<w:tab/>` so Word keeps columns. */
function run(text, options) {
  const value = String(text ?? '')
  if (value === '') return ''
  const properties = runProperties(options)
  const pieces = value.split('\t')
  let xml = ''
  pieces.forEach((piece, index) => {
    if (index > 0) xml += `<w:r>${properties}<w:tab/></w:r>`
    if (piece !== '') xml += `<w:r>${properties}<w:t xml:space="preserve">${escapeXml(piece)}</w:t></w:r>`
  })
  return xml
}

/** Paragraph properties shared by every paragraph this exporter emits. */
function paragraphProperties({
  align = 'both',
  firstLine = 640,
  line = 560,
  before = 0,
  after = 0,
  left = 0,
  hanging = 0,
  keepNext = false,
  zeroIndent = false,
} = {}) {
  const indentParts = []
  if (firstLine > 0) indentParts.push(`w:firstLine="${firstLine}"`)
  if (left > 0) indentParts.push(`w:left="${left}"`)
  if (hanging > 0) indentParts.push(`w:hanging="${hanging}"`)
  let indent = ''
  if (indentParts.length > 0) indent = `<w:ind ${indentParts.join(' ')}/>`
  else if (zeroIndent) indent = '<w:ind w:firstLine="0"/>'
  return '<w:pPr>'
    + (keepNext ? '<w:keepNext/>' : '')
    + `<w:spacing w:before="${before}" w:after="${after}" w:line="${line}" w:lineRule="exact"/>`
    + indent
    + (align ? `<w:jc w:val="${align}"/>` : '')
    + '</w:pPr>'
}

/** A paragraph from explicit runs, e.g. a bold speaker name + speech body. */
function paragraphRuns(runs, options = {}) {
  const {
    font = BODY_FONT,
    size = 16,
    bold = false,
    ...layout
  } = options
  const content = runs.map(item => {
    if (item === null || item === undefined) return ''
    if (typeof item === 'string') return run(item, { font, size, bold })
    return run(item.text, {
      font: item.font ?? font,
      size: item.size ?? size,
      bold: item.bold ?? bold,
    })
  }).join('')
  return `<w:p>${paragraphProperties(layout)}${content}</w:p>`
}

/** A paragraph from one plain text string. */
function paragraph(text, options = {}) {
  return paragraphRuns([String(text ?? '')], options)
}

/** Blank Markdown line: an empty paragraph with a tighter 280-twip line. */
function blankParagraph() {
  return '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="280" w:lineRule="exact"/></w:pPr></w:p>'
}

/**
 * Remove inline Markdown markers while keeping the human text:
 * `**bold**` -> bold, `` `code` `` -> code, `[text](url)` -> text.
 */
function inlineText(value) {
  return String(value ?? '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]*)\]\(([^)]*)\)/g, '$1')
    .trim()
}

// ---------------------------------------------------------------------------
// Markdown block parsing
// ---------------------------------------------------------------------------

const HEADING_PATTERN = /^(#{1,4})\s+(.+)$/
const BULLET_PATTERN = /^[-*]\s+(.+)$/
const NUMBERED_PATTERN = /^(\d+)[.、)]\s+(.+)$/
const SEPARATOR_CELL_PATTERN = /^:?-+:?$/
const HORIZONTAL_RULE_PATTERN = /^(?:-{3,}|\*{3,}|_{3,})$/
const LABEL_PATTERN = /^(议题要点|会议记录)：(\s*)(.*)$/

/**
 * Split the leading `# <title>` heading off a record.
 * @param {string} markdown
 * @returns {{title: string, lines: string[]}} title (may be '') and body lines.
 */
function splitTitle(markdown) {
  const lines = String(markdown ?? '').replace(/\r\n?/g, '\n').split('\n')
  let start = 0
  while (start < lines.length && lines[start].trim() === '') start += 1
  let title = ''
  if (start < lines.length) {
    const heading = /^#\s+(.+)$/.exec(lines[start].trim())
    if (heading !== null) {
      title = inlineText(heading[1])
      start += 1
    }
  }
  while (start < lines.length && lines[start].trim() === '') start += 1
  let end = lines.length
  while (end > start && lines[end - 1].trim() === '') end -= 1
  return { title, lines: lines.slice(start, end) }
}

const isTableLine = line => String(line ?? '').trim().startsWith('|')

function splitTableCells(line) {
  let value = String(line ?? '').trim()
  if (value.startsWith('|')) value = value.slice(1)
  if (value.endsWith('|')) value = value.slice(0, -1)
  return value.split('|').map(cell => cell.trim())
}

const isSeparatorRow = cells => cells.length > 0 && cells.every(cell => SEPARATOR_CELL_PATTERN.test(cell))

/** Collect a consecutive Markdown pipe-table block (separator rows dropped). */
function collectTableRows(lines, start) {
  const rows = []
  let index = start
  while (index < lines.length && isTableLine(lines[index])) {
    const cells = splitTableCells(lines[index])
    if (!isSeparatorRow(cells)) rows.push(cells)
    index += 1
  }
  return { rows, next: index }
}

/** Column widths: label/value split for two-column tables, even otherwise. */
function tableColumnWidths(columns) {
  if (columns === 2) {
    const label = Math.round(CONTENT_WIDTH_TWIPS * TABLE_LABEL_RATIO)
    return [label, CONTENT_WIDTH_TWIPS - label]
  }
  const base = Math.floor(CONTENT_WIDTH_TWIPS / columns)
  const widths = new Array(columns).fill(base)
  widths[columns - 1] += CONTENT_WIDTH_TWIPS - base * columns
  return widths
}

function tableCellXml(text, width, { header = false } = {}) {
  return '<w:tc>'
    + '<w:tcPr>'
    + `<w:tcW w:w="${width}" w:type="dxa"/>`
    + '<w:vAlign w:val="center"/>'
    + '</w:tcPr>'
    + paragraphRuns(text === '' ? [] : [{ text }], {
      firstLine: 0,
      zeroIndent: true,
      line: TABLE_LINE_TWIPS,
      align: header ? 'center' : 'left',
    })
    + '</w:tc>'
}

/**
 * Render a Markdown pipe table as a real Word table: single-line borders,
 * 仿宋_GB2312 16pt cells without first-line indent, vertically centred text and
 * the first row kept as the header row (`项目 / 内容`).
 * @param {string[][]} rows
 * @returns {string} `w:tbl` XML
 */
function renderWordTable(rows) {
  const columns = Math.max(1, ...rows.map(row => row.length))
  const widths = tableColumnWidths(columns)
  const normalized = rows.map(row => Array.from({ length: columns }, (_, index) => row[index] ?? ''))
  const grid = widths.map(width => `<w:gridCol w:w="${width}"/>`).join('')
  const bodyRows = normalized.map((row, rowIndex) => {
    const header = rowIndex === 0
    const cells = row.map((cell, cellIndex) => tableCellXml(inlineText(cell), widths[cellIndex], { header })).join('')
    const rowProperties = header ? '<w:trPr><w:tblHeader/></w:trPr>' : ''
    return `<w:tr>${rowProperties}${cells}</w:tr>`
  }).join('')
  const borders = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']
    .map(side => `<w:${side} w:val="single" w:sz="${TABLE_BORDER_SIZE}" w:space="0" w:color="auto"/>`)
    .join('')
  return '<w:tbl>'
    + '<w:tblPr>'
    + `<w:tblW w:w="${CONTENT_WIDTH_TWIPS}" w:type="dxa"/>`
    + '<w:jc w:val="center"/>'
    + `<w:tblBorders>${borders}</w:tblBorders>`
    + '<w:tblLayout w:type="fixed"/>'
    + '<w:tblCellMar>'
    + `<w:top w:w="0" w:type="dxa"/><w:left w:w="${TABLE_CELL_MARGIN}" w:type="dxa"/>`
    + `<w:bottom w:w="0" w:type="dxa"/><w:right w:w="${TABLE_CELL_MARGIN}" w:type="dxa"/>`
    + '</w:tblCellMar>'
    + '</w:tblPr>'
    + `<w:tblGrid>${grid}</w:tblGrid>`
    + bodyRows
    + '</w:tbl>'
}

// ---------------------------------------------------------------------------
// Markdown body rendering
// ---------------------------------------------------------------------------

/** Render speech line `姓名（职务）： 发言…` flush left with a bold name. */
function dialogueParagraph(value) {
  const split = DIALOGUE_SPLIT_PATTERN.exec(value)
  if (split === null) return paragraph(inlineText(value))
  const name = split[1]
  const rest = split[2]
  const whitespace = /^\s*/.exec(rest)[0]
  const speech = inlineText(rest.slice(whitespace.length))
  return paragraphRuns([
    { text: name, bold: true },
    { text: `：${whitespace}${speech}` },
  ], { firstLine: 0, zeroIndent: true, line: 560 })
}

/** Render one Markdown body (tables, headings, lists, speech, plain text). */
function renderMarkdownBody(lines) {
  const chunks = []
  let lastWasTable = false
  for (let index = 0; index < lines.length;) {
    const trimmed = String(lines[index] ?? '').trim()
    if (trimmed === '') {
      chunks.push(blankParagraph())
      lastWasTable = false
      index += 1
      continue
    }

    if (isTableLine(trimmed)) {
      const table = collectTableRows(lines, index)
      index = table.next
      if (table.rows.length > 0) {
        chunks.push(renderWordTable(table.rows))
        lastWasTable = true
      }
      continue
    }
    lastWasTable = false

    const heading = HEADING_PATTERN.exec(trimmed)
    if (heading !== null) {
      const level = heading[1].length
      chunks.push(paragraph(inlineText(heading[2]), {
        font: HEADING_FONT,
        size: level <= 2 ? 16 : 15,
        bold: true,
        firstLine: 0,
        before: 240,
        after: 120,
        line: 560,
        keepNext: true,
      }))
      index += 1
      continue
    }

    if (HORIZONTAL_RULE_PATTERN.test(trimmed)) {
      index += 1
      continue
    }

    // Speech paragraphs are checked before labels/plain paragraphs: they start
    // with a name and a position and must stay flush left.
    if (DIALOGUE_PATTERN.test(trimmed)) {
      chunks.push(dialogueParagraph(trimmed))
      index += 1
      continue
    }

    const labeled = LABEL_PATTERN.exec(trimmed)
    if (labeled !== null) {
      chunks.push(paragraphRuns([
        { text: `${labeled[1]}：`, bold: true },
        { text: `${labeled[2]}${inlineText(labeled[3])}` },
      ], { firstLine: 640 }))
      index += 1
      continue
    }

    const bullet = BULLET_PATTERN.exec(trimmed)
    if (bullet !== null) {
      chunks.push(paragraph(`• ${inlineText(bullet[1])}`, {
        firstLine: 0,
        left: 640,
        hanging: 320,
        line: 560,
      }))
      index += 1
      continue
    }

    const numbered = NUMBERED_PATTERN.exec(trimmed)
    if (numbered !== null) {
      chunks.push(paragraph(`${numbered[1]}. ${inlineText(numbered[2])}`, {
        firstLine: 0,
        left: 640,
        hanging: 320,
        line: 560,
      }))
      index += 1
      continue
    }

    chunks.push(paragraph(inlineText(trimmed), { firstLine: 640, line: 560 }))
    index += 1
  }
  // Word wants a paragraph after a table that ends the body.
  if (lastWasTable) chunks.push(blankParagraph())
  return chunks.join('')
}

// ---------------------------------------------------------------------------
// Legacy section-based records
// ---------------------------------------------------------------------------

/** Templates available for the "采用流程" line (store first, seed fallback). */
function allTemplates(store) {
  const templates = []
  for (const list of [store?.templates, store?.customTemplates, SEED_TEMPLATES]) {
    if (!Array.isArray(list)) continue
    for (const item of list) {
      if (item && typeof item === 'object') templates.push(item)
    }
  }
  return templates
}

/**
 * Legacy `meeting.sections` order: an explicit `meeting.sectionList` wins,
 * otherwise insertion order of the `sections` object. Each entry carries the
 * section title (section.title, list title, else id) and its Markdown body.
 */
function legacySections(record) {
  const sections = record.sections && typeof record.sections === 'object' ? record.sections : {}
  const sectionList = Array.isArray(record.sectionList) ? record.sectionList : []
  const ordered = []
  const seen = new Set()

  const add = (id, title, content) => {
    const key = plain(id)
    if (key === '' || seen.has(key)) return
    seen.add(key)
    const section = sections[key]
    ordered.push({
      id: key,
      title: plain(title) !== '' ? plain(title) : (plain(section?.title) !== '' ? plain(section.title) : key),
      content: content !== undefined && content !== null ? String(content) : '',
    })
  }

  for (const entry of sectionList) {
    if (typeof entry === 'string') {
      add(entry, sections[entry]?.title, sections[entry]?.markdown ?? sections[entry]?.content)
      continue
    }
    if (entry === null || typeof entry !== 'object') continue
    const id = entry.id ?? entry.sectionId ?? entry.key
    const section = id !== undefined ? sections[id] : undefined
    add(
      id,
      entry.title ?? entry.name ?? section?.title,
      entry.markdown ?? entry.content ?? section?.markdown ?? section?.content,
    )
  }
  for (const [id, section] of Object.entries(sections)) {
    if (seen.has(id)) continue
    add(id, section?.title, section?.markdown ?? section?.content)
  }
  return ordered
}

/** Render legacy per-section content (only non-empty sections keep a heading). */
function renderLegacySections(record) {
  const chunks = []
  for (const section of legacySections(record)) {
    if (String(section.content ?? '').trim() === '') continue
    chunks.push(paragraph(section.title, {
      font: HEADING_FONT,
      size: 16,
      bold: true,
      firstLine: 0,
      before: 240,
      after: 120,
      line: 560,
      keepNext: true,
    }))
    chunks.push(renderMarkdownBody(String(section.content).replace(/\r\n?/g, '\n').split('\n')))
  }
  return chunks.join('')
}

/** Append one or more "label：name、name" lines, continuing every 40 names. */
function appendNameLines(body, label, names) {
  if (names.length === 0) return
  for (let start = 0; start < names.length; start += NAMES_PER_LINE) {
    const chunk = names.slice(start, start + NAMES_PER_LINE)
    const first = start === 0
    // Continuation lines align under the names (label width + full-width colon).
    body.push(paragraph(first ? `${label}：${chunk.join('、')}` : chunk.join('、'), first
      ? { firstLine: 0 }
      : { firstLine: 0, left: (label.length + 1) * 320 }))
  }
}

/** Legacy records: basic info / attendance / procedure lines as body text. */
function appendLegacyMeta(body, store, record) {
  const when = [record.meetingDate, record.meetingTime]
    .map(value => plain(value))
    .filter(value => value !== '')
    .join(' ')
  if (when !== '') body.push(paragraph(`会议时间：${when}`, { firstLine: 0 }))
  if (plain(record.location) !== '') body.push(paragraph(`会议地点：${plain(record.location)}`, { firstLine: 0 }))
  if (plain(record.host) !== '') body.push(paragraph(`主持人：${plain(record.host)}`, { firstLine: 0 }))
  if (plain(record.recorder) !== '') body.push(paragraph(`记录人：${plain(record.recorder)}`, { firstLine: 0 }))

  const counts = []
  if (!isBlank(record.expectedCount)) counts.push(`应到人数：${plain(record.expectedCount)} 人`)
  if (!isBlank(record.actualCount)) counts.push(`实到人数：${plain(record.actualCount)} 人`)
  if (counts.length > 0) body.push(paragraph(counts.join('　'), { firstLine: 0 }))

  const attendees = record.attendees && typeof record.attendees === 'object' ? record.attendees : {}
  const members = Array.isArray(store?.members) ? store.members : []
  const nameOf = id => {
    const member = members.find(item => item && item.id === id)
    return plain(member?.name)
  }
  const namesWithStatus = status => Object.entries(attendees)
    .filter(([, value]) => value === status)
    .map(([id]) => nameOf(id))
    .filter(name => name !== '')
  appendNameLines(body, '出席人员', namesWithStatus('present'))
  appendNameLines(body, '请假人员', namesWithStatus('leave'))
  appendNameLines(body, '缺席人员', namesWithStatus('absent'))

  const templateIds = Array.isArray(record.procedureTemplateIds) ? record.procedureTemplateIds : []
  if (templateIds.length > 0) {
    const templates = allTemplates(store)
    const names = []
    const seenNames = new Set()
    for (const id of templateIds) {
      if (typeof id !== 'string' || id.trim() === '') continue
      const template = templates.find(item => item.id === id)
      const name = plain(template?.name) !== '' ? plain(template.name) : id
      if (seenNames.has(name)) continue
      seenNames.add(name)
      names.push(name)
    }
    if (names.length > 0) body.push(paragraph(`采用流程：${names.join('、')}`, { firstLine: 0 }))
  }
}

// ---------------------------------------------------------------------------
// Package assembly
// ---------------------------------------------------------------------------

function titleParagraph(title) {
  return paragraph(title, {
    font: TITLE_FONT,
    size: 22,
    align: 'center',
    firstLine: 0,
    line: 640,
    after: 240,
  })
}

/** Appendix: retrieved external sources, deduplicated by URL. */
function appendSources(body, record) {
  const sources = Array.isArray(record.sources) ? record.sources : []
  const uniqueSources = []
  const seenUrls = new Set()
  for (const source of sources) {
    if (source === null || typeof source !== 'object') continue
    const url = plain(source.url)
    if (url !== '') {
      if (seenUrls.has(url)) continue
      seenUrls.add(url)
    }
    const item = { title: plain(source.title), url, publishedAt: plain(source.publishedAt) }
    if (item.title === '' && item.url === '' && item.publishedAt === '') continue
    uniqueSources.push(item)
  }
  if (uniqueSources.length === 0) return
  body.push(paragraph('附：外部检索来源（仅供核对）', {
    font: HEADING_FONT,
    size: 15,
    bold: true,
    firstLine: 0,
    before: 320,
    after: 120,
    line: 560,
    keepNext: true,
  }))
  for (const source of uniqueSources) {
    const bits = [source.title, source.url, source.publishedAt].filter(bit => bit !== '')
    body.push(paragraph(`• ${bits.join('　')}`, {
      size: 14,
      firstLine: 0,
      left: 640,
      hanging: 320,
    }))
  }
}

/**
 * Build the complete DOCX package for one meeting.
 * @param {object} store plugin store (branches, members, templates).
 * @param {object} meeting meeting record (`recordMarkdown` body plus metadata).
 * @returns {Buffer} docx bytes.
 */
export function buildMeetingDocx(store, meeting) {
  const record = meeting ?? {}
  const branches = Array.isArray(store?.branches) ? store.branches : []
  const branch = branches.find(item => item && item.id === record.branchId)
  const branchName = plain(branch?.name) !== '' ? plain(branch.name) : plain(record.branchName)
  const meetingType = plain(record.meetingType)
  const fallbackTitle = `${branchName}${meetingType}会议记录`

  const body = []
  const markdown = typeof record.recordMarkdown === 'string' ? record.recordMarkdown : ''
  if (markdown.trim() !== '') {
    // New conversational record: the `#` heading is the document title and is
    // not repeated in the body; pipe tables become real Word tables.
    const parsed = splitTitle(markdown)
    const title = parsed.title !== '' ? parsed.title : (plain(record.title) !== '' ? plain(record.title) : fallbackTitle)
    body.push(titleParagraph(title))
    // Old-style Markdown (no two-column info table) keeps the v2 text-line
    // metadata so older records still export the meeting fields and the
    // adopted procedure. The agreed record structure always carries 项目/内容
    // tables, in which case those lines would be duplicate information.
    const hasInfoTable = parsed.lines.some(line => isTableLine(line) && splitTableCells(line).length === 2)
    if (!hasInfoTable) appendLegacyMeta(body, store, record)
    body.push(renderMarkdownBody(parsed.lines))
  } else {
    // Legacy section-based record keeps the previous text-line basic info.
    const title = plain(record.title) !== '' ? plain(record.title) : fallbackTitle
    body.push(titleParagraph(title))
    appendLegacyMeta(body, store, record)
    if (record.sections && typeof record.sections === 'object') body.push(renderLegacySections(record))
  }

  appendSources(body, record)

  const footerXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
    + '<w:p><w:pPr><w:spacing w:before="0" w:after="0"/><w:jc w:val="center"/></w:pPr>'
    + `<w:r>${runProperties({ size: 14 })}<w:t xml:space="preserve">— </w:t></w:r>`
    + `<w:fldSimple w:instr=" PAGE "><w:r>${runProperties({ size: 14 })}<w:t>1</w:t></w:r></w:fldSimple>`
    + `<w:r>${runProperties({ size: 14 })}<w:t xml:space="preserve"> —</w:t></w:r>`
    + '</w:p></w:ftr>'

  const documentXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'
    + ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
    + '<w:body>'
    + body.join('')
    + '<w:sectPr>'
    + '<w:footerReference w:type="default" r:id="rId1"/>'
    + `<w:pgSz w:w="${A4_WIDTH_TWIPS}" w:h="${A4_HEIGHT_TWIPS}"/>`
    + `<w:pgMar w:top="${PAGE_MARGIN.top}" w:right="${PAGE_MARGIN.right}" w:bottom="${PAGE_MARGIN.bottom}" w:left="${PAGE_MARGIN.left}" w:header="851" w:footer="992" w:gutter="0"/>`
    + '<w:cols w:space="425"/><w:docGrid w:type="lines" w:linePitch="312"/>'
    + '</w:sectPr>'
    + '</w:body></w:document>'

  const contentTypesXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    + '<Default Extension="xml" ContentType="application/xml"/>'
    + '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
    + '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>'
    + '</Types>'

  const rootRelsXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
    + '</Relationships>'

  const documentRelsXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>'
    + '</Relationships>'

  return zip([
    { name: '[Content_Types].xml', data: contentTypesXml },
    { name: '_rels/.rels', data: rootRelsXml },
    { name: 'word/document.xml', data: documentXml },
    { name: 'word/_rels/document.xml.rels', data: documentRelsXml },
    { name: 'word/footer1.xml', data: footerXml },
  ])
}
