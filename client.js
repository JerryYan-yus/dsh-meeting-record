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
      ['tasks', '任务'],
      ['people', '人员'],
      ['knowledge', '知识库'],
      ['settings', '设置'],
    ]
    const KNOWLEDGE_KIND_LABELS = { branch: '支部信息', record: '会议记录', reference: '检索资料', material: '支部材料', daily: '日常工作', spec: '规范制度', index: '索引' }
    const DEFAULT_VAULT = '~/Documents/党建会议记录知识库'

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

    function SetupWizard({ mutate }) {
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
        if (branchName.trim() === '' || busy) return
        setBusy(true)
        try {
          await mutate('org.setup', {
            branchName: branchName.trim(),
            orgName: orgName.trim(),
            notes: notes.trim(),
            vaultPath: vaultPath.trim(),
            members: parseMemberLines(membersText),
            profile: { level: profileLevel, role: profileRole, purpose: profilePurpose },
            makeDefault: true,
          })
        } finally {
          setBusy(false)
        }
      }
      return h(Card, { title: '首次配置' },
        h('div', { style: { ...ui.hint, marginBottom: 12 } }, '填写一次，长期有效。'),
        h(Field, { label: '支部全称' },
          h('input', { style: ui.input, placeholder: '例如：XX党支部', value: branchName, onChange: event => setBranchName(event.target.value) })),
        h(Field, { label: '单位名称' },
          h('input', { style: ui.input, placeholder: '例如：XX学院/单位', value: orgName, onChange: event => setOrgName(event.target.value) })),
        h(Field, { label: '支部补充说明' },
          h('textarea', { style: { ...ui.textarea, minHeight: 60 }, placeholder: '例如：支部共有党员12名，设3个党小组', value: notes, onChange: event => setNotes(event.target.value) })),
        h(Field, { label: 'Obsidian 知识库位置' },
          h('input', { style: ui.input, placeholder: `默认：${DEFAULT_VAULT}`, value: vaultPath, onChange: event => setVaultPath(event.target.value) })),
        h('div', { style: ui.row },
          h(Field, { label: '我的角色（可不填）' }, h(Select, {
            value: profileRole, onChange: setProfileRole,
            options: [{ value: '', label: '不填' }, { value: 'secretary', label: '支部书记' }, { value: 'organizer', label: '组织委员' }, { value: 'committee', label: '其他支委' }, { value: 'member', label: '普通党员' }, { value: 'other', label: '其他' }],
          })),
          h(Field, { label: '电脑熟练度（可不填）' }, h(Select, {
            value: profileLevel, onChange: setProfileLevel,
            options: [{ value: '', label: '不填' }, { value: 'novice', label: '不熟' }, { value: 'regular', label: '一般' }, { value: 'expert', label: '熟练' }],
          })),
          h(Field, { label: '记录用途（可不填）' }, h(Select, {
            value: profilePurpose, onChange: setProfilePurpose,
            options: [{ value: '', label: '不填' }, { value: 'handwrite', label: '手抄记录本' }, { value: 'archive', label: '电子归档' }, { value: 'report', label: '上报材料' }],
          }))),
        h(Field, { label: '人员名单' },
          h('textarea', {
            style: { ...ui.textarea, minHeight: 110 },
            placeholder: '张三 支部书记 负责支部全面工作\n李四 组织委员 负责组织、党员发展\n王五 宣传委员 负责宣传、学习',
            value: membersText,
            onChange: event => setMembersText(event.target.value),
          })),
        h(Btn, { kind: 'primary', onClick: save, disabled: busy || branchName.trim() === '' }, busy ? '保存中…' : '保存'),
        h('div', { style: { ...ui.hint, marginTop: 8 } }, '保存后，在对话中说：帮我写一份会议记录。'))
    }

    function memberSummary(members) {
      const committee = members.filter(committeeMember)
      const partyMembers = members.filter(member => !committeeMember(member))
      return { committee, partyMembers }
    }

    function ChatCard({ compact, guidance }) {
      const [copied, setCopied] = useState('')
      const starter = '帮我写一份会议记录。\n会议类型：支委会\n会议日期：' + new Date().toISOString().slice(0, 10) + '\n材料如下：\n（把会议材料粘贴在这里，或写工作区里的文件路径）'
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
      const meetingTemplates = snapshot.templates.filter(template => template.kind === 'meeting')
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
          h(Btn, { onClick: generatePrep }, '会前材料')),
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

    function MeetingsPage({ snapshot, mutate, call, selectedId, setSelectedId }) {
      const configured = snapshot.branches.length > 0 && snapshot.members.length > 0
      if (!configured) {
        return h('div', { style: { maxWidth: 760 } }, h(SetupWizard, { mutate }))
      }
      const selected = snapshot.meetings.find(meeting => meeting.id === selectedId)
      if (selected !== undefined) {
        return h(MeetingDetail, { key: selected.id, meeting: selected, snapshot, mutate, call, onBack: () => setSelectedId('') })
      }
      return h('div', { style: { maxWidth: 900, display: 'flex', flexDirection: 'column', gap: 12 } },
        h(ChatCard, { compact: false, guidance: snapshot.guidance }),
        h(MeetingList, { snapshot, mutate, onOpen: setSelectedId, onCreated: setSelectedId }))
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
      if (branches.length === 0) return h('div', { style: { maxWidth: 760 } }, h(SetupWizard, { mutate }))
      return h('div', { style: { maxWidth: 900, display: 'flex', flexDirection: 'column', gap: 12 } },
        branches.length > 1 ? h(Field, { label: '支部' }, h(Select, { value: branch?.id ?? '', onChange: setBranchId, options: branches.map(item => ({ value: item.id, label: item.name })) })) : null,
        h(Card, { title: '支部信息', extra: editingBranch ? null : h('div', null,
          h(Btn, { onClick: () => setEditingBranch(true) }, '修改'),
          h(Btn, { onClick: async () => { const result = await mutate('branch.knowledge_save', { branchId: branch.id }); setKnowledgeStatus(result.relativePath) } }, '存入知识库')) },
          editingBranch
            ? h('div', null,
              h(Field, { label: '支部全称' }, h('input', { style: ui.input, value: branchName, onChange: event => setBranchName(event.target.value) })),
              h(Field, { label: '单位名称' }, h('input', { style: ui.input, value: orgName, onChange: event => setOrgName(event.target.value) })),
              h(Field, { label: '支部补充说明' }, h('textarea', { style: { ...ui.textarea, minHeight: 60 }, value: notes, onChange: event => setNotes(event.target.value) })),
              h(Btn, { kind: 'primary', onClick: saveBranch }, '保存'),
              h(Btn, { onClick: () => setEditingBranch(false) }, '取消'))
            : h('div', null,
              h('div', { style: { fontSize: 15, fontWeight: 600 } }, branch?.name),
              h('div', { style: { ...ui.hint, marginTop: 4 } }, branch?.orgName || '未填写单位'),
              branch?.notes ? h('div', { style: { ...ui.hint, marginTop: 4 } }, branch.notes) : null,
              knowledgeStatus !== '' ? h('div', { style: { ...ui.hint, marginTop: 4, color: '#16794c' } }, `已存入：${knowledgeStatus}`) : null)),
        h(Card, { title: `人员（${members.length}）` },
          grouped.committee.length > 0 ? h('div', { style: { marginBottom: 8 } },
            h('div', { style: { fontSize: 13, fontWeight: 600, marginBottom: 4 } }, '支部委员'),
            grouped.committee.map(member => h(MemberRow, { key: member.id, member, mutate, onToggle: toggleMember }))) : null,
          grouped.partyMembers.length > 0 ? h('div', null,
            h('div', { style: { fontSize: 13, fontWeight: 600, marginBottom: 4 } }, '党员'),
            grouped.partyMembers.map(member => h(MemberRow, { key: member.id, member, mutate, onToggle: toggleMember }))) : null,
          h('details', { style: { marginTop: 10 } },
            h('summary', { style: { ...ui.hint, cursor: 'pointer' } }, '添加'),
            h('div', { style: { marginTop: 8 } },
              h(Field, { label: '姓名' }, h('input', { style: ui.input, value: name, onChange: event => setName(event.target.value) })),
              h(Field, { label: '职务' }, h('input', { style: ui.input, placeholder: '如：支部书记', value: position, onChange: event => setPosition(event.target.value) })),
              h(Field, { label: '补充说明' }, h('input', { style: ui.input, placeholder: '如：负责组织、党员发展', value: detail, onChange: event => setDetail(event.target.value) })),
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
      async function repair() {
        setRepairing(true)
        try {
          const result = await call('knowledge.repair', {})
          await mutate('state.get', {})
          setStatus(`已检查修复：补规范 ${result.seed?.installed ?? 0} 篇，恢复支部 ${result.branches?.length ?? 0} 条、会议记录 ${result.records?.length ?? 0} 条、备份笔记 ${result.restored?.length ?? 0} 条`)
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
      const stats = knowledge.stats ?? {}
      const total = knowledge.total ?? notes.length
      const tree = filterNoteTree(buildNoteTree(notes), filter)
      return h('div', { style: { maxWidth: 1150, display: 'flex', flexDirection: 'column', gap: 12 } },
        h(Card, { title: `知识库（${total} 条）`, extra: h('div', { style: { display: 'flex', gap: 8 } },
          h('label', { style: { ...ui.button('default'), display: 'inline-block' } },
            importing ? '导入中…' : '导入材料',
            h('input', { type: 'file', accept: '.md,.txt,.docx', multiple: true, onChange: importFiles, style: { display: 'none' } })),
          h(Btn, { onClick: repair, disabled: repairing }, repairing ? '检查中…' : '检查修复'),
          h(Btn, { onClick: organize }, '整理知识库')) },
          h('div', { style: { display: 'flex', gap: 16, flexWrap: 'wrap' } },
            Object.entries(KNOWLEDGE_KIND_LABELS).filter(([kind]) => kind !== 'index').map(([kind, label]) =>
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
                  h('div', { style: { ...ui.hint, marginBottom: 8 } }, `${KNOWLEDGE_KIND_LABELS[selected.kind] ?? ''} · ${String(selected.date ?? '').slice(0, 10)} · ${selected.relativePath}`),
                  editing
                    ? h('textarea', { style: { ...ui.textarea, minHeight: 420 }, value: editContent, onChange: event => setEditContent(event.target.value) })
                    : h('div', { style: { maxHeight: 540, overflow: 'auto' } },
                      renderMarkdownEnabled === false
                        ? h('pre', { style: { whiteSpace: 'pre-wrap', fontSize: 12, lineHeight: 1.7, margin: 0 } }, content)
                        : renderMarkdown(stripFrontmatter(content))))))))
    }

    function SettingsPage({ snapshot, mutate, call }) {
      const [recordLength, setRecordLength] = useState(snapshot.settings.recordLength ?? 'short')
      const [vaultPath, setVaultPath] = useState(snapshot.settings.vaultPath ?? '')
      const [knowledgeFolder, setKnowledgeFolder] = useState(snapshot.settings.knowledgeFolder ?? '党建会议记录')
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
      async function saveProfile() {
        await mutate('profile.update', { level: profileLevel, role: profileRole, purpose: profilePurpose, styleNotes })
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
        h(Card, { title: '记录长度' },
          h('div', { style: { ...ui.hint, marginBottom: 8 } }, '按手抄需要选择。'),
          h('div', { style: { display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 10 } },
            lengthOptions.map(option => h('label', { key: option.value, style: { display: 'flex', gap: 6, alignItems: 'flex-start', fontSize: 13, cursor: 'pointer' } },
              h('input', { type: 'radio', name: 'recordLength', checked: recordLength === option.value, onChange: () => setRecordLength(option.value) }),
              h('span', null, h('strong', null, option.label), h('span', { style: { ...ui.hint, display: 'block' } }, option.hint))))),
          h(Btn, { kind: 'primary', onClick: saveLength }, '保存')),
        h(Card, { title: 'Obsidian 知识库' },
          h('div', { style: { ...ui.hint, marginBottom: 8 } }, `不填则使用：${DEFAULT_VAULT}`),
          h('div', { style: { ...ui.hint, marginBottom: 8 } }, `Word 导出默认目录：知识库/${knowledgeFolder || '党建会议记录'}/Word导出`),
          h(Field, { label: '知识库文件夹' }, h('input', { style: ui.input, placeholder: `默认：${DEFAULT_VAULT}`, value: vaultPath, onChange: event => setVaultPath(event.target.value) })),
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
                h(Field, { label: '角色' }, h(Select, { value: profileRole, onChange: setProfileRole, options: [{ value: '', label: '未设置' }, { value: 'secretary', label: '支部书记' }, { value: 'organizer', label: '组织委员' }, { value: 'committee', label: '其他支委' }, { value: 'member', label: '普通党员' }, { value: 'other', label: '其他' }] })),
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
              h('div', { style: { ...ui.hint, marginTop: 4 } }, '本助手只能读取和写入，不能删除任何记录或文件；如需删除，请在文件系统或 Obsidian 中自行处理。')),
            h('div', { style: { marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(192,57,43,.2)' } },
              h('div', { style: { ...ui.cardTitle, color: '#c0392b' } }, '删除数据'),
              h('div', { style: { ...ui.hint, marginBottom: 8 } }, '清空支部、人员和会议记录。不会删除 Obsidian 笔记与导入/导出文件。'),
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

      let content
      if (view === 'meetings') content = h(MeetingsPage, { snapshot, mutate, call, selectedId, setSelectedId })
      else if (view === 'tasks') content = h(TasksPage, { snapshot, mutate })
      else if (view === 'people') content = h(PeoplePage, { snapshot, mutate })
      else if (view === 'knowledge') content = h(KnowledgePage, { snapshot, mutate, call, onOpenSettings: () => setView('settings') })
      else content = h(SettingsPage, { snapshot, mutate, call })

      return h('div', { style: { padding: 18, height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0, boxSizing: 'border-box' } },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 } },
          h('div', null,
            h('div', { style: { fontSize: 18, fontWeight: 700 } }, '会议记录助手')),
          h('div', null, h(Btn, { onClick: refresh }, '刷新'), busy ? h('span', { style: ui.hint }, '处理中…') : null)),
        h('div', { style: { display: 'flex', gap: 6, marginBottom: 12 } },
          NAV.map(([key, label]) => h('button', {
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
        PeoplePage, TasksPage, KnowledgePage, SettingsPage, ChatCard, MemberRow, Card, Field, Btn, Select, renderMarkdown,
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
