/**
 * Client half of the 会议记录助手 bundle (simplified, novice-friendly UI).
 *
 * Three top-level pages only: 会议记录 / 人员 / 设置. The panel is intentionally
 * minimal: the primary workflow is "copy one sentence into a conversation";
 * records are viewed read-only with Word export/finalize; manual editing,
 * attendance, procedures and templates live behind collapsed "更多" areas.
 */
window.__ModuleLoader__.load({
  id: '@local/dsh-meetrecord',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useState, useEffect, useCallback } = React

    const PANEL_ID = 'meetrecord-panel'
    const API = 'api/meetrecord'
    const SKILL_NAME = 'party-meeting-records'
    const STATUS_LABELS = { draft: '草稿', generated: '已生成', finalized: '已定稿', archived: '已归档' }
    const LEVEL_LABELS = { block: '必须处理', confirm: '需要确认', suggest: '建议优化' }
    const NAV = [
      ['meetings', '会议记录'],
      ['materials', '材料'],
      ['tasks', '任务'],
      ['people', '人员'],
      ['knowledge', '知识库'],
      ['settings', '设置'],
    ]
    const KNOWLEDGE_KIND_LABELS = { branch: '支部信息', record: '会议记录', reference: '检索资料', material: '支部材料', daily: '日常工作', spec: '规范制度', index: '索引' }
    function defaultVaultFor(domainId) {
      return '~/Documents/机关工作知识库'
    }

    async function apiGet() {
      const response = await fetch(`${API}/state`, { credentials: 'include' })
      const payload = await response.json().catch(() => ({ ok: false, error: '返回内容无法解析' }))
      if (payload.ok !== true) throw new Error(payload.error ?? `请求失败（${response.status}）`)
      return payload.data
    }

    async function apiAction(action, actionPayload) {
      const response = await fetch(`${API}/action`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, payload: actionPayload ?? {} }),
      })
      const payload = await response.json().catch(() => ({ ok: false, error: '返回内容无法解析' }))
      if (payload.ok !== true) {
        const error = new Error(payload.error ?? payload.code ?? `请求失败（${response.status}）`)
        error.issues = payload.issues ?? payload.data?.issues
        error.code = payload.code
        throw error
      }
      return payload.data
    }

    function readFileAsBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = String(reader.result ?? '')
          resolve(result.includes(',') ? result.slice(result.indexOf(',') + 1) : result)
        }
        reader.onerror = () => reject(reader.error ?? new Error('读取文件失败'))
        reader.readAsDataURL(file)
      })
    }

    function downloadDocx(data) {
      const bytes = Uint8Array.from(atob(data.base64), character => character.charCodeAt(0))
      const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = data.filename
      anchor.click()
      setTimeout(() => URL.revokeObjectURL(url), 3000)
    }

    function downloadTextFile(filename, text) {
      const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      anchor.click()
      setTimeout(() => URL.revokeObjectURL(url), 3000)
    }

    function parseMemberLines(text) {
      return String(text ?? '')
        .split(/\n|；|;/)
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => {
          const parts = line.split(/\s+/).filter(Boolean)
          if (parts.length <= 1) return { name: parts[0] ?? '', position: '', detail: '' }
          return { name: parts[0], position: parts[1], detail: parts.slice(2).join(' ') }
        })
        .filter(item => item.name !== '')
    }

    function committeeMember(member) {
      return /(书记|副书记|委员)/.test(String(member.position ?? ''))
    }

    // ---------------------------------------------------------------- styles

    const ui = {
      input: {
        width: '100%', boxSizing: 'border-box', padding: '7px 9px', borderRadius: 7,
        border: '1px solid var(--dsw-alias-border, rgba(0,0,0,.16))',
        background: 'var(--dsw-alias-bg-primary, #fff)', color: 'var(--dsw-alias-text-primary, #1f2329)',
        font: 'inherit', fontSize: 13,
      },
      textarea: {
        width: '100%', boxSizing: 'border-box', minHeight: 90, padding: '7px 9px', borderRadius: 7,
        border: '1px solid var(--dsw-alias-border, rgba(0,0,0,.16))',
        background: 'var(--dsw-alias-bg-primary, #fff)', color: 'var(--dsw-alias-text-primary, #1f2329)',
        font: 'inherit', fontSize: 13, lineHeight: 1.7, resize: 'vertical',
      },
      label: { fontSize: 12, color: 'var(--dsw-alias-text-secondary, #646a73)', marginBottom: 4, display: 'block' },
      card: {
        border: '1px solid var(--dsw-alias-border, rgba(0,0,0,.10))', borderRadius: 10, padding: 16,
        marginBottom: 12, background: 'var(--dsw-alias-bg-primary, #fff)',
      },
      cardTitle: { fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'var(--dsw-alias-text-primary, #1f2329)' },
      button: kind => {
        const base = { padding: '7px 14px', borderRadius: 7, border: '1px solid transparent', cursor: 'pointer', font: 'inherit', fontSize: 13, marginRight: 8, marginBottom: 4 }
        if (kind === 'primary') return { ...base, background: 'var(--dsw-alias-accent, #2563eb)', color: '#fff' }
        if (kind === 'link') return { ...base, background: 'transparent', color: 'var(--dsw-alias-accent, #2563eb)', borderColor: 'transparent', padding: '2px 4px' }
        if (kind === 'danger') return { ...base, background: 'transparent', color: '#c0392b', borderColor: 'rgba(192,57,43,.45)' }
        return { ...base, background: 'var(--dsw-alias-bg-secondary, #f3f4f6)', color: 'var(--dsw-alias-text-primary, #1f2329)', borderColor: 'var(--dsw-alias-border, rgba(0,0,0,.14))' }
      },
      row: { display: 'flex', gap: 10, flexWrap: 'wrap' },
      field: { flex: '1 1 180px', minWidth: 150, marginBottom: 8 },
      hint: { fontSize: 12, color: 'var(--dsw-alias-text-tertiary, #8a9099)', lineHeight: 1.7 },
      badge: status => ({
        display: 'inline-block', padding: '1px 8px', borderRadius: 999, fontSize: 11, marginLeft: 8,
        background: status === 'finalized' ? 'rgba(22,163,74,.12)' : 'rgba(37,99,235,.12)',
        color: status === 'finalized' ? '#16794c' : '#1d4ed8',
      }),
    }

    function Card({ title, extra, children }) {
      return h('div', { style: ui.card },
        title ? h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
          h('div', { style: ui.cardTitle }, title), extra ?? null) : null,
        children)
    }

    function Field({ label, children, grow }) {
      return h('div', { style: { ...ui.field, flex: grow ? `${grow} 1 260px` : ui.field.flex } },
        h('span', { style: ui.label }, label), children)
    }

    function Btn({ kind = 'default', onClick, disabled, children, title }) {
      return h('button', { type: 'button', title, disabled: Boolean(disabled), onClick, style: { ...ui.button(kind), opacity: disabled ? 0.55 : 1 } }, children)
    }

    function Select({ value, onChange, options }) {
      return h('select', { value: value ?? '', onChange: event => onChange(event.target.value), style: ui.input },
        options.map(option => h('option', { key: option.value, value: option.value }, option.label)))
    }

    function RenderCheckbox({ checked, onChange }) {
      return h('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', color: 'var(--dsw-alias-text-secondary, #646a73)' } },
        h('input', { type: 'checkbox', checked, onChange: event => onChange(event.target.checked) }),
        '渲染 Markdown')
    }

    // ------------------------------------------------------ markdown preview

    function inlineText(text) {
      return String(text)
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    }

    function stripFrontmatter(md) {
      const text = String(md ?? '')
      if (!text.startsWith('---')) return text
      const matched = text.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/)
      return matched === null ? text : text.slice(matched[0].length)
    }

    function renderMarkdown(md) {
      const lines = String(md ?? '').split('\n')
      const blocks = []
      let index = 0
      while (index < lines.length) {
        const raw = lines[index]
        const line = raw.trimEnd()
        if (line.trim() === '') { index += 1; continue }
        if (/^\|/.test(line)) {
          const rows = []
          while (index < lines.length && /^\|/.test(lines[index])) {
            const cells = lines[index].split('|').slice(1, -1).map(cell => inlineText(cell.trim()))
            if (!cells.every(cell => /^:?-{2,}:?$/.test(cell))) rows.push(cells)
            index += 1
          }
          if (rows.length > 0) {
            blocks.push(h('table', { key: `t${blocks.length}`, style: { width: '100%', borderCollapse: 'collapse', margin: '8px 0', fontSize: 13 } },
              rows.map((row, rowIndex) => h('tr', { key: rowIndex, style: { borderBottom: '1px solid rgba(0,0,0,.08)' } },
                row.map((cell, cellIndex) => h(cellIndex === 0 ? 'th' : 'td', {
                  key: cellIndex,
                  style: {
                    textAlign: 'left', padding: '5px 8px', verticalAlign: 'top',
                    fontWeight: rowIndex === 0 || cellIndex === 0 ? 600 : 400,
                    color: 'var(--dsw-alias-text-primary, #1f2329)',
                    whiteSpace: 'pre-wrap',
                  },
                }, cell))))))
          }
          continue
        }
        if (/^#{1,3}\s/.test(line)) {
          const level = line.match(/^#+/)[0].length
          blocks.push(h('div', {
            key: `h${blocks.length}`,
            style: { fontSize: level === 1 ? 18 : level === 2 ? 15 : 14, fontWeight: 700, margin: level === 1 ? '6px 0 10px' : '14px 0 6px' },
          }, inlineText(line.replace(/^#+\s/, ''))))
          index += 1
          continue
        }
        if (/^[-*]\s/.test(line)) {
          const items = []
          while (index < lines.length && /^[-*]\s/.test(lines[index].trim())) {
            items.push(inlineText(lines[index].trim().replace(/^[-*]\s/, '')))
            index += 1
          }
          blocks.push(h('ul', { key: `u${blocks.length}`, style: { margin: '4px 0 8px 18px', padding: 0, fontSize: 13, lineHeight: 1.8 } },
            items.map((item, itemIndex) => h('li', { key: itemIndex }, item))))
          continue
        }
        const dialogue = line.match(/^([^：:\n]{1,20})（([^）\n]+)）[：:]\s*(.*)$/)
        if (dialogue !== null) {
          blocks.push(h('div', { key: `d${blocks.length}`, style: { fontSize: 13, lineHeight: 1.85, margin: '3px 0', whiteSpace: 'pre-wrap' } },
            h('strong', { style: { color: 'var(--dsw-alias-text-primary, #1f2329)' } }, `${dialogue[1]}（${dialogue[2]}）：`),
            h('span', null, dialogue[3] ?? '')))
          index += 1
          continue
        }
        blocks.push(h('div', { key: `p${blocks.length}`, style: { fontSize: 13, lineHeight: 1.85, margin: '3px 0', whiteSpace: 'pre-wrap' } }, inlineText(line)))
        index += 1
      }
      if (blocks.length === 0) return h('div', { style: ui.hint }, '正文为空。')
      return h('div', null, blocks)
    }

    // ------------------------------------------------------------- setup

    function SetupWizard({ snapshot, mutate }) {
      const fallbackDomains = [{ id: 'party', name: '党建党务', orgFieldLabel: '支部全称', orgPlaceholder: '例如：XX党支部', memberLabel: '党员', membersPlaceholder: '张三 支部书记 负责支部全面工作\n李四 组织委员 负责组织、党员发展' }]
      const domains = snapshot?.workDomains?.length ? snapshot.workDomains : fallbackDomains
      const [workDomain, setWorkDomain] = useState(snapshot?.settings?.workDomain || snapshot?.workDomain?.id || 'party')
      const domain = domains.find(item => item.id === workDomain) ?? domains[0]
      const [branchName, setBranchName] = useState('')
      const [orgName, setOrgName] = useState('')
      const [notes, setNotes] = useState('')
      const [vaultPath, setVaultPath] = useState('')
      const [membersText, setMembersText] = useState('')
      const [profileLevel, setProfileLevel] = useState('')
      const [profileRole, setProfileRole] = useState('')
      const [profilePurpose, setProfilePurpose] = useState('')
      const [busy, setBusy] = useState(false)
      async function save() {
        if (branchName.trim() === '' || workDomain === '' || busy) return
        setBusy(true)
        try {
          await mutate('org.setup', {
            workDomain,
            branchName: branchName.trim(),
            orgName: orgName.trim(),
            notes: notes.trim(),
            vaultPath: vaultPath.trim(),
            members: parseMemberLines(membersText),
            profile: { level: profileLevel, role: workDomain === 'party' ? profileRole : '', purpose: profilePurpose },
            makeDefault: true,
          })
        } finally {
          setBusy(false)
        }
      }
      return h(Card, { title: '首次配置' },
        h('div', { style: { ...ui.hint, marginBottom: 12 } }, '默认党建党务；填写一次，长期有效。非党建工作者可在“工作性质”中切换。'),
        h(Field, { label: '工作性质（默认党建党务）' }, h(Select, {
          value: workDomain, onChange: setWorkDomain,
          options: domains.map(item => ({ value: item.id, label: item.name })),
        })),
        domain?.hint ? h('div', { style: { ...ui.hint, marginBottom: 8 } }, domain.hint) : null,
        h(Field, { label: domain?.orgFieldLabel || '单位/部门全称' },
          h('input', { style: ui.input, placeholder: domain?.orgPlaceholder || '例如：XX单位XX科室', value: branchName, onChange: event => setBranchName(event.target.value) })),
        h(Field, { label: '单位/上级单位（可选）' },
          h('input', { style: ui.input, placeholder: '例如：XX局、XX学院', value: orgName, onChange: event => setOrgName(event.target.value) })),
        h(Field, { label: '补充说明（可选）' },
          h('textarea', { style: { ...ui.textarea, minHeight: 60 }, placeholder: '例如：部门职责、人员规模、工作特点', value: notes, onChange: event => setNotes(event.target.value) })),
        h(Field, { label: 'Obsidian 知识库位置' },
          h('input', { style: ui.input, placeholder: `默认：${defaultVaultFor(workDomain)}`, value: vaultPath, onChange: event => setVaultPath(event.target.value) })),
        h('div', { style: ui.row },
          workDomain === 'party' ? h(Field, { label: '我的角色（可不填）' }, h(Select, {
            value: profileRole, onChange: setProfileRole,
            options: [{ value: '', label: '不填' }, { value: 'secretary', label: '支部书记' }, { value: 'organizer', label: '组织委员' }, { value: 'committee', label: '其他支委' }, { value: 'member', label: '普通党员' }, { value: 'other', label: '其他' }],
          })) : null,
          h(Field, { label: '电脑熟练度（可不填）' }, h(Select, {
            value: profileLevel, onChange: setProfileLevel,
            options: [{ value: '', label: '不填' }, { value: 'novice', label: '不熟' }, { value: 'regular', label: '一般' }, { value: 'expert', label: '熟练' }],
          })),
          h(Field, { label: '用途（可不填）' }, h(Select, {
            value: profilePurpose, onChange: setProfilePurpose,
            options: [{ value: '', label: '不填' }, { value: 'handwrite', label: '手抄' }, { value: 'archive', label: '电子归档' }, { value: 'report', label: '上报材料' }],
          }))),
        h(Field, { label: `${domain?.memberLabel || '人员'}名单` },
          h('textarea', {
            style: { ...ui.textarea, minHeight: 110 },
            placeholder: domain?.membersPlaceholder || '张三 负责人\n李四 工作人员',
            value: membersText,
            onChange: event => setMembersText(event.target.value),
          })),
        h(Btn, { kind: 'primary', onClick: save, disabled: busy || branchName.trim() === '' || workDomain === '' }, busy ? '保存中…' : '保存'),
        h('div', { style: { ...ui.hint, marginTop: 8 } }, '保存后，在对话中说：帮我写一份会议记录。'))
    }

    function memberSummary(members) {
      const committee = members.filter(committeeMember)
      const partyMembers = members.filter(member => !committeeMember(member))
      return { committee, partyMembers }
    }

    function ChatCard({ compact, guidance, workDomain }) {
      const [copied, setCopied] = useState('')
      const meetingType = workDomain?.meetingTypes?.[0] || '会议'
      const starter = '帮我写一份会议记录。\n会议类型：' + meetingType + '\n会议日期：' + new Date().toISOString().slice(0, 10) + '\n材料如下：\n（把会议材料粘贴在这里，或写工作区里的文件路径）'
      async function copy() {
        try {
          await navigator.clipboard.writeText(starter)
          setCopied('已复制')
        } catch {
          setCopied('复制失败，请手动复制')
        }
        setTimeout(() => setCopied(''), 3000)
      }
      return h(Card, { title: compact ? '在对话中生成' : '在对话中生成会议记录' },
        h('div', { style: { ...ui.hint, marginBottom: 8 } },
          guidance?.level === 'novice'
            ? '复制到对话，按提示一步步操作。'
            : guidance?.level === 'expert'
              ? '复制到对话，补充会议类型与材料即可。'
              : '复制到对话，附会议材料。'),
        h('div', { style: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' } },
          h(Btn, { kind: 'primary', onClick: copy }, '复制'),
          copied ? h('span', { style: ui.hint }, copied) : null),
        h('textarea', { style: { ...ui.textarea, minHeight: compact ? 84 : 110 }, readOnly: true, value: starter }),
        compact ? null : null)
    }

    // ------------------------------------------------------------ meetings

    function MeetingList({ snapshot, mutate, onOpen, onCreated }) {
      const meetings = snapshot.meetings ?? []
      if (meetings.length === 0) {
        return h(Card, { title: '会议记录' },
          h('div', { style: ui.hint }, '还没有会议记录。到对话里说“帮我写一份会议记录”即可生成。'),
          h('details', { style: { marginTop: 10 } },
            h('summary', { style: { ...ui.hint, cursor: 'pointer' } }, '手动新建会议'),
            h(NewMeetingForm, { snapshot, mutate, onCreated })))
      }
      return h(Card, { title: `会议记录（${meetings.length}）` },
        meetings.map(meeting => h('div', {
          key: meeting.id,
          onClick: () => onOpen(meeting.id),
          style: {
            padding: '10px 12px', border: '1px solid var(--dsw-alias-border, rgba(0,0,0,.08))',
            borderRadius: 8, marginBottom: 8, cursor: 'pointer',
          },
        },
          h('div', { style: { fontSize: 13, fontWeight: 600 } }, meeting.title || '（未命名会议）', h('span', { style: ui.badge(meeting.status) }, STATUS_LABELS[meeting.status] ?? meeting.status)),
          h('div', { style: { ...ui.hint, marginTop: 4 } }, `${meeting.meetingDate || '无日期'} · ${meeting.meetingType || ''} · ${meeting.charCount ?? 0} 字${meeting.pendingCount > 0 ? ` · ${meeting.pendingCount} 处待核对` : ''}`),
          )),
        h('details', { style: { marginTop: 10 } },
          h('summary', { style: { ...ui.hint, cursor: 'pointer' } }, '手动新建会议'),
          h(NewMeetingForm, { snapshot, mutate, onCreated })))
    }

    function NewMeetingForm({ snapshot, mutate, onCreated }) {
      const domainTemplates = snapshot.workDomain?.templates
      const meetingTemplates = snapshot.templates.filter(template => template.kind === 'meeting' && (!Array.isArray(domainTemplates) || domainTemplates.includes(template.id) || template.builtin !== true))
      const [form, setForm] = useState({
        branchId: snapshot.settings.defaultBranchId || snapshot.branches[0]?.id || '',
        templateId: snapshot.settings.defaultTemplateId || meetingTemplates[0]?.id || '',
        meetingDate: new Date().toISOString().slice(0, 10),
        title: '',
      })
      async function createMeeting() {
        const created = await mutate('meeting.create', form)
        onCreated(created.id)
      }
      return h('div', { style: { marginTop: 8 } },
        h(Field, { label: '会议模板' }, h(Select, { value: form.templateId, onChange: value => setForm({ ...form, templateId: value }), options: meetingTemplates.map(template => ({ value: template.id, label: template.name })) })),
        h(Field, { label: '会议日期' }, h('input', { type: 'date', style: ui.input, value: form.meetingDate, onChange: event => setForm({ ...form, meetingDate: event.target.value }) })),
        h(Field, { label: '标题' }, h('input', { style: ui.input, value: form.title, onChange: event => setForm({ ...form, title: event.target.value }) })),
        h(Btn, { kind: 'primary', onClick: createMeeting, disabled: snapshot.branches.length === 0 }, '创建'))
    }

    function MeetingDetail({ meeting, snapshot, mutate, call, onBack }) {
      const [editing, setEditing] = useState(false)
      const [markdown, setMarkdown] = useState(meeting.recordMarkdown ?? '')
      const [renderMarkdownEnabled, setRenderMarkdownEnabled] = useState(() => {
        try { return localStorage.getItem('meetrecord.recordRender') !== 'false' } catch { return true }
      })
      const [editingInfo, setEditingInfo] = useState(false)
      const [form, setForm] = useState(pickFields(meeting))
      const [importing, setImporting] = useState(false)
      const [repairing, setRepairing] = useState(false)
      const [issues, setIssues] = useState(null)
      const [status, setStatus] = useState('')
      useEffect(() => { setMarkdown(meeting.recordMarkdown ?? '') }, [meeting.id, meeting.updatedAt])
      useEffect(() => { setForm(pickFields(meeting)) }, [meeting.id])

      function changeRecordRender(next) {
        setRenderMarkdownEnabled(next)
        try { localStorage.setItem('meetrecord.recordRender', String(next)) } catch { /* ignore */ }
      }

      function pickFields(item) {
        return {
          title: item.title ?? '', meetingDate: item.meetingDate ?? '', meetingTime: item.meetingTime ?? '',
          location: item.location ?? '', host: item.host ?? '', recorder: item.recorder ?? '',
        }
      }

      async function saveRecord() {
        const result = await mutate('meeting.record_save', { meetingId: meeting.id, markdown })
        setEditing(false)
        setStatus(`已保存（${result.chars} 字）`)
      }
      async function exportWord() {
        const data = await call('meeting.export_file', { meetingId: meeting.id })
        setStatus(`已导出：${data.path}`)
      }
      async function generatePrep() {
        const data = await call('meeting.prep_pack', { meetingId: meeting.id })
        downloadTextFile(`${data.title || '会议材料'}.md`, data.markdown)
        setStatus('会前材料已生成并下载')
      }

      async function saveToKnowledge(kind) {
        const recordContent = kind === 'reference'
          ? (meeting.sources ?? []).map(source => `- ${source.title || source.url}${source.publishedAt ? `（${source.publishedAt}）` : ''}${source.url ? ` ${source.url}` : ''}`).join('\n')
          : meeting.recordMarkdown
        if (String(recordContent ?? '').trim() === '') {
          window.alert(kind === 'reference' ? '本记录没有检索来源。' : '正文为空，不能存入知识库。')
          return
        }
        const result = await mutate('knowledge.save', {
          kind,
          title: kind === 'reference' ? `${meeting.title || '会议记录'} 检索资料` : (meeting.title || '会议记录'),
          content: recordContent,
          tags: [meeting.meetingType, kind === 'reference' ? '检索资料' : '会议记录'].filter(Boolean),
          sources: meeting.sources ?? [],
          meetingId: meeting.id,
          meetingType: meeting.meetingType,
          date: meeting.meetingDate,
        })
        setStatus(kind === 'reference' ? `检索资料已存入：${result.relativePath}` : `已存入知识库：${result.relativePath}`)
      }

      async function finalize() {
        const checked = await call('meeting.check', { meetingId: meeting.id })
        setIssues(checked.issues)
        if (checked.issues.some(item => item.level === 'block')) {
          window.alert('还有必须处理的问题，暂不能定稿。')
          return
        }
        const confirmText = checked.issues.some(item => item.level === 'confirm')
          ? `有 ${checked.issues.filter(item => item.level === 'confirm').length} 处需要确认，仍要定稿？`
          : '确认定稿？'
        if (!window.confirm(confirmText)) return
        await mutate('meeting.finalize', { meetingId: meeting.id, reason: '经确认定稿' })
        setStatus('已定稿')
      }
      async function importWord(event) {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (file === undefined) return
        setImporting(true)
        try {
          const base64 = await readFileAsBase64(file)
          const updated = await mutate('meeting.import_docx', { meetingId: meeting.id, name: file.name, dataBase64: base64 })
          setMarkdown(updated.recordMarkdown ?? '')
          setStatus(`已导入 ${file.name}`)
        } finally {
          setImporting(false)
        }
      }
      async function saveInfo() {
        await mutate('meeting.update', { meetingId: meeting.id, ...form })
        setEditingInfo(false)
      }
      async function toggleAttendee(memberId, checked) {
        const next = { ...meeting.attendees }
        if (checked) next[memberId] = 'present'
        else delete next[memberId]
        await mutate('meeting.update', { meetingId: meeting.id, attendees: next })
      }

      const members = snapshot.members.filter(member => member.branchId === meeting.branchId)
      const committee = memberSummary(members).committee
      const partyMembers = memberSummary(members).partyMembers
      const issuesList = issues === null ? null : h('div', { style: { marginTop: 8 } },
        issues.map((issue, index) => h('div', { key: index, style: { fontSize: 12, padding: '2px 0', color: issue.level === 'block' ? '#c0392b' : issue.level === 'confirm' ? '#b45309' : '#646a73' } },
          `【${LEVEL_LABELS[issue.level] ?? issue.level}】`, issue.message)))

      return h('div', null,
        h('div', { style: { marginBottom: 10 } }, h(Btn, { kind: 'link', onClick: onBack }, '← 返回会议列表')),
        h('div', { style: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 } },
          h('div', { style: { fontSize: 17, fontWeight: 700 } }, meeting.title || '（未命名会议）'),
          h('span', { style: ui.badge(meeting.status) }, STATUS_LABELS[meeting.status] ?? meeting.status)),
        h('div', { style: { ...ui.hint, marginBottom: 12 } },
          `${meeting.meetingDate || '日期未填'} · ${meeting.meetingType || ''} · ${meeting.branchName || ''} · ${meeting.charCount ?? 0} 字`,
          meeting.pendingCount > 0 ? ` · ${meeting.pendingCount} 处待核对` : ''),
        h('div', { style: { marginBottom: 8 } },
          h(Btn, { kind: 'primary', onClick: exportWord }, '导出 Word'),
          meeting.status === 'finalized' ? null : h(Btn, { onClick: finalize }, '定稿'),
          h(Btn, { onClick: editing ? saveRecord : () => setEditing(true) }, editing ? '保存正文' : '编辑正文'),
          h(Btn, { onClick: () => saveToKnowledge('record') }, '存入知识库'),
          (meeting.sourcesCount ?? 0) > 0 ? h(Btn, { onClick: () => saveToKnowledge('reference') }, '存入检索资料') : null,
          h(Btn, { onClick: generatePrep }, '会前材料'),
          h(Btn, { kind: 'danger', onClick: async () => {
            if (!window.confirm('确定删除这条会议记录？关联任务也会删除，知识库笔记保留。')) return
            await mutate('meeting.delete', { meetingId: meeting.id })
            onBack()
          } }, '删除记录')),
        status !== '' ? h('div', { style: { ...ui.hint, marginBottom: 8, color: '#16794c' } }, status) : null,
        h(Card, { title: '会议记录正文', extra: editing ? null : h(RenderCheckbox, { checked: renderMarkdownEnabled, onChange: changeRecordRender }) },
          editing
            ? h('div', null,
              h('textarea', { style: { ...ui.textarea, minHeight: 420 }, value: markdown, onChange: event => setMarkdown(event.target.value) }),
              h(Btn, { kind: 'primary', onClick: saveRecord, title: '保存正文' }, '保存'))
            : renderMarkdownEnabled === false
              ? h('pre', { style: { maxHeight: 520, overflow: 'auto', fontSize: 12, lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 } }, markdown)
              : h('div', { style: { maxHeight: 520, overflow: 'auto', paddingRight: 4 } }, renderMarkdown(markdown))),
        h('details', { style: { ...ui.card, marginTop: 4 } },
          h('summary', { style: { cursor: 'pointer', fontSize: 14, fontWeight: 600 } }, '更多'),
          h('div', { style: { marginTop: 12 } },
            
            h('div', { style: ui.row },
              h(Field, { label: '标题' }, h('input', { style: ui.input, value: form.title, onChange: event => setForm({ ...form, title: event.target.value }) })),
              h(Field, { label: '日期' }, h('input', { type: 'date', style: ui.input, value: form.meetingDate, onChange: event => setForm({ ...form, meetingDate: event.target.value }) })),
              h(Field, { label: '时间' }, h('input', { style: ui.input, placeholder: '如 14:30', value: form.meetingTime, onChange: event => setForm({ ...form, meetingTime: event.target.value }) }))),
            h('div', { style: ui.row },
              h(Field, { label: '地点' }, h('input', { style: ui.input, value: form.location, onChange: event => setForm({ ...form, location: event.target.value }) })),
              h(Field, { label: '主持人' }, h('input', { style: ui.input, value: form.host, onChange: event => setForm({ ...form, host: event.target.value }) })),
              h(Field, { label: '记录人' }, h('input', { style: ui.input, value: form.recorder, onChange: event => setForm({ ...form, recorder: event.target.value }) }))),
            editingInfo
              ? h('div', null,
                h(Btn, { kind: 'primary', onClick: saveInfo }, '保存信息'),
                h(Btn, { onClick: () => setEditingInfo(false) }, '取消'))
              : h(Btn, { onClick: () => setEditingInfo(true) }, '编辑会议信息'),
            h('div', { style: { ...ui.cardTitle, marginTop: 14, marginBottom: 4 } }, '参会人员'),
            committee.length > 0 ? h('div', { style: { ...ui.hint, marginTop: 4 } }, '支部委员：', committee.map(member => `${member.name}${member.position ? `（${member.position}）` : ''}`).join('、')) : null,
            partyMembers.length > 0 ? h('div', { style: { ...ui.hint, marginTop: 2 } }, '党员：', partyMembers.map(member => member.name).join('、')) : null,
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '4px 14px', marginTop: 6 } },
              members.map(member => h('label', { key: member.id, style: { fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 } },
                h('input', { type: 'checkbox', checked: meeting.attendees[member.id] === 'present', onChange: event => toggleAttendee(member.id, event.target.checked) }),
                h('span', null, member.name)))),
            h('div', { style: { ...ui.cardTitle, marginTop: 14, marginBottom: 4 } }, '其他'),
            h('label', { style: { ...ui.button('default'), display: 'inline-block' } },
              importing ? '导入中…' : '导入修订 Word',
              h('input', { type: 'file', accept: '.docx,.txt,.md', onChange: importWord, style: { display: 'none' } })),
            h(Btn, { onClick: async () => setIssues((await call('meeting.check', { meetingId: meeting.id })).issues) }, '检查定稿条件'),
            issuesList)))
    }

    function WorkDomainCard({ snapshot }) {
      const domain = snapshot.workDomain ?? { name: '党建党务', hint: '', meetingTypes: [], materialTypes: [] }
      const [copied, setCopied] = useState('')
      async function copyMaterial(type) {
        const prompt = `请帮我写一份${type}。\n用途/对象：\n篇幅/时间要求：\n素材如下：\n`
        try {
          await navigator.clipboard.writeText(prompt)
          setCopied(type)
          setTimeout(() => setCopied(''), 3000)
        } catch {
          setCopied('复制失败')
        }
      }
      const branch = snapshot.branches?.find(item => item.id === snapshot.settings?.defaultBranchId) ?? snapshot.branches?.[0]
      const memberCount = snapshot.members?.filter(item => item.active !== false).length ?? 0
      const meetingTypes = domain.meetingTypes ?? []
      function copyMeeting(type) {
        const prompt = `请帮我写一份${type}会议记录。\n会议日期：${new Date().toISOString().slice(0, 10)}\n会议材料/要点：\n`
        navigator.clipboard.writeText(prompt).then(() => {
          setCopied(`${type}会议记录提示语`)
          setTimeout(() => setCopied(''), 3000)
        }).catch(() => setCopied('复制失败'))
      }
      return h(Card, { title: `当前工作性质：${domain.name || '党建党务'}` },
        h('div', { style: { ...ui.hint, marginBottom: 6 } }, `${domain.orgLabel || '单位'}：${branch?.name || '未配置'} · ${domain.memberLabel || '人员'} ${memberCount} 人`),
        domain.hint ? h('div', { style: { ...ui.hint, marginBottom: 8 } }, domain.hint) : null,
        meetingTypes.length > 0 ? h('div', { style: { marginBottom: 6 } },
          h('span', { style: { fontSize: 12, fontWeight: 600, marginRight: 8 } }, '会议快捷入口'),
          meetingTypes.map(type => h(Btn, { key: type, kind: 'link', onClick: () => copyMeeting(type) }, type))) : null,
        (domain.materialTypes ?? []).length > 0 ? h('div', null,
          h('div', { style: { fontSize: 12, fontWeight: 600, marginBottom: 4 } }, '材料快捷入口（点击复制提示语）'),
          h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
            domain.materialTypes.map(type => h(Btn, { key: type, kind: 'link', onClick: () => copyMaterial(type) }, type))),
          copied !== '' ? h('div', { style: { ...ui.hint, marginTop: 4, color: '#16794c' } }, `已复制：${copied}`) : null) : null)
    }

    function MeetingsPage({ snapshot, mutate, call, selectedId, setSelectedId }) {
      const configured = snapshot.branches.length > 0 && snapshot.members.length > 0
      if (!configured) {
        return h('div', { style: { maxWidth: 760 } }, h(SetupWizard, { snapshot, mutate }))
      }
      const selected = snapshot.meetings.find(meeting => meeting.id === selectedId)
      if (selected !== undefined) {
        return h(MeetingDetail, { key: selected.id, meeting: selected, snapshot, mutate, call, onBack: () => setSelectedId('') })
      }
      return h('div', { style: { maxWidth: 900, display: 'flex', flexDirection: 'column', gap: 12 } },
        h(WorkDomainCard, { snapshot }),
        h(ChatCard, { compact: false, guidance: snapshot.guidance, workDomain: snapshot.workDomain }),
        h(MeetingList, { snapshot, mutate, onOpen: setSelectedId, onCreated: setSelectedId }))
    }

    function MaterialsPage({ snapshot, mutate, call }) {
      const materials = snapshot.materials ?? []
      const [selected, setSelected] = useState(null)
      const [editing, setEditing] = useState(false)
      const [status, setStatus] = useState('')
      const [form, setForm] = useState({ title: '', kind: '', content: '', status: 'draft' })
      async function open(materialId) {
        const data = await call('materials.get', { materialId, includeMarkdown: true })
        setSelected(data)
        setForm({ title: data.title ?? '', kind: data.kind ?? '', content: data.content ?? '', status: data.status ?? 'draft' })
        setEditing(false)
        setStatus('')
      }
      async function create() {
        if (form.title.trim() === '' || form.content.trim() === '') return
        const saved = await mutate('materials.save', form)
        await open(saved.id)
      }
      async function save() {
        if (selected === null) return
        const saved = await mutate('materials.save', { ...form, id: selected.id })
        setSelected(saved)
        setForm({ title: saved.title, kind: saved.kind, content: saved.content, status: saved.status })
        setEditing(false)
        setStatus('已保存')
      }
      async function exportWord() {
        if (selected === null) return
        const result = await call('materials.export', { materialId: selected.id })
        setStatus(`已导出：${result.path}`)
      }
      async function remove() {
        if (selected === null) return
        if (!window.confirm('确定删除这篇材料？删除后不可恢复。')) return
        await mutate('materials.delete', { materialId: selected.id })
        setSelected(null)
      }
      if (selected !== null) {
        return h('div', { style: { maxWidth: 900, display: 'flex', flexDirection: 'column', gap: 12 } },
          h('div', null, h(Btn, { kind: 'link', onClick: () => setSelected(null) }, '← 返回材料列表')),
          h(Card, { title: selected.title, extra: editing ? h('div', null,
            h(Btn, { kind: 'primary', onClick: save }, '保存'),
            h(Btn, { onClick: () => { setEditing(false); setForm({ title: selected.title, kind: selected.kind, content: selected.content, status: selected.status }) } }, '取消'))
            : h('div', { style: { display: 'flex', gap: 8 } },
              h(Btn, { onClick: () => setEditing(true) }, '编辑'),
              h(Btn, { onClick: exportWord }, '导出 Word'),
              h(Btn, { kind: 'link', onClick: remove }, '删除')) },
            h('div', { style: { ...ui.hint, marginBottom: 8 } }, `${selected.kind || '材料'} · ${selected.status === 'final' ? '已定稿' : '草稿'} · ${selected.chars ?? (form.content ?? '').length} 字`),
            status !== '' ? h('div', { style: { ...ui.hint, marginBottom: 8, color: '#16794c' } }, status) : null,
            editing
              ? h('div', null,
                h(Field, { label: '标题' }, h('input', { style: ui.input, value: form.title, onChange: event => setForm({ ...form, title: event.target.value }) })),
                h(Field, { label: '类型' }, h('input', { style: ui.input, value: form.kind, onChange: event => setForm({ ...form, kind: event.target.value }) })),
                h(Field, { label: '正文 Markdown' }, h('textarea', { style: { ...ui.textarea, minHeight: 420 }, value: form.content, onChange: event => setForm({ ...form, content: event.target.value }) })),
                h(Field, { label: '状态' }, h(Select, { value: form.status, onChange: value => setForm({ ...form, status: value }), options: [{ value: 'draft', label: '草稿' }, { value: 'final', label: '定稿' }] })))
              : h('div', { style: { maxHeight: 560, overflow: 'auto' } }, renderMarkdown(form.content))))
      }
      return h('div', { style: { maxWidth: 900, display: 'flex', flexDirection: 'column', gap: 12 } },
        h(Card, { title: `材料库（${materials.length}）` },
          materials.length === 0 ? h('div', { style: ui.hint }, '还没有材料。可在对话中让助手写通知、报告、总结、方案，或手动新建。') : materials.map(material => h('div', {
            key: material.id, onClick: () => open(material.id), style: { padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,.06)', cursor: 'pointer' },
          },
            h('div', { style: { fontSize: 13, fontWeight: 600 } }, material.title),
            h('div', { style: { ...ui.hint, marginTop: 2 } }, `${material.kind || '材料'} · ${material.status === 'final' ? '已定稿' : '草稿'} · ${material.chars ?? 0} 字 · ${String(material.updatedAt ?? '').slice(0, 10)}`)))),
        h('details', { style: ui.card },
          h('summary', { style: { cursor: 'pointer', fontSize: 14, fontWeight: 600 } }, '手动新建材料'),
          h('div', { style: { marginTop: 10 } },
            h(Field, { label: '标题' }, h('input', { style: ui.input, value: form.title, onChange: event => setForm({ ...form, title: event.target.value }) })),
            h(Field, { label: '类型' }, h('input', { style: ui.input, placeholder: '如：通知/报告/总结/方案', value: form.kind, onChange: event => setForm({ ...form, kind: event.target.value }) })),
            h(Field, { label: '正文 Markdown' }, h('textarea', { style: { ...ui.textarea, minHeight: 160 }, value: form.content, onChange: event => setForm({ ...form, content: event.target.value }) })),
            h(Btn, { kind: 'primary', onClick: create }, '创建'))))
    }

    function DocPreview({ title, content, onClose, onSave, saveLabel = '保存到材料库' }) {
      const [status, setStatus] = useState('')
      async function copy() {
        try { await navigator.clipboard.writeText(content); setStatus('已复制') } catch { setStatus('复制失败') }
      }
      async function save() {
        if (onSave === undefined) return
        try {
          await onSave(content)
          setStatus(`已保存：${saveLabel}`)
        } catch (error) {
          setStatus(error instanceof Error ? error.message : String(error))
        }
      }
      return h(Card, { title, extra: h('div', { style: { display: 'flex', gap: 8 } },
        h(Btn, { onClick: copy }, '复制'),
        onSave !== undefined ? h(Btn, { kind: 'primary', onClick: save }, saveLabel) : null,
        h(Btn, { kind: 'link', onClick: onClose }, '关闭')) },
        status !== '' ? h('div', { style: { ...ui.hint, marginBottom: 6, color: '#16794c' } }, status) : null,
        h('div', { style: { maxHeight: 480, overflow: 'auto' } }, renderMarkdown(content)))
    }

    function buildDevelopmentChecklist(record) {
      const stages = ['applicant', 'activist', 'target', 'probationary', 'full']
      const stageIndex = Math.max(0, stages.indexOf(record.stage))
      const dateOf = key => record[key] ? `（${record[key]}）` : '（待核对）'
      const line = (text, key, requiredStage) => {
        const done = record[key] !== '' && record[key] !== undefined
        return `- [${done ? 'x' : ' '}] ${text}${dateOf(key)}${!done && stageIndex >= requiredStage ? ' **需补充**' : ''}`
      }
      return [
        `# ${record.name} 发展党员材料清单`,
        '',
        `当前阶段：${({ applicant: '入党申请', activist: '入党积极分子', target: '发展对象', probationary: '预备党员', full: '正式党员' })[record.stage] ?? record.stage}`,
        '',
        '## 一、申请和培养教育',
        line('入党申请书', 'appliedAt', 0),
        '- [ ] 思想汇报（每季度，按实际篇数核对）',
        line('入党积极分子推荐/推优材料', 'activistAt', 1),
        '',
        '## 二、发展对象阶段',
        '- [ ] 政治审查材料（本人及主要家庭成员）',
        '- [ ] 短期集中培训证明',
        '- [ ] 发展对象公示材料及公示结果',
        line('支部大会讨论接收预备党员票决材料', 'targetAt', 2),
        '- [ ] 上级党委审批材料',
        '',
        '## 三、预备党员和转正',
        line('预备党员考察表', 'probationaryAt', 3),
        line('转正申请书及支部大会票决材料', 'fullAt', 4),
        '- [ ] 上级党委审批转正材料',
        '',
        '## 四、归档提示',
        '- 以上清单为通用参考，具体材料名称、份数和时限以上级党委及本单位制度为准。',
        '- 日期、票数、公示期必须与原始材料核对，不能凭记忆补写。',
        record.notes ? `- 备注：${record.notes}` : '',
      ].filter(Boolean).join('\n')
    }

    function buildAnnualSummary(year, meetings, counts, months) {
      const typeLabels = ['支委会', '党员大会', '党小组会', '党课', '主题党日', '组织生活会']
      const lines = [
        `# ${year}年三会一课年度总结`,
        '',
        '## 一、基本情况',
        `${year}年共记录会议 ${meetings.length} 场。其中：` + typeLabels.map(type => `${type} ${counts[type] ?? 0} 次`).join('，') + '。',
        '',
        '## 二、主要做法',
        '- 按期召开支委会、党员大会、党小组会和党课，落实“三会一课”制度；',
        '- 围绕上级部署和支部实际开展主题党日、组织生活会和民主评议；',
        '- 做好会议记录、签到、影像和资料归档，形成可查台账。',
        '',
        '## 三、存在不足',
        '- 个别月份会议记录不够及时，资料归档需进一步规范；',
        '- 学习内容与业务工作结合还可深化，发言质量有待提高。',
        '',
        '## 四、下一步',
        '- 按年度计划落实会议频次，提前安排议题和学习材料；',
        '- 规范记录格式，会议后及时整理、审核、归档；',
        '- 结合党员教育管理、发展党员和支部重点工作，提高会议实效。',
        '',
        '## 五、月度分布',
        ...months.map(month => `- ${month.month}月：${month.list.length} 场${month.list.length === 0 ? '（本月无记录）' : ''}`),
        '',
        '> 统计口径：来自本插件会议记录，草稿也计入；具体数据请与支部会议记录本核对。',
      ]
      return lines.join('\n')
    }

    function buildElectionPackage(form, branchName) {
      const name = form.branchName || branchName || 'XX党支部'
      const term = form.term || '第X届'
      const date = form.date || '【待填写】'
      const committeeCount = form.committeeCount || '【待填写】'
      const secretaryCount = form.secretaryCount || '1'
      return [
        `# ${name}${term}换届选举材料包`,
        '',
        '> 本材料包为通用模板，具体程序、名额、票数、批复文号以上级党委批复和本单位制度为准。',
        '',
        '## 一、材料清单',
        '- [ ] 换届选举请示及上级批复',
        '- [ ] 候选人预备人选请示及批复',
        '- [ ] 选举办法（草案）',
        '- [ ] 党员大会选举主持词',
        '- [ ] 党员大会选举结果报告',
        '- [ ] 新一届支委会第一次会议主持词',
        '- [ ] 选举资料归档清单',
        '',
        `## 二、关于召开党员大会进行换届选举的请示`,
        `上级党委：`,
        `我支部${term}任期届满，拟于${date}召开党员大会进行换届选举。新一届支部委员会拟设委员${committeeCount}名，其中书记${secretaryCount}名。现将有关安排请示如下：`,
        '一、会议时间、地点；',
        '二、会议议程；',
        '三、委员名额和候选人条件；',
        '四、选举办法。',
        '妥否，请批示。',
        `${name}`,
        '【日期】',
        '',
        '## 三、候选人预备人选请示',
        '按照差额选举要求，经党员推荐、组织考察，提出候选人预备人选【姓名、名额】。现将预备人选名单及基本情况报请审批。',
        '',
        '## 四、选举办法（草案）',
        '一、根据《中国共产党章程》和有关规定制定本办法。',
        '二、本次党员大会选举产生新一届支部委员会，委员实行差额选举，书记、副书记由新一届支委会选举产生。',
        '三、参加选举的党员必须超过应到会有选举权党员人数的五分之四，方可进行选举。',
        '四、候选人按姓氏笔画排列，选举采用无记名投票方式。',
        '五、候选人获得赞成票超过实际到会有选举权人数的半数，方可当选。',
        '六、选举设监票人【姓名】、计票人【姓名】，当场公布计票结果。',
        '',
        '## 五、党员大会选举主持词（简版）',
        '同志们：现在召开党员大会，进行支部委员会换届选举。',
        '一、清点到会人数，宣布到会情况；',
        '二、通过选举办法；',
        '三、通过监票人、计票人名单；',
        '四、介绍候选人情况；',
        '五、投票选举；',
        '六、宣布选举结果；',
        '七、新一届支委会召开第一次会议，选举书记、副书记。',
        '',
        '## 六、选举结果报告',
        `${name}于${date}召开党员大会，应到党员【】名，实到【】名，符合规定人数。大会选举产生新一届支部委员会委员【】名，名单如下（按姓氏笔画）：【】。`,
        '新一届支部委员会第一次会议选举书记【】名、副书记【】名。',
        '特此报告。',
        `${name}`,
        '【日期】',
        '',
        '## 七、归档提示',
        '- 请示、批复、选举办法、主持词、选票、计票结果、结果报告一并归档；',
        '- 票数、姓名、日期、文号必须与原始材料核对。',
      ].join('\n')
    }

    function DevelopmentPanel({ snapshot, mutate }) {
      const developments = snapshot.developments ?? []
      const [form, setForm] = useState({ id: '', name: '', stage: 'applicant', date: '', notes: '' })
      const [editing, setEditing] = useState(false)
      const [preview, setPreview] = useState(null)
      const stageLabels = { applicant: '入党申请', activist: '入党积极分子', target: '发展对象', probationary: '预备党员', full: '正式党员' }
      const stageOrder = ['applicant', 'activist', 'target', 'probationary', 'full']
      const stageDateKey = { applicant: 'appliedAt', activist: 'activistAt', target: 'targetAt', probationary: 'probationaryAt', full: 'fullAt' }
      function open(record) {
        const stage = record?.stage ?? 'applicant'
        setForm({ id: record?.id ?? '', name: record?.name ?? '', stage, date: record?.[stageDateKey[stage]] ?? '', notes: record?.notes ?? '' })
        setEditing(true)
      }
      async function save() {
        if (form.name.trim() === '') return
        await mutate('developments.save', { id: form.id || undefined, name: form.name.trim(), stage: form.stage, [stageDateKey[form.stage]]: form.date, notes: form.notes })
        setForm({ id: '', name: '', stage: 'applicant', date: '', notes: '' })
        setEditing(false)
      }
      async function remove(record) {
        if (!window.confirm(`确定删除 ${record.name} 的发展党员记录？`)) return
        await mutate('developments.delete', { developmentId: record.id })
      }
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
        preview !== null ? h(DocPreview, { title: '发展党员材料清单', content: preview, onClose: () => setPreview(null), onSave: async content => {
          await mutate('materials.save', { title: `${preview.split('\n')[0].replace(/^#\s*/, '')}`, kind: '发展党员材料', content, status: 'draft' })
        } }) : null,
        h(Card, { title: `发展党员进度（${developments.length}）`, extra: h(Btn, { onClick: () => open(null) }, '新增') },
          developments.length === 0 ? h('div', { style: ui.hint }, '还没有发展党员记录。点击“新增”登记申请人及当前阶段。') : developments.map(record => {
            const stageIndex = Math.max(0, stageOrder.indexOf(record.stage))
            return h('div', { key: record.id, style: { padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,.06)' } },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                h('div', null,
                  h('strong', { style: { fontSize: 13 } }, record.name),
                  h('span', { style: { ...ui.hint, marginLeft: 8 } }, stageLabels[record.stage] ?? record.stage),
                  record[stageDateKey[record.stage]] ? h('span', { style: { ...ui.hint, marginLeft: 8 } }, record[stageDateKey[record.stage]]) : null),
                h('div', { style: { display: 'flex', gap: 8 } },
                  h(Btn, { kind: 'link', onClick: () => setPreview(buildDevelopmentChecklist(record)) }, '材料清单'),
                  h(Btn, { kind: 'link', onClick: () => open(record) }, '编辑'),
                  h(Btn, { kind: 'link', onClick: () => remove(record) }, '删除'))),
              h('div', { style: { height: 6, background: 'rgba(0,0,0,.06)', borderRadius: 3, marginTop: 6 } },
                h('div', { style: { height: 6, width: `${((stageIndex + 1) / stageOrder.length) * 100}%`, background: '#2563eb', borderRadius: 3 } })),
              record.notes ? h('div', { style: { ...ui.hint, marginTop: 4 } }, record.notes) : null)
          }),
          editing ? h('div', { style: { marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(0,0,0,.08)' } },
            h('div', { style: ui.row },
              h(Field, { label: '姓名' }, h('input', { style: ui.input, value: form.name, onChange: event => setForm({ ...form, name: event.target.value }) })),
              h(Field, { label: '当前阶段' }, h(Select, { value: form.stage, onChange: value => setForm({ ...form, stage: value, date: '' }), options: stageOrder.map(stage => ({ value: stage, label: stageLabels[stage] })) })),
              h(Field, { label: '该阶段日期' }, h('input', { type: 'date', style: ui.input, value: form.date, onChange: event => setForm({ ...form, date: event.target.value }) }))),
            h(Field, { label: '备注' }, h('textarea', { style: { ...ui.textarea, minHeight: 60 }, value: form.notes, onChange: event => setForm({ ...form, notes: event.target.value }) })),
            h(Btn, { kind: 'primary', onClick: save }, '保存'),
            h(Btn, { onClick: () => { setEditing(false); setForm({ id: '', name: '', stage: 'applicant', date: '', notes: '' }) } }, '取消')) : null))
    }

    function DuesPanel({ snapshot, mutate }) {
      const defaultMonth = new Date().toLocaleDateString('sv-SE').slice(0, 7)
      const [month, setMonth] = useState(defaultMonth)
      const [form, setForm] = useState({ id: '', name: '', month: defaultMonth, due: '', paid: '', supplement: '', note: '' })
      const dues = (snapshot.dues ?? []).filter(item => item.month === month)
      const totalDue = dues.reduce((sum, item) => sum + Number(item.due ?? 0), 0)
      const totalPaid = dues.reduce((sum, item) => sum + Number(item.paid ?? 0), 0)
      const totalSupplement = dues.reduce((sum, item) => sum + Number(item.supplement ?? 0), 0)
      async function save() {
        if (form.name.trim() === '') return
        await mutate('dues.save', { ...form, month })
        setForm({ id: '', name: '', month, due: '', paid: '', supplement: '', note: '' })
      }
      async function remove(item) {
        if (!window.confirm(`确定删除 ${item.month} ${item.name} 的党费记录？`)) return
        await mutate('dues.delete', { duesId: item.id })
      }
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
        h(Card, { title: '党费收缴台账' },
          h('div', { style: { display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 } },
            h('span', { style: ui.hint }, '月份'),
            h('input', { type: 'month', style: { ...ui.input, maxWidth: 180 }, value: month, onChange: event => setMonth(event.target.value) })),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 } },
            h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(0,0,0,.03)' } }, h('div', { style: { ...ui.hint, fontSize: 11 } }, '应收'), h('div', { style: { fontSize: 18, fontWeight: 700 } }, `¥${totalDue.toFixed(2)}`)),
            h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(0,0,0,.03)' } }, h('div', { style: { ...ui.hint, fontSize: 11 } }, '实收'), h('div', { style: { fontSize: 18, fontWeight: 700 } }, `¥${totalPaid.toFixed(2)}`)),
            h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(0,0,0,.03)' } }, h('div', { style: { ...ui.hint, fontSize: 11 } }, '补缴'), h('div', { style: { fontSize: 18, fontWeight: 700 } }, `¥${totalSupplement.toFixed(2)}`))),
          dues.length === 0 ? h('div', { style: ui.hint }, '本月还没有党费记录。') : dues.map(item => h('div', { key: item.id, style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,.06)', fontSize: 13 } },
            h('div', null, h('strong', null, item.name), h('span', { style: { ...ui.hint, marginLeft: 8 } }, `应收 ¥${Number(item.due).toFixed(2)} / 实收 ¥${Number(item.paid).toFixed(2)} / 补缴 ¥${Number(item.supplement).toFixed(2)}`), item.note ? h('span', { style: { ...ui.hint, marginLeft: 8 } }, item.note) : null),
            h('div', null,
              h(Btn, { kind: 'link', onClick: () => setForm({ id: item.id, name: item.name, month: item.month, due: String(item.due), paid: String(item.paid), supplement: String(item.supplement), note: item.note ?? '' }) }, '编辑'),
              h(Btn, { kind: 'link', onClick: () => remove(item) }, '删除'))))),
        h(Card, { title: form.id === '' ? '新增党费记录' : '编辑党费记录' },
          h('div', { style: ui.row },
            h(Field, { label: '姓名' }, h('input', { style: ui.input, value: form.name, onChange: event => setForm({ ...form, name: event.target.value }) })),
            h(Field, { label: '应收' }, h('input', { type: 'number', step: '0.01', style: ui.input, value: form.due, onChange: event => setForm({ ...form, due: event.target.value }) })),
            h(Field, { label: '实收' }, h('input', { type: 'number', step: '0.01', style: ui.input, value: form.paid, onChange: event => setForm({ ...form, paid: event.target.value }) })),
            h(Field, { label: '补缴' }, h('input', { type: 'number', step: '0.01', style: ui.input, value: form.supplement, onChange: event => setForm({ ...form, supplement: event.target.value }) }))),
          h(Field, { label: '备注' }, h('input', { style: ui.input, value: form.note, onChange: event => setForm({ ...form, note: event.target.value }) })),
          h(Btn, { kind: 'primary', onClick: save }, '保存'),
          form.id !== '' ? h(Btn, { onClick: () => setForm({ id: '', name: '', month, due: '', paid: '', supplement: '', note: '' }) }, '取消') : null))
    }

    function ElectionPanel({ snapshot, mutate }) {
      const branch = snapshot.branches?.find(item => item.id === snapshot.settings?.defaultBranchId) ?? snapshot.branches?.[0]
      const [form, setForm] = useState({ branchName: branch?.name ?? '', term: '第X届', date: '', committeeCount: '', secretaryCount: '1' })
      const [preview, setPreview] = useState(null)
      async function generate() {
        setPreview(buildElectionPackage(form, branch?.name ?? ''))
      }
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
        preview !== null ? h(DocPreview, { title: '换届选举材料包', content: preview, onClose: () => setPreview(null), onSave: async content => {
          await mutate('materials.save', { title: `${form.branchName || branch?.name || '党支部'}${form.term}换届选举材料包`, kind: '换届选举材料包', content, status: 'draft' })
        } }) : null,
        h(Card, { title: '支部换届/选举材料包' },
          h('div', { style: { ...ui.hint, marginBottom: 8 } }, '填写基本信息，生成请示、选举办法、主持词、结果报告等通用模板；具体程序以上级党委批复为准。'),
          h('div', { style: ui.row },
            h(Field, { label: '支部名称' }, h('input', { style: ui.input, value: form.branchName, onChange: event => setForm({ ...form, branchName: event.target.value }) })),
            h(Field, { label: '届次' }, h('input', { style: ui.input, placeholder: '第X届', value: form.term, onChange: event => setForm({ ...form, term: event.target.value }) })),
            h(Field, { label: '党员大会日期' }, h('input', { type: 'date', style: ui.input, value: form.date, onChange: event => setForm({ ...form, date: event.target.value }) }))),
          h('div', { style: ui.row },
            h(Field, { label: '委员名额' }, h('input', { type: 'number', style: ui.input, value: form.committeeCount, onChange: event => setForm({ ...form, committeeCount: event.target.value }) })),
            h(Field, { label: '书记名额' }, h('input', { type: 'number', style: ui.input, value: form.secretaryCount, onChange: event => setForm({ ...form, secretaryCount: event.target.value }) }))),
          h(Btn, { kind: 'primary', onClick: generate }, '生成材料包')))
    }

    function MeetingsLedger({ meetings }) {
      const years = [...new Set(meetings.map(item => String(item.meetingDate ?? '').slice(0, 4)).filter(item => /^\\d{4}$/.test(item)))].sort().reverse()
      const currentYear = years[0] ?? String(new Date().getFullYear())
      const [year, setYear] = useState(currentYear)
      const [preview, setPreview] = useState(null)
      const [saved, setSaved] = useState('')
      const yearMeetings = meetings.filter(item => String(item.meetingDate ?? '').startsWith(year))
      const types = ['支委会', '党员大会', '党小组会', '党课', '主题党日', '组织生活会']
      const targets = { 支委会: 12, 党员大会: 4, 党小组会: 12, 党课: 4, 主题党日: 12, 组织生活会: 1 }
      const counts = Object.fromEntries(types.map(type => [type, yearMeetings.filter(item => item.meetingType === type).length]))
      const months = Array.from({ length: 12 }, (_, index) => {
        const key = `${year}-${String(index + 1).padStart(2, '0')}`
        return { month: index + 1, list: yearMeetings.filter(item => String(item.meetingDate ?? '').startsWith(key)) }
      })
      async function saveSummary(content) {
        const result = await mutate('knowledge.save', { kind: 'material', title: `${year}年三会一课年度总结`, content, tags: ['三会一课', '年度总结'] })
        setSaved(result.relativePath ?? '')
      }
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
        preview !== null ? h(DocPreview, { title: `${year}年三会一课年度总结`, content: preview, onClose: () => setPreview(null), onSave: saveSummary, saveLabel: '存入知识库' }) : null,
        h(Card, { title: '三会一课年度台账' },
          h('div', { style: { display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 } },
            h('span', { style: { ...ui.hint } }, '统计年份'),
            h(Select, { value: year, onChange: setYear, options: (years.length > 0 ? years : [currentYear]).map(item => ({ value: item, label: item + ' 年' })) }),
            h(Btn, { kind: 'primary', onClick: () => setPreview(buildAnnualSummary(year, yearMeetings, counts, months)) }, '生成年度总结')),
          saved !== '' ? h('div', { style: { ...ui.hint, marginBottom: 8, color: '#16794c' } }, `已存入知识库：${saved}`) : null,
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 } },
            types.map(type => h('div', { key: type, style: { padding: 8, borderRadius: 6, background: 'rgba(0,0,0,.03)' } },
              h('div', { style: { fontSize: 12, fontWeight: 600 } }, type),
              h('div', { style: { fontSize: 18, fontWeight: 700 } }, `${counts[type]} 次`),
              h('div', { style: { ...ui.hint, fontSize: 11 } }, `参考 ${targets[type]} 次/年`)))),
          h('div', { style: { fontSize: 12, fontWeight: 600, marginBottom: 4 } }, '按月分布'),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 12 } },
            months.map(month => h('div', { key: month.month, style: { padding: 6, border: '1px solid rgba(0,0,0,.08)', borderRadius: 6, minHeight: 48 } },
              h('div', { style: { ...ui.hint, fontSize: 11 } }, `${month.month} 月`),
              month.list.length === 0 ? h('div', { style: { ...ui.hint, fontSize: 11 } }, '—') : month.list.map(item => h('div', { key: item.id, style: { fontSize: 11, marginTop: 2 } }, `${String(item.meetingDate ?? '').slice(8)} ${item.meetingType}`))))),
          h('div', { style: { ...ui.hint } }, `全年共 ${yearMeetings.length} 场会议。统计来自会议记录，草稿也计入；参考频次以本单位制度为准。`)))
    }

    function LedgerPage({ snapshot, mutate }) {
      const [tab, setTab] = useState('meetings')
      const tabs = [['meetings', '三会一课'], ['development', '发展党员'], ['dues', '党费'], ['election', '换届选举']]
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
        h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
          tabs.map(([key, label]) => h('button', { key, type: 'button', onClick: () => setTab(key),
            style: { ...ui.button(tab === key ? 'primary' : 'default'), borderRadius: 999, padding: '7px 18px' } }, label))),
        tab === 'development' ? h(DevelopmentPanel, { snapshot, mutate })
          : tab === 'dues' ? h(DuesPanel, { snapshot, mutate })
            : tab === 'election' ? h(ElectionPanel, { snapshot, mutate })
              : h(MeetingsLedger, { meetings: snapshot.meetings ?? [] }))
    }

    function TaskRow({ task, mutate }) {
      const [editing, setEditing] = useState(false)
      const [content, setContent] = useState(task.content ?? '')
      const [owner, setOwner] = useState(task.owner ?? '')
      const [dueDate, setDueDate] = useState(task.dueDate ?? '')
      async function save() {
        await mutate('tasks.update', { taskId: task.id, content, owner, dueDate })
        setEditing(false)
      }
      if (editing) {
        return h('div', { style: { padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,.06)' } },
          h(Field, { label: '任务内容' }, h('input', { style: ui.input, value: content, onChange: event => setContent(event.target.value) })),
          h('div', { style: ui.row },
            h(Field, { label: '责任人' }, h('input', { style: ui.input, value: owner, onChange: event => setOwner(event.target.value) })),
            h(Field, { label: '完成时限' }, h('input', { type: 'date', style: ui.input, value: dueDate, onChange: event => setDueDate(event.target.value) }))),
          h(Btn, { kind: 'primary', onClick: save }, '保存'),
          h(Btn, { onClick: () => setEditing(false) }, '取消'))
      }
      return h('div', { style: { padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,.06)' } },
        h('div', { style: { fontSize: 13, lineHeight: 1.6 } }, task.content),
        h('div', { style: { ...ui.hint, marginTop: 2 } },
          `${task.status === 'done' ? '已完成' : '待完成'}${task.owner ? ` · 责任人：${task.owner}` : ''}${task.dueDate ? ` · 时限：${task.dueDate}` : ''}${task.meetingDate ? ` · 来源：${task.meetingDate} 会议` : ''}`),
        h('div', null,
          h(Btn, { kind: 'link', onClick: () => setEditing(true) }, '编辑'),
          h(Btn, { kind: 'link', onClick: () => mutate('tasks.update', { taskId: task.id, status: task.status === 'done' ? 'open' : 'done' }) }, task.status === 'done' ? '重开' : '完成')))
    }

    function TasksPage({ snapshot, mutate }) {
      const [filter, setFilter] = useState('open')
      const tasks = (snapshot.tasks ?? []).filter(task => filter === 'all' || task.status === filter)
      const openCount = (snapshot.tasks ?? []).filter(task => task.status === 'open').length
      return h('div', { style: { maxWidth: 900, display: 'flex', flexDirection: 'column', gap: 12 } },
        h(Card, { title: `任务台账（待完成 ${openCount}）` },
          h('div', { style: { display: 'flex', gap: 6, marginBottom: 8 } },
            [['open', '待完成'], ['done', '已完成'], ['all', '全部']].map(([value, label]) =>
              h(Btn, { key: value, kind: filter === value ? 'primary' : 'default', onClick: () => setFilter(value) }, label))),
          tasks.length === 0
            ? h('div', { style: ui.hint }, '暂无任务。生成会议记录后，助手会把决议/分工提取到这里。')
            : tasks.map(task => h(TaskRow, { key: task.id, task, mutate }))))
    }

    // -------------------------------------------------------------- people

    function PeoplePage({ snapshot, mutate }) {
      const branches = snapshot.branches
      const [branchId, setBranchId] = useState(snapshot.settings.defaultBranchId || branches[0]?.id || '')
      const branch = branches.find(item => item.id === branchId) ?? branches[0]
      const members = snapshot.members.filter(member => member.branchId === branch?.id)
      const grouped = memberSummary(members)
      const [editingBranch, setEditingBranch] = useState(false)
      const [branchName, setBranchName] = useState(branch?.name ?? '')
      const [orgName, setOrgName] = useState(branch?.orgName ?? '')
      const [notes, setNotes] = useState(branch?.notes ?? '')
      const [name, setName] = useState('')
      const [position, setPosition] = useState('')
      const [detail, setDetail] = useState('')
      const [knowledgeStatus, setKnowledgeStatus] = useState('')
      useEffect(() => {
        setBranchName(branch?.name ?? '')
        setOrgName(branch?.orgName ?? '')
        setNotes(branch?.notes ?? '')
      }, [branch?.id])
      async function saveBranch() {
        await mutate('branch.update', { branchId: branch.id, name: branchName.trim(), orgName: orgName.trim(), notes: notes.trim() })
        setEditingBranch(false)
      }
      async function addMember() {
        if (name.trim() === '' || branch === undefined) return
        await mutate('member.create', { branchId: branch.id, name: name.trim(), position: position.trim(), detail: detail.trim() })
        setName('')
        setPosition('')
        setDetail('')
      }
      async function toggleMember(member) {
        await mutate('member.update', { memberId: member.id, active: member.active === false })
      }
      if (branches.length === 0) return h('div', { style: { maxWidth: 760 } }, h(SetupWizard, { snapshot, mutate }))
      const isParty = (snapshot.workDomain?.id ?? 'party') === 'party'
      const domain = snapshot.workDomain ?? {}
      return h('div', { style: { maxWidth: 900, display: 'flex', flexDirection: 'column', gap: 12 } },
        branches.length > 1 ? h(Field, { label: domain.orgLabel || '部门' }, h(Select, { value: branch?.id ?? '', onChange: setBranchId, options: branches.map(item => ({ value: item.id, label: item.name })) })) : null,
        h(Card, { title: domain.infoLabel || '支部信息', extra: editingBranch ? null : h('div', null,
          h(Btn, { onClick: () => setEditingBranch(true) }, '修改'),
          h(Btn, { onClick: async () => { const result = await mutate('branch.knowledge_save', { branchId: branch.id }); setKnowledgeStatus(result.relativePath) } }, '存入知识库')) },
          editingBranch
            ? h('div', null,
              h(Field, { label: domain.orgFieldLabel || '支部全称' }, h('input', { style: ui.input, value: branchName, onChange: event => setBranchName(event.target.value) })),
              h(Field, { label: '单位/上级单位' }, h('input', { style: ui.input, value: orgName, onChange: event => setOrgName(event.target.value) })),
              h(Field, { label: '补充说明' }, h('textarea', { style: { ...ui.textarea, minHeight: 60 }, value: notes, onChange: event => setNotes(event.target.value) })),
              h(Btn, { kind: 'primary', onClick: saveBranch }, '保存'),
              h(Btn, { onClick: () => setEditingBranch(false) }, '取消'))
            : h('div', null,
              h('div', { style: { fontSize: 15, fontWeight: 600 } }, branch?.name),
              h('div', { style: { ...ui.hint, marginTop: 4 } }, branch?.orgName || '未填写单位'),
              branch?.notes ? h('div', { style: { ...ui.hint, marginTop: 4 } }, branch.notes) : null,
              knowledgeStatus !== '' ? h('div', { style: { ...ui.hint, marginTop: 4, color: '#16794c' } }, `已存入：${knowledgeStatus}`) : null)),
        h(Card, { title: `${domain.memberLabel || '人员'}（${members.length}）` },
          isParty ? h('div', null,
            grouped.committee.length > 0 ? h('div', { style: { marginBottom: 8 } },
              h('div', { style: { fontSize: 13, fontWeight: 600, marginBottom: 4 } }, '支部委员'),
              grouped.committee.map(member => h(MemberRow, { key: member.id, member, mutate, onToggle: toggleMember }))) : null,
            grouped.partyMembers.length > 0 ? h('div', null,
              h('div', { style: { fontSize: 13, fontWeight: 600, marginBottom: 4 } }, '党员'),
              grouped.partyMembers.map(member => h(MemberRow, { key: member.id, member, mutate, onToggle: toggleMember }))) : null)
            : members.map(member => h(MemberRow, { key: member.id, member, mutate, onToggle: toggleMember })),
          h('details', { style: { marginTop: 10 } },
            h('summary', { style: { ...ui.hint, cursor: 'pointer' } }, '添加'),
            h('div', { style: { marginTop: 8 } },
              h(Field, { label: '姓名' }, h('input', { style: ui.input, value: name, onChange: event => setName(event.target.value) })),
              h(Field, { label: '职务' }, h('input', { style: ui.input, placeholder: '如：科长/主任/工作人员', value: position, onChange: event => setPosition(event.target.value) })),
              h(Field, { label: '补充说明' }, h('input', { style: ui.input, placeholder: '如：负责综合协调、文秘', value: detail, onChange: event => setDetail(event.target.value) })),
              h(Btn, { kind: 'primary', onClick: addMember }, '添加')))))
    }

    function MemberRow({ member, mutate, onToggle }) {
      const [editing, setEditing] = useState(false)
      const [name, setName] = useState(member.name ?? '')
      const [position, setPosition] = useState(member.position ?? '')
      const [detail, setDetail] = useState(member.detail ?? '')
      async function save() {
        if (name.trim() === '') return
        await mutate('member.update', { memberId: member.id, name: name.trim(), position: position.trim(), detail: detail.trim() })
        setEditing(false)
      }
      if (editing) {
        return h('div', { style: { padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,.06)' } },
          h('div', { style: ui.row },
            h(Field, { label: '姓名' }, h('input', { style: ui.input, value: name, onChange: event => setName(event.target.value) })),
            h(Field, { label: '职务' }, h('input', { style: ui.input, value: position, onChange: event => setPosition(event.target.value) })),
            h(Field, { label: '补充说明' }, h('input', { style: ui.input, value: detail, onChange: event => setDetail(event.target.value) }))),
          h(Btn, { kind: 'primary', onClick: save }, '保存'),
          h(Btn, { onClick: () => setEditing(false) }, '取消'))
      }
      return h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', fontSize: 13 } },
        h('span', null, member.name, member.position ? `（${member.position}）` : '', member.detail ? `　${member.detail}` : ''),
        h('div', null,
          h(Btn, { kind: 'link', onClick: () => setEditing(true) }, '编辑'),
          h(Btn, { kind: 'link', onClick: () => onToggle(member) }, member.active === false ? '恢复' : '停用')))
    }

    // ------------------------------------------------------------ settings

    function buildNoteTree(notes) {
      const root = { folders: {}, files: [] }
      for (const note of notes) {
        if (note.kind === 'index') continue
        const segments = String(note.relativePath ?? '').split('/').filter(Boolean)
        if (segments.length === 0) continue
        let node = root
        for (const segment of segments.slice(0, -1)) {
          node.folders[segment] = node.folders[segment] ?? { folders: {}, files: [] }
          node = node.folders[segment]
        }
        node.files.push({ ...note, fileName: segments[segments.length - 1] })
      }
      return root
    }

    function filterNoteTree(node, query) {
      const keyword = String(query ?? '').trim().toLowerCase()
      if (keyword === '') return node
      const folders = {}
      for (const [name, child] of Object.entries(node.folders)) {
        const filtered = filterNoteTree(child, keyword)
        if (Object.keys(filtered.folders).length > 0 || filtered.files.length > 0 || name.toLowerCase().includes(keyword)) folders[name] = filtered
      }
      const files = node.files.filter(note => `${note.title} ${note.relativePath} ${note.kind}`.toLowerCase().includes(keyword))
      return { folders, files }
    }

    function NoteTree({ node, path, expanded, setExpanded, onOpen }) {
      const folderEntries = Object.entries(node.folders).sort(([a], [b]) => a.localeCompare(b, 'zh'))
      const files = [...node.files].sort((a, b) => String(b.date).localeCompare(String(a.date)))
      return h('div', { style: { fontSize: 13 } },
        folderEntries.map(([name, child]) => {
          const key = path === '' ? name : `${path}/${name}`
          const open = expanded[key] !== false
          return h('div', { key },
            h('div', {
              onClick: () => setExpanded({ ...expanded, [key]: !open }),
              style: { cursor: 'pointer', padding: '4px 2px', fontWeight: 600, color: 'var(--dsw-alias-text-primary, #1f2329)' },
            }, open ? '▾ ' : '▸ ', name),
            open ? h('div', { style: { marginLeft: 14 } }, h(NoteTree, { node: child, path: key, expanded, setExpanded, onOpen })) : null)
        }),
        files.map(note => h('div', {
          key: note.relativePath,
          onClick: () => onOpen(note),
          style: { cursor: 'pointer', padding: '3px 2px 3px 6px', color: 'var(--dsw-alias-text-secondary, #4b5563)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
          title: note.relativePath,
        }, note.title)))
    }

    function KnowledgePage({ snapshot, mutate, call, onOpenSettings }) {
      const knowledge = snapshot.knowledge ?? {}
      const [filter, setFilter] = useState('')
      const [expanded, setExpanded] = useState({})
      const [selected, setSelected] = useState(null)
      const [content, setContent] = useState('')
      const [editing, setEditing] = useState(false)
      const [editContent, setEditContent] = useState('')
      const [status, setStatus] = useState('')
      const [importing, setImporting] = useState(false)
      const [repairing, setRepairing] = useState(false)
      const [renderMarkdownEnabled, setRenderMarkdownEnabled] = useState(() => {
        try { return localStorage.getItem('meetrecord.kbRender') !== 'false' } catch { return true }
      })
      function changeRender(next) {
        setRenderMarkdownEnabled(next)
        try { localStorage.setItem('meetrecord.kbRender', String(next)) } catch { /* ignore */ }
      }
      async function openNote(note) {
        setSelected(note)
        setEditing(false)
        const result = await call('knowledge.read', { path: note.relativePath })
        setContent(result.content)
        setEditContent(stripFrontmatter(result.content))
      }
      async function saveEdit() {
        await call('knowledge.update', { path: selected.relativePath, content: editContent })
        const fresh = await call('knowledge.read', { path: selected.relativePath })
        setContent(fresh.content)
        setEditContent(stripFrontmatter(fresh.content))
        await mutate('state.get', {})
        setEditing(false)
        setStatus('已保存修改')
      }
      async function deleteNote() {
        if (!window.confirm('确定删除这篇笔记？删除后不可恢复。')) return
        await call('knowledge.delete', { path: selected.relativePath })
        await mutate('state.get', {})
        setSelected(null)
        setContent('')
        setStatus('已删除笔记')
      }
      async function importFiles(event) {
        const files = Array.from(event.target.files ?? [])
        event.target.value = ''
        if (files.length === 0) return
        setImporting(true)
        try {
          const payload = []
          for (const file of files) payload.push({ name: file.name, dataBase64: await readFileAsBase64(file) })
          const result = await call('knowledge.import', { files: payload })
          await mutate('state.get', {})
          setStatus(`已导入 ${result.count} 个文件`)
        } finally {
          setImporting(false)
        }
      }
      async function repair(includeHistory = false) {
        if (includeHistory && !window.confirm('将尝试恢复支部信息、已保存会议记录和历史材料笔记，可能产生重复。是否继续？')) return
        setRepairing(true)
        try {
          const result = await call('knowledge.repair', { includeHistory })
          await mutate('state.get', {})
          if (includeHistory) {
            setStatus(`已恢复：规范 ${result.seed?.installed ?? 0} 篇，支部 ${result.branches?.length ?? 0} 条、会议记录 ${result.records?.length ?? 0} 条、备份笔记 ${result.restored?.length ?? 0} 条`)
          } else {
            setStatus(`已补必要文件：规范 ${result.seed?.installed ?? 0} 篇；未恢复历史数据`)
          }
        } finally {
          setRepairing(false)
        }
      }
      async function organize() {
        const result = await call('knowledge.organize', { force: true })
        await mutate('state.get', {})
        setStatus(`已整理：${result.indexPath}（共 ${result.total} 条）`)
      }
      if (knowledge.configured !== true) {
        return h(Card, { title: '知识库' },
          h('div', { style: { ...ui.hint, marginBottom: 8 } }, '尚未配置 Obsidian 知识库位置。'),
          h(Btn, { kind: 'primary', onClick: onOpenSettings }, '去设置'))
      }
      const notes = (knowledge.notes ?? []).filter(item => item.kind !== 'index')
      const kindLabels = { ...KNOWLEDGE_KIND_LABELS, branch: snapshot.workDomain?.infoLabel || '单位信息' }
      const stats = knowledge.stats ?? {}
      const total = knowledge.total ?? notes.length
      const tree = filterNoteTree(buildNoteTree(notes), filter)
      return h('div', { style: { maxWidth: 1150, display: 'flex', flexDirection: 'column', gap: 12 } },
        h(Card, { title: `知识库（${total} 条）`, extra: h('div', { style: { display: 'flex', gap: 8 } },
          h('label', { style: { ...ui.button('default'), display: 'inline-block' } },
            importing ? '导入中…' : '导入材料',
            h('input', { type: 'file', accept: '.md,.txt,.docx', multiple: true, onChange: importFiles, style: { display: 'none' } })),
          h(Btn, { onClick: () => repair(false), disabled: repairing }, repairing ? '检查中…' : '补必要文件'),
          h(Btn, { kind: 'link', onClick: () => repair(true), disabled: repairing }, '恢复历史数据'),
          h(Btn, { onClick: organize }, '整理知识库')) },
          h('div', { style: { display: 'flex', gap: 16, flexWrap: 'wrap' } },
            Object.entries(kindLabels).filter(([kind]) => kind !== 'index').map(([kind, label]) =>
              h('div', { key: kind, style: { fontSize: 12, color: 'var(--dsw-alias-text-secondary, #646a73)' } }, `${label} ${stats[kind] ?? 0}`))),
          status !== '' ? h('div', { style: { ...ui.hint, marginTop: 8, color: '#16794c' } }, status) : null),
        h('div', { style: { display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' } },
          h('div', { style: { width: 300, flex: '0 0 300px', minWidth: 240 } },
            h(Card, { title: '目录' },
              h('input', {
                style: { ...ui.input, marginBottom: 8 },
                placeholder: '筛选笔记（标题/目录）',
                value: filter,
                onChange: event => setFilter(event.target.value),
              }),
              notes.length === 0 ? h('div', { style: ui.hint }, '还没有笔记。') : h(NoteTree, { node: tree, path: '', expanded, setExpanded, onOpen: openNote }))),
          h('div', { style: { flex: 1, minWidth: 300 } },
            h(Card, {
              title: selected === null ? '预览' : selected.title,
              extra: selected === null ? null : h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                editing
                  ? h('div', null,
                    h(Btn, { kind: 'primary', onClick: saveEdit }, '保存'),
                    h(Btn, { onClick: () => setEditing(false) }, '取消'))
                  : h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                    h(RenderCheckbox, { checked: renderMarkdownEnabled, onChange: changeRender }),
                    h(Btn, { kind: 'link', onClick: () => setEditing(true) }, '编辑'),
                    h(Btn, { kind: 'link', onClick: deleteNote }, '删除'))),
            },
              selected === null
                ? h('div', { style: ui.hint }, '点击左侧笔记预览。')
                : h('div', null,
                  h('div', { style: { ...ui.hint, marginBottom: 8 } }, `${kindLabels[selected.kind] ?? ''} · ${String(selected.date ?? '').slice(0, 10)} · ${selected.relativePath}`),
                  editing
                    ? h('textarea', { style: { ...ui.textarea, minHeight: 420 }, value: editContent, onChange: event => setEditContent(event.target.value) })
                    : h('div', { style: { maxHeight: 540, overflow: 'auto' } },
                      renderMarkdownEnabled === false
                        ? h('pre', { style: { whiteSpace: 'pre-wrap', fontSize: 12, lineHeight: 1.7, margin: 0 } }, content)
                        : renderMarkdown(stripFrontmatter(content))))))))
    }

    function SettingsPage({ snapshot, mutate, call }) {
      const [workDomain, setWorkDomain] = useState(snapshot.settings.workDomain || snapshot.workDomain?.id || 'party')
      const [workDomainSaved, setWorkDomainSaved] = useState('')
      const [recordLength, setRecordLength] = useState(snapshot.settings.recordLength ?? 'short')
      const [vaultPath, setVaultPath] = useState(snapshot.settings.vaultPath ?? '')
      const [knowledgeFolder, setKnowledgeFolder] = useState(snapshot.settings.knowledgeFolder ?? '工作资料')
      const [skillState, setSkillState] = useState(snapshot.skill)
      const [query, setQuery] = useState('')
      const [notes, setNotes] = useState(null)
      const [note, setNote] = useState(null)
      const [profileLevel, setProfileLevel] = useState(snapshot.profile?.level ?? '')
      const [profileRole, setProfileRole] = useState(snapshot.profile?.role ?? '')
      const [profilePurpose, setProfilePurpose] = useState(snapshot.profile?.purpose ?? '')
      const [profileSaved, setProfileSaved] = useState('')
      const [styleNotes, setStyleNotes] = useState(snapshot.profile?.styleNotes ?? '')
      const [seedStatus, setSeedStatus] = useState('')
      const [deletePhase, setDeletePhase] = useState('idle')
      const [deleteToken, setDeleteToken] = useState('')
      const [deleteSeconds, setDeleteSeconds] = useState(0)
      async function saveLength() { await mutate('settings.update', { recordLength }) }
      async function saveWorkDomain() { await mutate('settings.update', { workDomain }); setWorkDomainSaved('已保存'); setTimeout(() => setWorkDomainSaved(''), 3000) }
      async function saveProfile() {
        await mutate('profile.update', { level: profileLevel, role: workDomain === 'party' ? profileRole : '', purpose: profilePurpose, styleNotes })
        setProfileSaved('已保存')
        setTimeout(() => setProfileSaved(''), 3000)
      }
      async function saveVault() { await mutate('settings.update', { vaultPath, knowledgeFolder }) }
      async function installSkill() { setSkillState(await call('skill.install', {})) }
      useEffect(() => {
        if (deletePhase !== 'waiting') return undefined
        if (deleteSeconds <= 0) { setDeletePhase('ready'); return undefined }
        const timer = setTimeout(() => setDeleteSeconds(value => value - 1), 1000)
        return () => clearTimeout(timer)
      }, [deletePhase, deleteSeconds])
      async function beginDelete() {
        const challenge = await call('data.delete.request', {})
        setDeleteToken(challenge.token)
        setDeleteSeconds(challenge.waitSeconds ?? 15)
        setDeletePhase('waiting')
      }
      async function confirmDelete() {
        await call('data.delete.confirm', { token: deleteToken })
        await mutate('state.get', {})
        setDeletePhase('done')
        setDeleteToken('')
      }
      function cancelDelete() {
        setDeletePhase('idle')
        setDeleteToken('')
        setDeleteSeconds(0)
      }
      async function searchNotes() {
        const data = await call('knowledge.search', { query, limit: 20 })
        setNotes(data.matches)
      }
      async function openNote(path) { setNote(await call('knowledge.read', { path })) }
      const lengthOptions = [
        { value: 'short', label: '短', hint: '约 600–1000 字，适合手抄' },
        { value: 'medium', label: '中', hint: '约 1000–1600 字' },
        { value: 'long', label: '长', hint: '约 1600–2600 字' },
      ]
      return h('div', { style: { maxWidth: 900, display: 'flex', flexDirection: 'column', gap: 12 } },
        h(Card, { title: '工作性质', extra: workDomainSaved !== '' ? h('span', { style: ui.hint }, workDomainSaved) : null },
          h('div', { style: { ...ui.hint, marginBottom: 8 } }, '不同工作性质的会议类型、材料类型和默认模板不同。'),
          h(Field, { label: '主要从事' }, h(Select, {
            value: workDomain, onChange: setWorkDomain,
            options: (snapshot.workDomains ?? [{ id: 'party', name: '党建党务' }]).map(item => ({ value: item.id, label: item.name })),
          })),
          h(Btn, { kind: 'primary', onClick: saveWorkDomain }, '保存')),
        h(Card, { title: '记录长度' },
          h('div', { style: { ...ui.hint, marginBottom: 8 } }, '按手抄需要选择。'),
          h('div', { style: { display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 10 } },
            lengthOptions.map(option => h('label', { key: option.value, style: { display: 'flex', gap: 6, alignItems: 'flex-start', fontSize: 13, cursor: 'pointer' } },
              h('input', { type: 'radio', name: 'recordLength', checked: recordLength === option.value, onChange: () => setRecordLength(option.value) }),
              h('span', null, h('strong', null, option.label), h('span', { style: { ...ui.hint, display: 'block' } }, option.hint))))),
          h(Btn, { kind: 'primary', onClick: saveLength }, '保存')),
        h(Card, { title: 'Obsidian 知识库' },
          h('div', { style: { ...ui.hint, marginBottom: 8 } }, `不填则使用：${defaultVaultFor(workDomain)}`),
          h('div', { style: { ...ui.hint, marginBottom: 8 } }, `Word 导出默认目录：知识库/${knowledgeFolder || '工作资料'}/Word导出`),
          h(Field, { label: '知识库文件夹' }, h('input', { style: ui.input, placeholder: `默认：${defaultVaultFor(workDomain)}`, value: vaultPath, onChange: event => setVaultPath(event.target.value) })),
          h(Field, { label: '子文件夹' }, h('input', { style: ui.input, value: knowledgeFolder, onChange: event => setKnowledgeFolder(event.target.value) })),
          h(Btn, { kind: 'primary', onClick: saveVault }, '保存'),
          h('details', { style: { marginTop: 10 } },
            h('summary', { style: { ...ui.hint, cursor: 'pointer' } }, '查看知识库笔记'),
            h('div', { style: { display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'flex-end' } },
              h('input', { style: { ...ui.input, flex: 1, minWidth: 200 }, placeholder: '检索关键词', value: query, onChange: event => setQuery(event.target.value) }),
              h(Btn, { onClick: searchNotes }, '检索')),
            notes !== null ? h('div', { style: { marginTop: 8 } },
              notes.length === 0 ? h('div', { style: ui.hint }, '无结果。') : notes.map(item => h('div', { key: item.relativePath, style: { padding: '5px 0', fontSize: 13 } },
                h('span', { style: { cursor: 'pointer', color: 'var(--dsw-alias-accent, #2563eb)' }, onClick: () => openNote(item.relativePath) }, item.title),
                h('span', { style: { ...ui.hint, marginLeft: 8 } }, item.date ?? '')))) : null,
            note !== null ? h('pre', { style: { whiteSpace: 'pre-wrap', fontSize: 12, lineHeight: 1.6, maxHeight: 300, overflow: 'auto', marginTop: 8 } }, note.content) : null)),
        h('details', { style: ui.card },
          h('summary', { style: { cursor: 'pointer', fontSize: 14, fontWeight: 600 } }, '高级信息'),
          h('div', { style: { marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 } },
            h('div', null,
              h('div', { style: ui.cardTitle }, '内置规范种子包'),
              h('div', { style: { ...ui.hint, marginBottom: 6 } }, '会议程序、发展党员、选举、记录格式、质量清单等通用规范，可写入知识库“规范制度”目录。'),
              h(Btn, { onClick: async () => {
                const result = await call('knowledge.seed_install', {})
                await mutate('state.get', {})
                setSeedStatus(`已安装 ${result.installed} 篇，跳过 ${result.skipped} 篇`)
              } }, '安装 / 更新规范种子包'),
              seedStatus !== '' ? h('div', { style: { ...ui.hint, marginTop: 6, color: '#16794c' } }, seedStatus) : null),
            h('div', null,
              h('div', { style: ui.cardTitle }, '使用画像'),
              h('div', { style: { ...ui.hint, marginBottom: 6 } }, '用于调整指导方式；可不填。'),
              h('div', { style: ui.row },
                workDomain === 'party' ? h(Field, { label: '角色' }, h(Select, { value: profileRole, onChange: setProfileRole, options: [{ value: '', label: '未设置' }, { value: 'secretary', label: '支部书记' }, { value: 'organizer', label: '组织委员' }, { value: 'committee', label: '其他支委' }, { value: 'member', label: '普通党员' }, { value: 'other', label: '其他' }] })) : null,
                h(Field, { label: '熟练度' }, h(Select, { value: profileLevel, onChange: setProfileLevel, options: [{ value: '', label: '未设置' }, { value: 'novice', label: '不熟' }, { value: 'regular', label: '一般' }, { value: 'expert', label: '熟练' }] })),
                h(Field, { label: '记录用途' }, h(Select, { value: profilePurpose, onChange: setProfilePurpose, options: [{ value: '', label: '未设置' }, { value: 'handwrite', label: '手抄记录本' }, { value: 'archive', label: '电子归档' }, { value: 'report', label: '上报材料' }] }))),
              h(Field, { label: '写作偏好（可不填）' }, h('textarea', { style: { ...ui.textarea, minHeight: 60 }, placeholder: '例如：称“同志们”；少用长句；决议要写责任人', value: styleNotes, onChange: event => setStyleNotes(event.target.value) })),
              h(Btn, { onClick: saveProfile }, '保存画像'),
              profileSaved !== '' ? h('span', { style: { ...ui.hint, marginLeft: 8, color: '#16794c' } }, profileSaved) : null),
            h('div', null,
              h('div', { style: ui.cardTitle }, '对话生成'),
              h('div', { style: { ...ui.hint, marginBottom: 6 } }, skillState?.installed ? '已开启。' : '未开启。'),
              h(Btn, { onClick: installSkill }, '修复对话生成')),
            h('div', null,
              h('div', { style: ui.cardTitle }, '会议模板与专项流程'),
              snapshot.templates.map(template => h('div', { key: template.id, style: { ...ui.hint, padding: '2px 0' } },
                `${template.name}${template.kind === 'procedure' ? '（专项流程）' : ''}：${template.description}`))),
            h('div', null,
              h('div', { style: ui.cardTitle }, '数据与权限'),
              h('div', { style: ui.hint }, '数据保存在本机 $DSH_HOME/meetrecord/ 下，不上传。'),
              h('div', { style: { ...ui.hint, marginTop: 4 } }, '助手默认只读/写入；删除单个知识库笔记或 Word 导出文件需用户明确确认，不支持批量删除。')),
            h('div', { style: { marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(192,57,43,.2)' } },
              h('div', { style: { ...ui.cardTitle, color: '#c0392b' } }, '删除数据'),
              h('div', { style: { ...ui.hint, marginBottom: 8 } }, '清空单位、人员和会议记录。不会删除 Obsidian 笔记与导入/导出文件。'),
              deletePhase === 'idle' ? h(Btn, { kind: 'danger', onClick: beginDelete }, '删除数据') : null,
              deletePhase === 'waiting' ? h('div', null,
                h('div', { style: { ...ui.hint, marginBottom: 8 } }, `请等待 ${deleteSeconds} 秒后确认删除…`),
                h(Btn, { kind: 'danger', disabled: true }, `等待中（${deleteSeconds}）`),
                h(Btn, { onClick: cancelDelete }, '取消')) : null,
              deletePhase === 'ready' ? h('div', null,
                h('div', { style: { ...ui.hint, marginBottom: 8 } }, '等待时间已到，确认删除？'),
                h(Btn, { kind: 'danger', onClick: confirmDelete }, '确认删除'),
                h(Btn, { onClick: cancelDelete }, '取消')) : null,
              deletePhase === 'done' ? h('div', { style: { ...ui.hint, color: '#16794c' } }, '已清空。') : null))))
    }

    // ----------------------------------------------------------------- app

    function App() {
      const [snapshot, setSnapshot] = useState(null)
      const [error, setError] = useState('')
      const [notice, setNotice] = useState('')
      const [view, setView] = useState('meetings')
      const [selectedId, setSelectedId] = useState('')
      const [busy, setBusy] = useState(false)

      const refresh = useCallback(async () => {
        try {
          const data = await apiGet()
          setSnapshot(data)
          setError('')
          setSelectedId(current => (data.meetings.some(meeting => meeting.id === current) ? current : ''))
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : String(cause))
        }
      }, [])

      useEffect(() => { refresh() }, [refresh])

      const call = useCallback(async (action, actionPayload) => {
        setBusy(true)
        setNotice('')
        try {
          return await apiAction(action, actionPayload)
        } catch (cause) {
          setNotice(cause instanceof Error ? cause.message : String(cause))
          throw cause
        } finally {
          setBusy(false)
        }
      }, [])

      const mutate = useCallback(async (action, actionPayload) => {
        const data = await call(action, actionPayload)
        await refresh()
        return data
      }, [call, refresh])

      if (snapshot === null) {
        return h('div', { style: { padding: 24, fontSize: 13 } }, error !== '' ? `加载失败：${error}` : '正在加载…')
      }

      const navItems = (snapshot.workDomain?.id ?? 'party') === 'party'
        ? [NAV[0], ['ledger', '党务台账'], ...NAV.slice(1)]
        : NAV
      let content
      if (view === 'ledger') content = h(LedgerPage, { snapshot, mutate })
      else if (view === 'meetings') content = h(MeetingsPage, { snapshot, mutate, call, selectedId, setSelectedId })
      else if (view === 'materials') content = h(MaterialsPage, { snapshot, mutate, call })
      else if (view === 'tasks') content = h(TasksPage, { snapshot, mutate })
      else if (view === 'people') content = h(PeoplePage, { snapshot, mutate })
      else if (view === 'knowledge') content = h(KnowledgePage, { snapshot, mutate, call, onOpenSettings: () => setView('settings') })
      else content = h(SettingsPage, { snapshot, mutate, call })

      return h('div', { style: { padding: 18, height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0, boxSizing: 'border-box' } },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 } },
          h('div', null,
            h('div', { style: { fontSize: 18, fontWeight: 700 } }, '党务工作助手')),
          h('div', null, h(Btn, { onClick: refresh }, '刷新'), busy ? h('span', { style: ui.hint }, '处理中…') : null)),
        h('div', { style: { display: 'flex', gap: 6, marginBottom: 12 } },
          navItems.map(([key, label]) => h('button', {
            key, type: 'button', onClick: () => setView(key),
            style: { ...ui.button(view === key ? 'primary' : 'default'), marginRight: 0, borderRadius: 999, padding: '7px 20px' },
          }, label))),
        notice !== '' ? h('div', { style: { padding: '6px 10px', background: 'rgba(192,57,43,.08)', color: '#c0392b', borderRadius: 6, fontSize: 12, marginBottom: 10 } }, notice) : null,
        error !== '' ? h('div', { style: { padding: '6px 10px', background: 'rgba(192,57,43,.08)', color: '#c0392b', borderRadius: 6, fontSize: 12, marginBottom: 10 } }, error) : null,
        h('div', { style: { flex: 1, minHeight: 0, overflow: 'auto' } }, content))
    }

    // ----------------------------------------------------------------- entry

    function PanelIcon({ size }) {
      const edge = typeof size === 'number' ? size : 16
      return h('svg', {
        viewBox: '0 0 16 16', width: edge, height: edge, fill: 'none', stroke: 'currentColor',
        strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
      },
        h('rect', { x: 2, y: 2.5, width: 12, height: 11, rx: 1.5 }),
        h('path', { d: 'M4.5 6h7M4.5 9h7M4.5 11.5h4' }))
    }

    function Page() {
      return h('div', { style: { height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 } }, h(App))
    }

    return {
      inject: ['slots'],
      __test: {
        App, MeetingsPage, MeetingDetail, MeetingList, NewMeetingForm, SetupWizard,
        PeoplePage, TasksPage, MaterialsPage, LedgerPage, DevelopmentPanel, DuesPanel, ElectionPanel, MeetingsLedger, KnowledgePage, SettingsPage, ChatCard, WorkDomainCard, MemberRow, Card, Field, Btn, Select, renderMarkdown,
      },
      apply(ctx) {
        const register = () => {
          const disposers = []
          disposers.push(ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
            name: 'sidebar.panellist', id: PANEL_ID, order: 30, label: () => '会议记录',
          }, PanelIcon)))
          disposers.push(ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: PANEL_ID }, Page)))
          return () => {
            for (const dispose of disposers.splice(0)) dispose()
          }
        }
        if (typeof ctx.effect === 'function') ctx.effect(register, 'meetrecord-panel')
        else register()
        try {
          fetch('api/meetrecord/client-loaded', {
            method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ href: String(window.location?.href ?? ''), seats: ['sidebar.panellist', 'main'] }),
          }).catch(() => {})
        } catch {
          // A missing beacon never breaks the panel.
        }
      },
    }
  },
})
