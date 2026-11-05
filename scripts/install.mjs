#!/usr/bin/env node
/**
 * One-click installer for the DSH meeting-record bundle (zip / git checkout).
 *
 * It registers this directory as a local bundle in an existing DSH profile:
 *   1. locate the DSH CLI (PATH, DSH_CLI, or the desktop app resources);
 *   2. back up the profile's package.json;
 *   3. add "@local/dsh-meetrecord": "link:<this folder>" to its dependencies;
 *   4. add the package to dsh.profile.bundles;
 *   5. run `dsh plugin --profile <profile> install`.
 *
 * It never deletes user data. Use --dry-run to inspect, --profile to target a
 * profile other than $DSH_PROFILE (default: desktop).
 */
import { existsSync, readFileSync, writeFileSync, copyFileSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..')
const packageFile = join(repoRoot, 'package.json')
const pkg = JSON.parse(readFileSync(packageFile, 'utf8'))
const pkgName = String(pkg.name ?? '')
const isWindows = process.platform === 'win32'
const args = process.argv.slice(2)

function takeOption(name, fallback = '') {
  const index = args.indexOf(name)
  if (index >= 0 && args[index + 1] !== undefined) return args[index + 1]
  const prefixed = args.find(item => item.startsWith(`${name}=`))
  if (prefixed !== undefined) return prefixed.slice(name.length + 1)
  return fallback
}

function hasFlag(name) {
  return args.includes(name)
}

function fail(message) {
  console.error(`\n安装失败：${message}\n`)
  process.exit(1)
}

if (pkgName === '') fail('仓库 package.json 缺少 name')
const profile = takeOption('--profile', process.env.DSH_PROFILE || 'desktop')
const dshHome = resolve(process.env.DSH_HOME || join(homedir(), '.dsh'))
const profileDir = join(dshHome, 'profiles', profile)
const profilePackageFile = join(profileDir, 'package.json')
const dryRun = hasFlag('--dry-run')

if (hasFlag('--help') || hasFlag('-h')) {
  console.log(`用法: node scripts/install.mjs [--profile <名称>] [--dry-run]
默认 profile: ${process.env.DSH_PROFILE || 'desktop'}
DSH_HOME: ${dshHome}`)
  process.exit(0)
}

function findOnPath(command) {
  const result = isWindows
    ? spawnSync('where', [command], { encoding: 'utf8' })
    : spawnSync('sh', ['-c', `command -v ${command}`], { encoding: 'utf8' })
  if (result.status !== 0) return ''
  return String(result.stdout ?? '').split(/\r?\n/).find(Boolean) ?? ''
}

function findDshCli() {
  if (process.env.DSH_CLI && existsSync(process.env.DSH_CLI)) return process.env.DSH_CLI
  const candidates = []
  if (process.env.DSH_RESOURCES) {
    candidates.push(join(process.env.DSH_RESOURCES, 'runtime', 'cli', 'bin', isWindows ? 'dsh.cmd' : 'dsh'))
  }
  if (isWindows) {
    const local = process.env.LOCALAPPDATA ?? ''
    const programFiles = process.env.ProgramFiles ?? ''
    const programFilesX86 = process.env['ProgramFiles(x86)'] ?? ''
    for (const base of [local && join(local, 'Programs', 'DeepSeek Harness'), local && join(local, 'DeepSeek Harness'), programFiles && join(programFiles, 'DeepSeek Harness'), programFilesX86 && join(programFilesX86, 'DeepSeek Harness')]) {
      if (base) candidates.push(join(base, 'resources', 'runtime', 'cli', 'bin', 'dsh.cmd'))
    }
  } else {
    const appRoots = process.platform === 'darwin'
      ? ['/Applications/DeepSeek Harness.app', join(homedir(), 'Applications', 'DeepSeek Harness.app')]
      : ['/opt/DeepSeek Harness', '/opt/deepseek-harness', '/usr/lib/deepseek-harness', join(homedir(), '.local', 'share', 'DeepSeek Harness')]
    for (const root of appRoots) candidates.push(join(root, 'Contents', 'Resources', 'runtime', 'cli', 'bin', 'dsh'))
    if (process.platform !== 'darwin') {
      for (const root of appRoots) candidates.push(join(root, 'resources', 'runtime', 'cli', 'bin', 'dsh'))
    }
  }
  for (const candidate of candidates) if (candidate !== '' && existsSync(candidate)) return candidate
  const onPath = findOnPath(isWindows ? 'dsh.cmd' : 'dsh')
  return onPath || ''
}

function run(command, commandArgs) {
  return spawnSync(command, commandArgs, {
    stdio: 'inherit',
    shell: isWindows && /\.(cmd|bat)$/i.test(command),
    cwd: profileDir,
  })
}

function readJson(file, label) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch (error) {
    fail(`${label} 无法解析：${file}\n${error instanceof Error ? error.message : String(error)}`)
  }
}

if (!existsSync(profilePackageFile)) {
  const profilesRoot = join(dshHome, 'profiles')
  const available = existsSync(profilesRoot) ? readdirSync(profilesRoot).filter(name => existsSync(join(profilesRoot, name, 'package.json'))) : []
  fail(`没有找到 DSH profile：${profileDir}\n请先安装并启动一次 DeepSeek Harness；已有 profile：${available.length ? available.join('、') : '无'}\n可用 --profile <名称> 指定。`)
}

let profilePackage = readJson(profilePackageFile, 'profile package.json')
const dependencies = profilePackage.dependencies !== null && typeof profilePackage.dependencies === 'object' ? profilePackage.dependencies : {}
const linkSpec = `link:${repoRoot.replace(/\\/g, '/')}`
const currentSpec = dependencies[pkgName]
const bundles = Array.isArray(profilePackage.dsh?.profile?.bundles) ? profilePackage.dsh.profile.bundles : []
const needsDependency = currentSpec !== linkSpec
const needsBundle = !bundles.includes(pkgName)

console.log(`插件：${pkgName}`)
console.log(`目录：${repoRoot}`)
console.log(`Profile：${profileDir}`)
console.log(`DSH_HOME：${dshHome}`)
console.log(`动作：${needsDependency ? '添加本地依赖' : '依赖已存在'}，${needsBundle ? '加入 bundle 列表' : 'bundle 已启用'}`)

if (dryRun) {
  console.log('\n[dry-run] 未修改任何文件。')
  process.exit(0)
}

const cli = findDshCli()
if (cli === '') fail('没有找到 dsh 命令。请先安装/启动一次 DeepSeek Harness，或设置 DSH_CLI=/path/to/dsh。')
console.log(`DSH CLI：${cli}`)

const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const backupFile = `${profilePackageFile}.bak-install-${stamp}`
copyFileSync(profilePackageFile, backupFile)

const next = JSON.parse(JSON.stringify(profilePackage))
next.dependencies = { ...(next.dependencies ?? {}), [pkgName]: linkSpec }
next.dsh = next.dsh ?? {}
next.dsh.profile = next.dsh.profile ?? {}
next.dsh.profile.bundles = Array.isArray(next.dsh.profile.bundles) ? next.dsh.profile.bundles : []
if (!next.dsh.profile.bundles.includes(pkgName)) next.dsh.profile.bundles.push(pkgName)
writeFileSync(profilePackageFile, `${JSON.stringify(next, null, 2)}\n`, 'utf8')
console.log(`\n已更新 profile 配置；备份：${backupFile}`)

console.log('\n正在安装依赖（等价于 dsh plugin --profile ... install）…')
const installed = run(cli, ['plugin', '--profile', profile, 'install'])
if (installed.status !== 0) {
  copyFileSync(backupFile, profilePackageFile)
  fail(`依赖安装失败（退出码 ${installed.status}）。已恢复 profile package.json。\n请确认 DeepSeek Harness 已完全退出，或手动运行：${cli} plugin --profile ${profile} install`)
}

console.log('\n安装完成。')
console.log('请完全退出并重新打开 DeepSeek Harness（不是只刷新页面）。')
console.log('重新打开后，侧栏会出现「会议记录」；首次使用请完成配置，然后在对话里说“帮我写一份会议记录”。')
console.log('如果侧栏没有出现，请在 DSH 插件管理中确认该 bundle 已启用。')
