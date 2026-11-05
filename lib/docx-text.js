/**
 * DOCX text extraction for uploaded meeting materials (no npm dependency).
 *
 * Word text lives in `word/document.xml`; paragraph, break and tab elements
 * carry the line structure. Good enough for original notes and study materials;
 * tables come out as tab-joined cells and images are ignored.
 */
import { unzip } from './zip.js'

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }

function decodeEntities(text) {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_m, dec) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replace(/&(amp|lt|gt|quot|apos);/g, (_m, name) => ENTITIES[name])
}

/**
 * Extract readable text from a .docx buffer.
 * @param {Buffer} buffer
 * @returns {string}
 */
export function docxToText(buffer) {
  const files = unzip(buffer)
  const document = files.get('word/document.xml')
  if (document === undefined) throw new Error('不是有效的 Word 文档：缺少 word/document.xml')
  let xml = document.toString('utf8')
  xml = xml
    .replace(/<w:tab\/>/g, '\t')
    .replace(/<w:br[^>]*\/>/g, '\n')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<\/w:tr>/g, '\n')
    .replace(/<\/w:tc>/g, '\t')
  const text = decodeEntities(xml.replace(/<[^>]+>/g, ''))
  return text
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Visual character count that treats CJK and Latin fairly (used for limits). */
export function charCount(text) {
  return [...text].length
}
