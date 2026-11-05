/**
 * HTTP plumbing between the plugin panel and its Host half.
 *
 * The panel is served by DSH itself (browser or the desktop shell's IPC
 * bridge), so an HTTP route must refuse requests that did not come from this
 * machine's own UI: loopback socket + loopback Host header + a browser
 * same-origin marker (the desktop shell forwards marker-less requests but keeps
 * its `dsh-auth-*` cookie). This mirrors the fence shipped by other plugin
 * families instead of inventing a weaker one.
 */
import { writeJson as writeJsonResponse } from './response.js'

const BROWSER_AUTH_COOKIE_PREFIX = 'dsh-auth-'

function isIPv4Loopback(value) {
  const parts = String(value).split('.')
  return parts.length === 4 && parts[0] === '127' && parts.every(part => /^\d{1,3}$/.test(part) && Number(part) <= 255)
}

export function isLoopbackAddress(address) {
  if (address === undefined) return false
  const normalized = String(address).toLowerCase()
  if (normalized === '::1') return true
  if (normalized.startsWith('::ffff:')) return isIPv4Loopback(normalized.slice('::ffff:'.length))
  return isIPv4Loopback(normalized)
}

function isLoopbackHostname(hostname) {
  if (hostname === 'localhost' || hostname === '[::1]') return true
  return isIPv4Loopback(hostname)
}

function carriesBrowserAuthCookie(header) {
  if (typeof header !== 'string') return false
  return header.split(';').some(segment => segment.trim().startsWith(BROWSER_AUTH_COOKIE_PREFIX))
}

function browserSameOriginMarker(req) {
  if (req.headers['sec-fetch-site'] === 'same-origin') return true
  if (typeof req.headers.origin === 'string') return true
  return carriesBrowserAuthCookie(req.headers.cookie)
}

function isLoopbackRequest(req) {
  const remote = req.socket?.remoteAddress
  if (!isLoopbackAddress(remote)) return false
  if (req.headers['cf-connecting-ip'] !== undefined || req.headers['x-forwarded-for'] !== undefined) return false
  const host = req.headers.host
  if (typeof host !== 'string') return false
  let parsed
  try {
    parsed = new URL('http://' + host)
  } catch {
    return false
  }
  if (!isLoopbackHostname(parsed.hostname)) return false
  if (req.headers['sec-fetch-site'] === 'cross-site') return false
  const origin = req.headers.origin
  if (origin === undefined) return true
  try {
    return new URL(origin).host === parsed.host
  } catch {
    return false
  }
}

export function isTrustedRequest(req) {
  if (!browserSameOriginMarker(req)) return false
  return isLoopbackRequest(req)
}

/** Read a bounded JSON request body. Throws `body-too-large` past the cap. */
export async function readJsonBody(req, maxBytes) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > maxBytes) throw new Error('body-too-large')
    chunks.push(chunk)
  }
  const text = Buffer.concat(chunks).toString('utf8')
  if (text.trim() === '') return {}
  return JSON.parse(text)
}

export function writeJson(res, status, payload, extraHeaders = {}) {
  writeJsonResponse(res, status, payload, extraHeaders)
}
