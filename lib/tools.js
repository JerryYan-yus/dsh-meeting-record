/**
 * Model-facing tools for the conversation-first plugin.
 *
 * The model runs the meeting-record conversation (guided by the bundled
 * `party-meeting-records` skill): it lists templates and procedure flows,
 * reads organisation data, saves confirmed drafts, writes the generated record,
 * and stores knowledge notes into the user's Obsidian vault.
 */

function jsonOutput() {
  return {
    schema: { type: 'object', additionalProperties: true },
    render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
  }
}

function defineTool(name, description, parameters, execute) {
  return { name, description, parameters, output: jsonOutput(), execute }
}

const text = description => ({ type: 'string', description })
const number = description => ({ type: 'number', description })
const bool = description => ({ type: 'boolean', description })

/**
 * Build the tool definitions for one service instance.
 * @param {ReturnType<import('./service.js').createService>} service
 */
export function makeTools(service) {
  return [
    defineTool(
      'meeting_template_list',
      '列出插件管理的会议模板（支委会/党员大会/党小组会/党课/主题党日/组织生活会/党委会）和专项流程模板（支部选举/发展党员/民主评议/党费报告等）。生成会议记录前先调用它，向用户确认使用哪个模板、是否需要叠加专项流程。',
      { type: 'object', properties: {}, additionalProperties: false },
      async () => service.toolTemplateList(),
    ),

    defineTool(
      'meeting_template_get',
      '读取一个会议模板或专项流程模板的完整内容：议题、每议题字段、内容结构、发言顺序、写作要点、语气要求、专项流程步骤。',
      {
        type: 'object',
        properties: { templateId: text('模板 id，例如 tpl-branch-committee 或 proc-xuanju') },
        required: ['templateId'],
        additionalProperties: false,
      },
      async args => service.toolTemplateGet(args?.templateId),
    ),

    defineTool(
      'meeting_org_info',
      '查询支部、人员和默认值（默认模板等），用于向用户确认参会人员、支部和默认主持人/记录人。',
      {
        type: 'object',
        properties: { branchId: text('可选：指定支部 id；省略时使用默认支部或第一个支部') },
        additionalProperties: false,
      },
      async args => service.toolOrgInfo(args?.branchId),
    ),

    defineTool(
      'meeting_org_setup',
      '首次使用或人员有变化时，一次性保存支部名称、单位、支部补充说明与人员名单（姓名/职务/补充说明），保存后自动设为默认支部。首次配置还应询问 Obsidian 知识库保存在哪；用户不提供时用默认位置 ~/Documents/党建会议记录知识库。用来代替“让用户去插件里配置”：用户只需在对话里发一次“支部 + 单位 + 人员名单”，之后开会不用再提供。',
      {
        type: 'object',
        properties: {
          branchId: text('可选：已有支部 id；不知道就不传'),
          branchName: text('支部全称，例如：XX党支部'),
          orgName: text('可选：单位/学院名称'),
          notes: text('可选：支部补充说明（基本情况、工作特点等）'),
          vaultPath: text('可选：Obsidian 知识库保存位置（绝对路径或 ~ 开头）；不填则用默认 ~/Documents/党建会议记录知识库'),
          members: {
            type: 'array',
            description: '参会人员名单；每项是 {name, position}',
            items: {
              type: 'object',
              additionalProperties: true,
              properties: { name: { type: 'string', description: '姓名' }, position: { type: 'string', description: '职务/身份，例如 支部书记、组织委员' }, detail: { type: 'string', description: '可选：个人补充说明（负责工作、特点等）' } },
            },
          },
          makeDefault: bool('是否设为默认支部（首次配置默认 true）'),
          defaultTemplateId: text('可选：同时设置默认会议模板 id，例如 tpl-branch-committee'),
        },
        required: ['branchName'],
        additionalProperties: false,
      },
      async args => service.toolOrgSetup(args),
    ),

    defineTool(
      'meeting_profile_save',
      '首次使用或用户主动说明时，保存用户画像（熟练度、角色、记录用途），用于调整指导方式与默认记录长度。只保存用户明确提供或可判断的信息，不要编造。',
      {
        type: 'object',
        properties: {
          level: { type: 'string', enum: ['novice', 'regular', 'expert'], description: '电脑/流程熟练度：novice 不熟、regular 一般、expert 熟练' },
          role: { type: 'string', enum: ['secretary', 'organizer', 'committee', 'member', 'other'], description: '角色：支部书记/组织委员/其他支委/普通党员/其他' },
          purpose: { type: 'string', enum: ['handwrite', 'archive', 'report'], description: '记录用途：手抄记录本/电子归档/上报材料' },
          notes: text('可选：画像补充说明'),
        },
        additionalProperties: false,
      },
      async args => service.saveProfile(args),
    ),

    defineTool(
      'meeting_draft_save',
      '创建或更新会议草稿：保存已与用户确认的会议类型/时间/地点/主持人/记录人/参会人员/议题/专项流程。记录人未填时默认使用组织委员（用户指定则按指定）。已有 meetingId 时更新该会议；否则新建。返回 meetingId（后续保存正文、入库都要用）。',
      {
        type: 'object',
        properties: {
          meetingId: text('可选：要更新的会议 id；省略则新建'),
          branchId: text('可选：支部 id'),
          templateId: text('会议模板 id（必填，来自 meeting_template_list）'),
          procedureTemplateIds: { type: 'array', items: { type: 'string' }, description: '可选：专项流程模板 id 列表' },
          title: text('会议标题（可留空，默认“支部+类型+会议记录”）'),
          meetingDate: text('会议日期 YYYY-MM-DD'),
          meetingTime: text('会议时间，例如 14:30'),
          location: text('会议地点'),
          host: text('主持人'),
          recorder: text('记录人'),
          expectedCount: number('应到人数'),
          actualCount: number('实到人数'),
          attendees: {
            type: 'array',
            description: '参会人员：字符串 memberId 或 {memberId,status}；status 可选 present/leave/absent',
            items: { type: 'object', additionalProperties: true, properties: { memberId: { type: 'string' }, status: { type: 'string' } } },
          },
          topics: {
            type: 'array',
            description: '议题列表；省略时用模板议题',
            items: {
              type: 'object',
              additionalProperties: true,
              properties: {
                title: { type: 'string' },
                points: { type: 'string' },
                needsResearch: { type: 'boolean' },
                expectedChars: { type: 'number' },
              },
            },
          },
        },
        required: ['templateId'],
        additionalProperties: false,
      },
      async args => service.toolDraftSave(args),
    ),

    defineTool(
      'meeting_record_save',
      '保存会议记录正文（完整 Markdown），可附带来源列表。final=false 保存草稿/修改稿；final=true 表示定稿（必须用户明确同意后才可传 true）。重复保存会覆盖正文并递增修订号。',
      {
        type: 'object',
        properties: {
          meetingId: text('会议 id；省略时取最近更新的会议'),
          markdown: text('完整会议记录（Markdown）'),
          sources: {
            type: 'array',
            description: '外部检索来源（正文引用到的公开资料）',
            items: {
              type: 'object',
              additionalProperties: true,
              properties: { title: { type: 'string' }, url: { type: 'string' }, publishedAt: { type: 'string' } },
            },
          },
          final: bool('是否定稿；只有用户明确确认后才能 true'),
        },
        required: ['markdown'],
        additionalProperties: false,
      },
      async (args, exec) => {
        const sessionId = typeof exec?.agent?.id === 'string' ? exec.agent.id : undefined
        return service.toolRecordSave({ ...args, sessionId })
      },
    ),

    defineTool(
      'meeting_record_get',
      '读取一场会议的基本信息和记录正文（用于修改、对比用户修订稿或展示给用户确认）。meetingId 省略时取最近更新的会议。',
      {
        type: 'object',
        properties: { meetingId: text('会议 id；省略取最近会议') },
        additionalProperties: false,
      },
      async args => service.toolRecordGet(args),
    ),

    defineTool(
      'meeting_export_docx',
      '把已保存的会议记录导出为 Word（.docx）文件，返回本机绝对路径。用户选择“输出 Word”时调用；默认保存到知识库目录 `知识库/党建会议记录/Word导出/`。',
      {
        type: 'object',
        properties: {
          meetingId: text('会议 id；省略取最近会议'),
          outputPath: text('可选：导出到指定路径（绝对路径或 ~ 开头）；省略保存到插件 exports 目录'),
        },
        additionalProperties: false,
      },
      async args => service.toolExportDocx(args),
    ),

    defineTool(
      'meeting_list',
      '列出会议记录（按更新时间倒序），可按状态筛选。',
      {
        type: 'object',
        properties: {
          status: text('可选：draft / generated / finalized'),
          limit: number('返回条数，默认 10'),
        },
        additionalProperties: false,
      },
      async args => service.toolMeetingList(args),
    ),

    defineTool(
      'knowledge_save',
      '把会议记录、检索资料、支部材料、日常工作或支部信息写入 Obsidian 知识库。kind: record 会议记录 / reference 检索资料 / material 支部材料 / daily 日常工作 / branch 支部信息。写入后返回相对路径；索引过期会自动整理。',
      {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: ['record', 'reference', 'material', 'daily', 'branch'], description: 'record 会议记录；reference 检索资料；material 支部材料；daily 日常工作；branch 支部信息' },
          title: text('笔记标题'),
          content: text('正文（Markdown）'),
          tags: { type: 'array', items: { type: 'string' }, description: '标签' },
          sources: {
            type: 'array',
            items: { type: 'object', additionalProperties: true, properties: { title: { type: 'string' }, url: { type: 'string' }, publishedAt: { type: 'string' } } },
          },
          meetingId: text('可选：关联的会议 id'),
          meetingType: text('可选：会议类型'),
          date: text('可选：日期 YYYY-MM-DD，默认今天'),
        },
        required: ['kind', 'title', 'content'],
        additionalProperties: false,
      },
      async args => service.toolKnowledgeSave(args),
    ),

    defineTool(
      'knowledge_search',
      '在 Obsidian 知识库中检索历史会议记录与检索资料（中文按词/二元组匹配，标题权重更高）。生成新会议前先检索，看看有没有可复用的历史写法和资料。',
      {
        type: 'object',
        properties: { query: text('检索词，例如“二十届五中全会”或“支委会 选举”'), limit: number('返回条数，默认 10') },
        required: ['query'],
        additionalProperties: false,
      },
      async args => service.toolKnowledgeSearch(args),
    ),

    defineTool(
      'knowledge_read',
      '读取知识库中的一条笔记全文（path 来自 knowledge_search 的返回值）。',
      {
        type: 'object',
        properties: { path: text('笔记相对路径') },
        required: ['path'],
        additionalProperties: false,
      },
      async args => service.toolKnowledgeRead(args),
    ),

    defineTool(
      'knowledge_organize',
      '整理 Obsidian 知识库：统计各类笔记数量、最近更新，并更新“知识库索引”笔记。用户说“整理知识库”或索引超过30天时调用；force=true 强制立即整理。',
      {
        type: 'object',
        properties: { force: { type: 'boolean', description: 'true 强制整理；默认在索引不足30天时跳过' } },
        additionalProperties: false,
      },
      async args => service.organizeKnowledge(Boolean(args.force)),
    ),

    defineTool(
      'docx_read',
      '读取用户提供的 Word（.docx）或文本文件正文，用于把用户修订后的 Word 作为最终稿，或读取用户放进工作区的会议材料。路径可以是工作区相对路径或绝对路径。',
      {
        type: 'object',
        properties: { path: text('文件路径（.docx/.txt/.md）') },
        required: ['path'],
        additionalProperties: false,
      },
      async args => service.toolDocxRead(args),
    ),
  ]
}
