# 会议记录助手（DeepSeek Harness 插件）

面向基层党支部的会议记录生成与管理插件。在 DeepSeek Harness（以下简称 DSH）对话中说出“帮我写一份会议记录”，插件会按党务模板生成可直接抄入记录本的对话体会议记录，并支持 Word 导出与 Obsidian 知识库沉淀。

- 7 类会议：支委会、党员大会、党小组会、党课、主题党日、组织生活会、党委会
- 7 个专项流程：支部选举、发展党员（接收/转正）、支委会讨论发展党员、民主评议、批评与自我批评、党费报告
- 首次配置、用户画像、记录长度、知识库检索与整理

## 功能

### 对话生成会议记录

- 在任意对话里说“帮我写一份会议记录”，自动加载技能，不需要记技能名。
- 自动判断材料类型：单场会议材料直接使用；月度“三会一课”安排会先确认写哪一场，每场单独生成。
- 会议类型无法确定时先列候选询问，不默认套用。
- 自动读取支部/人员资料，补齐会议时间、地点、主持人、参会人员；记录人默认组织委员。
- 生成前先给出会议类型、流程、人员、议题摘要，确认后才写正文。
- 需要时检索时政背景（公开信息，不检索人名、支部名称等内部信息）。
- 对话体正文：会议基本信息表、参会人员表、第一议题/其他议题的“议题要点 + 逐人发言”、最后的决议/分工/散会；一人一段，段间空一行。
- 篇幅可选短/中/长（默认短，适合手抄），也可在对话中临时指定。
- 支持多轮修改、导入修订后的 Word 后以其为准更新。
- 生成后固定确认：修改 / 输出 Word / 保存定稿 / 存入知识库。

### 任务台账与会前材料

- 从会议记录中提取决议/工作分工，形成任务台账；可设置责任人、完成时限，标记完成/重开。
- 生成新会议时自动提醒上次会议未完成事项。
- 一键生成会前材料包：会议方案、议程、通知、签到表、主持词参考（Markdown）。

### 会议记录管理

- 记录列表、状态（草稿/已生成/已定稿）、字数、待核对数量。
- 详情页渲染正文（可勾选“渲染 Markdown”，取消后看源码）、编辑正文、修改会议信息、勾选参会人员。
- 定稿前检查缺项（日期、主持人、记录人、待核对、票数等）。
- 导出 Word 默认保存到知识库 `Word导出/` 目录，同名文件自动加序号。
- 导入修订 Word。

### 支部、人员与画像

- 支部信息：名称、单位、补充说明。
- 人员：按“支部委员/党员”分组；支持添加、编辑（姓名/职务/补充说明）、停用/恢复。
- 首次配置可选角色、电脑熟练度、记录用途；对话中也可自动判断，用于调整指导方式和默认篇幅。

### Obsidian 知识库

- 支持树状目录、检索、预览；笔记可编辑、删除（删除前确认）。
- 笔记类型：支部信息（配置后自动保存）、会议记录、检索资料、支部材料、日常工作、知识库索引。
- 用户提交的支部材料、日常工作内容，可按需存入；会议记录、检索资料等“做过的事情”先询问再存。
- 可定期整理：自动更新知识库索引（超过 30 天或不存在时），也可手动点击“整理知识库”。
- 生成记录或写材料时，可按需检索知识库作为参考背景，不当作会议事实。

### 按需加载的技能参考

- 技能主文件只保留核心流程、正文结构和质量规则；首次配置、知识库、材料写作、会前材料/任务、规范种子包等细则放在参考模块中，只在对应场景通过 `meeting_skill_guide` 取用。
- 普通会议记录不会加载这些模块，减少上下文消耗。

### 知识库冗余与恢复

- 插件数据自动保留最近 5 份 `app.json` 备份（`.bak-1`～`.bak-5`）。
- 每次保存/删除笔记前生成知识库快照 `knowledge-backup.json`。
- 启动时只自动补回**必要文件**（内置规范、索引）；支部信息、会议记录、历史材料不自动恢复。
- 需要找回历史数据时，知识库页点“恢复历史数据”（二次确认）或调用 `knowledge_repair` 的 `includeHistory:true`；会尝试补回支部信息、已保存会议记录、快照中的材料笔记。
- 误清空知识库后若要干净重来：只补必要文件即可；Word 导出文件不自动重建，可从会议记录重新导出。
- 详细异常场景与恢复顺序见 [docs/知识库冗余与恢复.md](docs/知识库冗余与恢复.md)。

### 内置规范种子包

- 随插件内置 8 篇通用规范：三会一课与会议类型、发展党员、支部选举、会议记录格式、公文格式、质量检查清单、组织生活会与民主评议。
- 首次配置时自动写入知识库“规范制度”目录；设置 → 高级信息可重新安装/更新。
- 生成记录或材料时按需检索单篇作为程序/格式参考；具体事实仍以材料、支部信息和用户确认为准。

### 越用越顺手

- **写作偏好记忆**：可保存常用称呼、语气、篇幅、忌讳表述，生成前遵循。
- **知识库检索引用**：参考历史材料时列出“参考：标题（日期）”，不把旧内容当本次事实。
- **批量导入材料**：知识库页可一次导入多个 `.md/.txt/.docx`，自动存入“支部材料”。
- **质量检查规则**：对发展党员、选举、组织生活会等增加确定性检查提醒。
- **内置规范种子包**：程序、格式、质量清单随插件提供，按需检索，不进入常规上下文。

## 环境要求

- DeepSeek Harness `>=0.2.1-rc.2 <0.3.0`
- macOS、Linux 或 Windows 10/11 x64（Linux/Windows 已完成代码层兼容处理，尚未全部真机验证）
- 不需要额外安装 Node.js、Python、Office 或 LibreOffice；Word 导出由插件内置实现

## 安装（新电脑）

需要先安装 DeepSeek Harness 桌面端。

### 方式一：下载 ZIP，一键安装（手动操作）

1. 下载仓库 ZIP 并解压到一个固定目录（例如 `Documents/dsh-meeting-record`）。
2. 完全退出 DeepSeek Harness。
3. 运行对应脚本：

   - **macOS**：双击 `install.command`；或在终端执行：

     ```bash
     chmod +x install.sh install.command
     ./install.sh
     ```

   - **Linux**：

     ```bash
     chmod +x install.sh
     ./install.sh
     ```

   - **Windows**：双击 `install.bat`。

4. 脚本会：
   - 找到本机 DSH 的 `desktop` Profile（可用 `--profile 名称` 指定）；
   - 备份 Profile 的 `package.json`；
   - 把当前目录注册为本地插件，加入 bundle 列表；
   - 执行 `dsh plugin --profile ... install`。
5. 重新打开 DeepSeek Harness，侧栏出现「会议记录」即安装成功。

说明：

- 脚本不会修改或删除你的支部、人员、会议和知识库数据；
- 如果提示找不到 node，可先安装 Node.js 22+，或设置 `DSH_NODE=/path/to/node`；
- 如果 DSH 不在默认安装位置，可设置 `DSH_CLI=/path/to/dsh`；
- 如果 Profile 名称不是 `desktop`：macOS/Linux 用 `./install.sh --profile 你的profile`，Windows 用 `install.bat -Profile 你的profile`；
- 仅想查看脚本会做什么：`./install.sh --dry-run`（Windows：`-DryRun`）；
- macOS 若双击提示“无法验证开发者”，右键选择“打开”；Windows 若出现 SmartScreen，选择“更多信息 → 仍要运行”。

### 方式二：git clone 后安装（手动操作）

```bash
git clone https://github.com/JerryYan-yus/dsh-meeting-record.git ~/Documents/dsh-meeting-record
```

克隆完成后可直接运行仓库内的一键脚本：

```bash
chmod +x install.sh
./install.sh
```

Windows 双击 `install.bat`。

### 方式三：让 DSH Agent 安装（Agent 操作）

先把仓库克隆或解压到本机任意固定目录，然后在 DSH 会话中发送：

```text
请用 plugin_manager 的 install_bundle，把 /绝对路径/dsh-meeting-record 安装到当前 profile 并启用。
```

Windows 示例：

```text
请用 plugin_manager 的 install_bundle，把 C:\Users\你的用户名\Documents\dsh-meeting-record 安装到当前 profile 并启用。
```

Agent 会自动写入 Profile 依赖、启用 Bundle 并完成安装（可能请求一次授权）。安装完成后侧栏出现「会议记录」即成功。

### 更新

```bash
cd ~/Documents/dsh-meeting-record
git pull
```

然后任选一种：

- 重新运行 `./install.sh`（Windows 重新双击 `install.bat`）；
- 或让 DSH Agent 再次执行上面的 `install_bundle` 指令。

最后重启 DeepSeek Harness。

## 快速开始

1. 打开侧栏「会议记录」→ 首次配置：
   - 支部全称、单位名称、支部补充说明；
   - Obsidian 知识库位置（可不填，默认 `~/Documents/党建会议记录知识库`）；
   - 人员名单：一行一人，`姓名 职务 补充说明`；
   - 可选：角色、熟练度、记录用途。
2. 在任意对话中发送：

   ```text
   帮我写一份支委会会议记录。
   会议日期：2026-11-05
   材料如下：
   （粘贴会议材料，或写工作区里的文件路径）
   ```

3. 按助手提示确认会议类型、时间地点、主持人、参会人员和议题。
4. 生成后回到面板「刷新」查看；可导出 Word、定稿或存入知识库。
5. 知识库页可查看目录树、检索、预览、编辑或删除笔记。

## 面板说明

- **会议记录**：在对话中生成会议记录、记录列表、正文预览与编辑、导出 Word、定稿、会前材料。
- **任务**：会议决议/分工任务台账，完成/重开、编辑责任人/时限。
- **人员**：支部信息编辑、人员添加/编辑/停用/恢复、存入知识库。
- **知识库**：分类统计、树状目录、检索、预览、编辑、删除、整理知识库。
- **设置**：记录长度、Obsidian 知识库位置、用户画像、对话生成状态、数据与权限、清空数据（15 秒确认）。

## 数据位置

- 插件数据：`$DSH_HOME/meetrecord/app.json`（支部、人员、会议记录、草稿、设置）。
- 技能：`$DSH_HOME/skills/party-meeting-records/SKILL.md`。
- 知识库：默认 `~/Documents/党建会议记录知识库`，结构：

  ```text
  党建会议记录知识库/
    党建会议记录/
      支部信息/
      会议记录/
      检索资料/
      支部材料/
      日常工作/
      知识库索引/
      Word导出/
  ```

数据保存在本机，不上传。

## 模型工具

共 23 个：

`meeting_skill_guide`、`knowledge_repair`、`meeting_guide_list`、`meeting_guide_get`、`meeting_template_list`、`meeting_template_get`、`meeting_org_info`、`meeting_org_setup`、`meeting_profile_save`、`meeting_draft_save`、`meeting_record_save`、`meeting_record_get`、`meeting_export_docx`、`meeting_list`、`meeting_tasks_save`、`meeting_tasks_list`、`meeting_task_update`、`meeting_prep_pack`、`knowledge_repair`、`knowledge_save`、`knowledge_search`、`knowledge_read`、`knowledge_organize`、`docx_read`。

## 目录结构

```text
.
├── index.js                 # Host 端入口：注册工具、HTTP 路由、安装技能
├── client.js                # Web 面板（对话式 UI）
├── cordis.patch.yml         # DSH Bundle 配置
├── icon.svg
├── install.sh / install.command   # macOS / Linux 一键安装
├── install.bat / install.ps1      # Windows 一键安装
├── scripts/install.mjs      # 跨平台安装逻辑
├── lib/
│   ├── service.js           # 业务服务（会议、人员、知识库、导出）
│   ├── store.js             # 本地 JSON 存储
│   ├── tools.js             # 模型工具定义
│   ├── routes.js            # 面板 HTTP 路由
│   ├── knowledge.js         # Obsidian Markdown 读写/检索/索引
│   ├── docx-export.js       # Word（OOXML）导出
│   ├── docx-text.js         # Word 文本读取
│   ├── template-seed.js     # 内置会议模板与专项流程
│   ├── seed.js              # 内置规范种子包读取
│   ├── skill-refs.js        # 按需技能参考模块读取
│   ├── zip.js / http.js / response.js
├── seed/规范制度/           # 内置规范种子包
├── skills/party-meeting-records/references/  # 按需加载的技能参考
├── locale/                  # 中英文面板文案
└── skills/party-meeting-records/SKILL.md  # 对话技能
```

## 说明

- 当前为**单用户、本地运行**设计：数据保存在本机，不支持多用户、登录权限或云端同步。
- 插件与助手只读取、写入本机文件；助手没有删除能力。面板中删除知识库笔记需要用户确认；清空插件数据需等待 15 秒并再次确认。
- Word 导出默认进入知识库 `Word导出/`，同名文件自动加 `-2`、`-3`。
- Windows 长路径（超过 260 字符）、OneDrive 重定向“文档”目录、杀毒软件拦截写入等情况可能影响使用，建议把知识库放在 `Documents` 一级目录。

## License

MIT
