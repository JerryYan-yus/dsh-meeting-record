/**
 * Host HTTP routes for the meeting-record panel.
 *
 * One prefix route: `GET /api/meetrecord/state` for the panel snapshot,
 * `GET /api/meetrecord/diag` for integration checks, and
 * `POST /api/meetrecord/action` for named mutations. Every mutation goes
 * through the same service the agent tools use.
 */
import { isTrustedRequest, readJsonBody, writeJson } from './http.js'

export const API_PREFIX = '/api/meetrecord'
const BODY_LIMIT = 14 * 1024 * 1024

function ok(data) {
  return { ok: true, data }
}

function fail(error) {
  return { ok: false, error: error instanceof Error ? error.message : String(error) }
}

export function makeRoutes(service, options = {}) {
  return [{
    kind: 'prefix',
    path: API_PREFIX,
    handler: async (req, res) => {
      if (!isTrustedRequest(req)) {
        writeJson(res, 403, { ok: false, error: 'forbidden' })
        return
      }
      const url = new URL(req.url ?? '/', 'http://127.0.0.1')
      const path = url.pathname.slice(API_PREFIX.length) || '/'
      try {
        if (req.method === 'GET' && (path === '/state' || path === '/')) {
          writeJson(res, 200, ok(service.state()))
          return
        }
        if (req.method === 'GET' && path === '/diag') {
          writeJson(res, 200, ok(diagnose(service, options)))
          return
        }
        if (req.method === 'POST' && path === '/client-loaded') {
          let report = {}
          try {
            const body = await readJsonBody(req, 16 * 1024)
            if (body !== null && typeof body === 'object') report = body
          } catch {
            // A broken beacon never fails the page.
          }
          if (options.diagnostics !== undefined) {
            options.diagnostics.clientLoaded = {
              at: new Date().toISOString(),
              href: typeof report.href === 'string' ? report.href.slice(0, 300) : '',
              seats: Array.isArray(report.seats) ? report.seats.slice(0, 10).map(String) : [],
              package: '@local/dsh-meetrecord',
            }
          }
          writeJson(res, 200, { ok: true })
          return
        }
        if (req.method === 'POST' && path === '/action') {
          const body = await readJsonBody(req, BODY_LIMIT)
          writeJson(res, 200, await dispatch(service, options, body))
          return
        }
        writeJson(res, 404, { ok: false, error: 'not-found' })
      } catch (error) {
        writeJson(res, error?.message === 'body-too-large' ? 413 : 400, fail(error))
      }
    },
  }]
}

async function dispatch(service, options, body) {
  const action = String(body?.action ?? '')
  const payload = body?.payload ?? {}
  try {
    switch (action) {
      case 'state.get':
        return ok(service.state())
      case 'state.reload':
        return ok(service.reload())
      case 'data.delete.request': {
        const challenge = service.requestDelete()
        return ok(challenge)
      }
      case 'data.delete.confirm': {
        const result = service.confirmDelete(String(payload.token ?? ''))
        return result.ok === true ? ok(result) : result
      }
      case 'profile.update':
        return ok(service.saveProfile(payload))
      case 'profile.get':
        return ok(service.profile())
      case 'settings.update':
        return ok(service.updateSettings(payload))
      case 'branch.create':
        return ok(service.branchCreate(payload))
      case 'branch.update':
        return ok(service.branchUpdate(String(payload.branchId ?? ''), payload))
      case 'org.setup':
        return ok(service.toolOrgSetup(payload))
      case 'member.create':
        return ok(service.memberCreate(payload))
      case 'member.update':
        return ok(service.memberUpdate(String(payload.memberId ?? ''), payload))
      case 'member.remove':
        return ok(service.memberRemove(String(payload.memberId ?? '')))
      case 'template.create':
        return ok(service.templateCreate(payload))
      case 'template.update':
        return ok(service.templateUpdate(String(payload.templateId ?? ''), payload))
      case 'template.duplicate':
        return ok(service.templateDuplicate(String(payload.templateId ?? '')))
      case 'meeting.create':
        return ok(service.meetingCreate(payload))
      case 'meeting.update':
        return ok(service.meetingUpdate(String(payload.meetingId ?? ''), payload))
      case 'meeting.check':
        return ok({ issues: service.check(String(payload.meetingId ?? '')) })
      case 'meeting.finalize': {
        const result = service.finalize(String(payload.meetingId ?? ''), String(payload.reason ?? ''))
        if (result.ok !== true) return result
        return ok(result)
      }
      case 'meeting.record_save': {
        const result = service.recordSave(String(payload.meetingId ?? ''), {
          markdown: payload.markdown,
          sources: payload.sources,
          final: Boolean(payload.final),
        })
        return ok(result)
      }
      case 'meeting.import_docx':
        return ok(service.importDocx(String(payload.meetingId ?? ''), payload))
      case 'meeting.export':
        return ok(service.exportDocx(String(payload.meetingId ?? '')))
      case 'meeting.export_file':
        return ok(service.exportDocxToVault(String(payload.meetingId ?? '')))
      case 'knowledge.list':
        return ok(service.knowledgeList())
      case 'knowledge.search':
        return ok(service.knowledgeSearch(payload.query, payload.limit))
      case 'knowledge.read':
        return ok(service.knowledgeRead(payload.path))
      case 'knowledge.save':
        return ok(service.knowledgeSave(payload))
      case 'knowledge.update':
        return ok(service.knowledgeUpdate(payload.path, payload.content))
      case 'knowledge.delete':
        return ok(service.knowledgeDelete(payload.path))
      case 'knowledge.organize':
        return ok(service.organizeKnowledge(Boolean(payload.force)))
      case 'branch.knowledge_save':
        return ok(service.syncBranchKnowledge(String(payload.branchId ?? '')))
      case 'skill.install': {
        if (typeof options.installSkill !== 'function') return { ok: false, error: '当前宿主不支持技能安装' }
        return ok(await options.installSkill())
      }
      case 'branch.remove':
      case 'template.remove':
      case 'meeting.remove':
      case 'knowledge.remove':
        return { ok: false, error: '禁止删除：插件只能读取和写入，不能删除任何记录或文件；如需删除请用户在文件/知识库中自行处理。' }
      default:
        return { ok: false, error: 'unknown-action: ' + action }
    }
  } catch (error) {
    return fail(error)
  }
}

function diagnose(service, options) {
  const clientModules = options.clientModules
  let graph = null
  if (clientModules !== undefined && typeof clientModules.graph === 'function') {
    try {
      const value = clientModules.graph()
      const entries = Array.isArray(value?.entries) ? value.entries : []
      graph = {
        release: value?.release ?? null,
        entryCount: entries.length,
        row: entries.find(entry => entry.id === '@local/dsh-meetrecord') ?? null,
        ids: entries.map(entry => entry.id).filter(id => String(id).includes('meetrecord') || String(id).includes('task-board')).slice(0, 20),
      }
    } catch (error) {
      graph = { error: error instanceof Error ? error.message : String(error) }
    }
  }
  return {
    ok: true,
    plugin: '@local/dsh-meetrecord',
    meetings: service.store.meetings.length,
    customTemplates: service.store.customTemplates.length,
    clientModules: graph,
    clientLoaded: options.diagnostics?.clientLoaded ?? null,
    skill: service.skill,
  }
}
