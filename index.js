/**
 * Host half of the 党建会议记录助手 bundle (v2: conversation-first).
 *
 * Responsibilities:
 * - register the business service as agent tools (templates, org data, draft,
 *   record, knowledge base, docx reading) and one same-origin HTTP route
 *   family used by the panel;
 * - install the bundled `party-meeting-records` skill into the user's DSH skill
 *   directory so conversations can follow the meeting-record workflow.
 *
 * No model call happens here.
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadStore, dshHome } from './lib/store.js'
import { createService } from './lib/service.js'
import { makeRoutes } from './lib/routes.js'
import { makeTools } from './lib/tools.js'

export const name = 'meetrecord'
export const inject = ['tools', 'webServer']

const SKILL_NAME = 'party-meeting-records'
const SKILL_FILE = fileURLToPath(new URL('./skills/party-meeting-records/SKILL.md', import.meta.url))

function skillTarget() {
  return join(dshHome(), 'skills', SKILL_NAME, 'SKILL.md')
}

/** Install or refresh the bundled skill; best effort, never fails activation. */
function installBundledSkill(service) {
  try {
    const content = readFileSync(SKILL_FILE, 'utf8')
    const target = skillTarget()
    const version = createHash('sha256').update(content).digest('hex').slice(0, 12)
    let changed = true
    let installedAt = new Date().toISOString()
    if (existsSync(target)) {
      try {
        const current = readFileSync(target, 'utf8')
        changed = current !== content
        installedAt = statSync(target).mtime.toISOString()
      } catch {
        changed = true
      }
    }
    if (changed) {
      mkdirSync(dirname(target), { recursive: true })
      writeFileSync(target, content, { encoding: 'utf8' })
      installedAt = new Date().toISOString()
    }
    return service.setSkillStatus({ installed: true, path: target, version, installedAt })
  } catch (error) {
    console.warn('[meetrecord] 安装技能失败（会议记录仍可手动生成）：', error)
    return service.setSkillStatus({ installed: false, path: skillTarget(), version: '', installedAt: '', error: error instanceof Error ? error.message : String(error) })
  }
}

export function apply(ctx) {
  const store = loadStore()
  const service = createService(store)
  const diagnostics = { clientLoaded: null }

  function installSkill() {
    return installBundledSkill(service)
  }
  installSkill()

  const optionalService = optionalName => {
    try {
      return typeof ctx.get === 'function' ? ctx.get(optionalName) : undefined
    } catch {
      return undefined
    }
  }

  ctx.effect(() => {
    const disposers = makeTools(service).map(definition => ctx.tools.register(definition))
    return () => {
      for (const dispose of disposers.splice(0)) {
        try {
          dispose()
        } catch (error) {
          console.warn('[meetrecord] 注销工具失败：', error)
        }
      }
    }
  }, 'meetrecord: agent tools')

  ctx.effect(() => {
    const clientModules = optionalService('clientModules')
    const disposers = makeRoutes(service, { clientModules, diagnostics, installSkill })
      .map(route => ctx.webServer.register(route))
    return () => {
      for (const dispose of disposers.splice(0)) {
        try {
          dispose()
        } catch (error) {
          console.warn('[meetrecord] 注销路由失败：', error)
        }
      }
    }
  }, 'meetrecord: panel routes')
}
