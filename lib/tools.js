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
  return {
    name,
    description,
    parameters,
    output: jsonOutput(),
    async execute(...args) {
      const value = await execute(...args)
      if (value === undefined) return null
      // Tool results must be lossless JSON for the host boundary. This drops
      // undefined object fields and turns undefined array items into null so a
      // stale field can never abort a whole tool call.
      return JSON.parse(JSON.stringify(value))
    },
  }
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
      'meeting_reference',
      '按需读取参考：技能参考模块或内置规范种子包。不传 topic 列出目录；传 topic 取一篇。普通会议不需要读取；一次只取一篇，不要全读。',
      {
        type: 'object',
        properties: {
          topic: text('可选：模块名/主题，如 onboarding、domains、knowledge、file-intake、发展党员'),
          source: { type: 'string', enum: ['auto', 'skill', 'seed'], description: '默认 auto' },
        },
        additionalProperties: false,
      },
      async args => service.meetingReference(args),
    ),

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
        properties: { templateId: text('模板 id'), compact: bool('默认 true：只返回写作所需字段') },
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
      '首次使用或人员有变化时，一次性保存工作性质、单位/部门名称、补充说明与人员名单（姓名/职务/补充说明），保存后自动设为默认。必须先区分工作性质（党建党务/综合办公/人事干部/财务审计/项目业务/宣传群团/教学科研医疗/基层治理/其他），后续会议类型和材料不同。首次配置还应询问 Obsidian 知识库位置；不填用默认。',
      {
        type: 'object',
        properties: {
          branchId: text('可选：已有支部 id；不知道就不传'),
          workDomain: { type: 'string', enum: ['party', 'general', 'hr', 'finance', 'project', 'publicity', 'teaching', 'governance', 'other'], description: '工作性质：党建党务/综合办公/人事干部/财务审计/项目业务/宣传群团/教学科研医疗/基层治理/其他' },
          branchName: text('单位/部门（或支部）全称'),
          orgName: text('可选：上级单位/部门名称'),
          notes: text('可选：单位/部门补充说明（基本情况、工作特点等）'),
          vaultPath: text('可选：Obsidian 知识库保存位置（绝对路径或 ~ 开头）；不填则用默认 ~/Documents/机关工作知识库'),
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
          styleNotes: text('可选：写作偏好（常用称呼、语气、篇幅、忌讳表述等），只保存用户明确的偏好'),
        },
        additionalProperties: false,
      },
      async args => service.saveProfile(args),
    ),

    defineTool(
      'meeting_draft_save',
      '创建/更新会议草稿：保存会议类型、时间地点、人员、议题、专项流程，返回 meetingId。确认信息后调用。',
      {
        type: 'object',
        properties: {
          meetingId: text('可选：会议 id；省略新建'),
          branchId: text('可选：单位/支部 id'),
          templateId: text('会议模板 id'),
          procedureTemplateIds: { type: 'array', items: { type: 'string' }, description: '可选：专项流程模板 id 列表' },
          title: text('可选：标题'),
          meetingDate: text('日期 YYYY-MM-DD'),
          meetingTime: text('时间 HH:MM'),
          location: text('地点'),
          host: text('主持人'),
          recorder: text('记录人'),
          expectedCount: number('应到人数'),
          actualCount: number('实到人数'),
          attendees: {
            type: 'array',
            description: 'memberId 或 {memberId,status:present/leave/absent}',
            items: { type: 'object', additionalProperties: true, properties: { memberId: { type: 'string' }, status: { type: 'string' } } },
          },
          topics: {
            type: 'array',
            description: '可选：议题',
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
      '把已保存的会议记录导出为 Word（.docx）文件，返回本机绝对路径。用户选择“输出 Word”时调用；默认保存到知识库目录 `知识库/工作资料/Word导出/`。',
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
      'material_save',
      '保存/更新一篇机关材料（通知、报告、总结、方案、简报、讲话稿等）到材料库。用户确认材料内容后调用；同一材料修改时传 id。',
      {
        type: 'object',
        properties: {
          id: text('可选：已有材料 id；新建不传'),
          title: text('材料标题'),
          kind: text('材料类型，如 通知/报告/总结/方案/简报/讲话稿/会议纪要'),
          content: text('完整 Markdown 正文'),
          status: { type: 'string', enum: ['draft', 'final'], description: '默认 draft' },
        },
        required: ['title', 'content'],
        additionalProperties: false,
      },
      async args => service.materialSave(args),
    ),

    defineTool(
      'material_list',
      '列出材料库中的材料（默认最近 50 篇，不含正文），用于查找、修改或导出。',
      { type: 'object', properties: { limit: number('返回条数，默认 50') }, additionalProperties: false },
      async args => service.materialList(args),
    ),

    defineTool(
      'material_get',
      '读取一篇材料的标题、类型、状态和正文；修改或导出前先读。',
      { type: 'object', properties: { materialId: text('材料 id'), includeMarkdown: bool('是否返回正文，默认 true') }, required: ['materialId'], additionalProperties: false },
      async args => service.materialGet(args.materialId, args.includeMarkdown !== false),
    ),

    defineTool(
      'material_export_docx',
      '把材料库中的材料导出为 Word（.docx），默认保存到知识库 Word导出/ 目录。用户选择“输出 Word”时调用。',
      { type: 'object', properties: { materialId: text('材料 id') }, required: ['materialId'], additionalProperties: false },
      async args => service.materialExportDocx(args.materialId),
    ),

    defineTool(
      'meeting_tasks_save',
      '从会议记录中提取决议/工作分工，保存为任务台账。一条任务一项，责任人和完成时限能从正文确定才填；不要编造。返回保存数量与任务 id。',
      {
        type: 'object',
        properties: {
          meetingId: text('会议 id'),
          tasks: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                content: text('任务内容（决议/分工）'),
                owner: text('可选：责任人'),
                dueDate: text('可选：完成时限 YYYY-MM-DD'),
              },
              required: ['content'],
            },
          },
        },
        required: ['meetingId', 'tasks'],
        additionalProperties: false,
      },
      async args => service.taskSave(args),
    ),

    defineTool(
      'meeting_tasks_list',
      '查询任务台账。生成新会议前查询未完成任务，作为“上次会议遗留事项”提醒；也用于查看某场会议的任务。',
      {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['open', 'done', 'cancelled', 'all'], description: '默认 open' },
          meetingId: text('可选：只查某场会议'),
          branchId: text('可选：只查某个支部'),
          limit: number('返回条数，默认 30'),
        },
        additionalProperties: false,
      },
      async args => service.taskList(args),
    ),

    defineTool(
      'meeting_task_update',
      '更新任务状态/责任人/完成时限/内容（用于用户反馈任务完成或调整）。',
      {
        type: 'object',
        properties: {
          taskId: text('任务 id'),
          status: { type: 'string', enum: ['open', 'done', 'cancelled'] },
          content: text('可选：新内容'),
          owner: text('可选：新责任人'),
          dueDate: text('可选：新时限 YYYY-MM-DD'),
        },
        required: ['taskId'],
        additionalProperties: false,
      },
      async args => service.taskUpdate(args.taskId, args),
    ),

    defineTool(
      'meeting_prep_pack',
      '生成会前材料包：会议方案、议程、通知、签到表、主持词参考（Markdown）。可基于已有 meetingId，或直接给会议类型/日期/地点/主持人/议题。',
      {
        type: 'object',
        properties: {
          meetingId: text('可选：基于已有会议生成'),
          branchId: text('可选：单位/支部 id'),
          templateId: text('可选：会议模板 id'),
          meetingDate: text('可选：日期 YYYY-MM-DD'),
          meetingTime: text('可选：时间 HH:MM'),
          location: text('可选：地点'),
          host: text('可选：主持人'),
          recorder: text('可选：记录人'),
          topics: { type: 'array', items: { type: 'string' }, description: '可选：议题名称列表' },
        },
        additionalProperties: false,
      },
      async args => service.prepPack(args),
    ),

    defineTool(
      'knowledge_repair',
      '检查并修复知识库：默认只补回必要文件（内置规范、索引），不恢复历史数据；只有用户明确要求恢复历史材料时才传 includeHistory:true，补回单位信息、已保存会议记录和快照笔记。不会删除现有笔记。',
      { type: 'object', properties: { includeHistory: { type: 'boolean', description: '是否恢复历史数据（支部信息/会议记录/快照笔记），默认 false' } }, additionalProperties: false },
      async args => service.repairKnowledge({ includeHistory: args?.includeHistory === true }),
    ),

    defineTool(
      'knowledge_import_files',
      '把本地文件直接存入知识库，保留全文：服务端读取 .docx/.txt/.md 并写入笔记，模型不需要把全文放进上下文。用于用户丢入大量文件并要求存入知识库；一次最多 20 个，可传可选摘要/标题/分类。扫描 PDF/图片需先转文字。',
      {
        type: 'object',
        properties: {
          files: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                path: text('本地文件路径（工作区相对或绝对路径）'),
                title: text('可选：知识库标题，默认文件名'),
                summary: text('可选：一句摘要，写在原文前面'),
                kind: { type: 'string', enum: ['material', 'daily', 'reference'], description: '默认 material' },
                tags: { type: 'array', items: { type: 'string' }, description: '可选标签，最多 6 个' },
              },
              required: ['path'],
            },
          },
        },
        required: ['files'],
        additionalProperties: false,
      },
      async args => service.knowledgeImportFiles(args),
    ),

    defineTool(
      'deletion_request',
      '用户明确要求删除单个文件或一条会议记录时使用。先说明目标，取得明确确认；本工具只生成待确认令牌，不会删除。支持知识库笔记（knowledge_note）、Word 导出文件（word_export）、会议记录（meeting_record），不支持批量。',
      {
        type: 'object',
        properties: {
          targetType: { type: 'string', enum: ['knowledge_note', 'word_export', 'meeting_record'], description: 'knowledge_note、word_export 或 meeting_record' },
          targetPath: text('笔记/Word相对路径，或会议记录 id'),
        },
        required: ['targetType', 'targetPath'],
        additionalProperties: false,
      },
      async args => service.requestFileDeletion(args.targetType, args.targetPath),
    ),

    defineTool(
      'deletion_confirm',
      '用户已经明确回复同意删除后，用 deletion_request 返回的 token 执行删除。未取得用户确认不得调用；一次只删一个文件。',
      {
        type: 'object',
        properties: { token: text('deletion_request 返回的 token') },
        required: ['token'],
        additionalProperties: false,
      },
      async args => service.confirmFileDeletion(args.token),
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
      'file_preprocess',
      '用户只丢入/提供一个文件、未提生成会议记录时先调用：读取 .docx/.txt/.md，或识别扫描 PDF/图片（不可直接提取文字），提取标题、日期、文号、发文单位，初判文件类型并给出建议存放位置。随后向用户展示短摘要并询问是否存入知识库；扫描 PDF/图片返回三选一：提供文字版（首选）/1–3 页截图识图/仅登记，不自动整本识图，不调用 LibreOffice。',
      {
        type: 'object',
        properties: { path: text('文件路径（工作区相对路径或绝对路径）') },
        required: ['path'],
        additionalProperties: false,
      },
      async args => service.toolFilePreprocess(args),
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
