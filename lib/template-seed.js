/**
 * Built-in meeting and procedure templates, extracted from the legacy
 * meeting-record project (backend/presets/meeting_config.py and
 * backend/prompts/topic_registry.py). They preserve the original meeting types,
 * agenda topics, per-topic fields, structures, speaking orders and writing
 * notes, so the conversation skill can offer an authentic flow to the user.
 */
export const SEED_TEMPLATES = [
  {
    "id": "tpl-branch-committee",
    "kind": "meeting",
    "name": "支委会（内置）",
    "meetingType": "支委会",
    "label": "支部委员会",
    "description": "支委会议事以研究讨论和形成决议为主：先传达学习、再逐项研究、明确责任人和时限；委员发言要有观点差异，不能千篇一律。",
    "applicableMeetingTypes": [
      "支委会"
    ],
    "requiredInfo": [
      "meetingDate",
      "meetingTime",
      "location",
      "host",
      "recorder",
      "attendees"
    ],
    "topics": [
      {
        "key": "chuanda_xuexi",
        "label": "传达学习上级精神",
        "fields": [
          {
            "name": "document",
            "label": "学习文件/精神",
            "type": "textarea",
            "required": true
          }
        ],
        "structure": [
          "主持人宣布会议开始，说明本次学习的主题和来源",
          "逐条传达文件/会议精神的核心内容",
          "参会人员逐一发言谈学习体会（每人侧重不同角度）",
          "书记做学习小结，提出贯彻落实要求"
        ],
        "speakingOrder": [
          "书记（传达）",
          "各委员/党员（逐一谈体会）",
          "书记（小结）"
        ],
        "keyPoints": "必须引用具体文件名称、会议精神；发言要结合实际工作，不能空泛表态；每人发言角度不同（理论认识、工作结合、自身差距、下一步打算）",
        "tone": "庄重严肃，体现政治学习的规范性",
        "minSpeeches": 4,
        "needsResearch": true
      },
      {
        "key": "yanjiu_gongzuo_jihua",
        "label": "研究支部工作计划",
        "fields": [
          {
            "name": "plan_detail",
            "label": "计划内容",
            "type": "textarea",
            "required": true
          }
        ],
        "structure": [
          "通报上期工作完成情况",
          "提出下期工作设想和具体安排",
          "各委员讨论补充",
          "形成工作计划决议"
        ],
        "speakingOrder": [
          "书记/副书记（提出方案）",
          "组织委员（补充党建活动）",
          "宣传委员（补充宣传计划）",
          "各委员（讨论）"
        ],
        "keyPoints": "需有具体时间节点、责任人、工作内容；不能空泛，要可执行",
        "tone": "务实高效，注重可操作性",
        "minSpeeches": 3,
        "needsResearch": false
      },
      {
        "key": "taolun_fazhan_dangyuan",
        "label": "讨论发展党员",
        "fields": [
          {
            "name": "candidate",
            "label": "发展对象",
            "type": "text",
            "required": true
          },
          {
            "name": "stage",
            "label": "阶段(接收/转正)",
            "type": "select",
            "options": [
              "接收为预备党员",
              "预备党员转正"
            ],
            "required": true
          }
        ],
        "structure": [
          "介绍发展对象基本情况（姓名、年龄、递交申请时间、培养联系人）",
          "组织委员汇报培养考察过程（培训情况、思想汇报、群众座谈）",
          "支委会审查材料（政审结论、公示情况）",
          "各支委逐一发表意见（从思想认识、工作表现、群众基础、存在不足等方面）",
          "表决（形成同意接收/转正的决议）"
        ],
        "speakingOrder": [
          "书记（主持）",
          "组织委员（汇报培养情况）",
          "各支委（逐一发表意见）",
          "书记（宣布表决结果）"
        ],
        "keyPoints": "需包含发展对象的入党申请时间、培养联系人、培训情况、政审结论；支委发言不能千篇一律；必须有表决程序和票数",
        "tone": "严谨规范，体现组织程序的严肃性",
        "minSpeeches": 4,
        "needsResearch": false
      },
      {
        "key": "yanjiu_dangfei",
        "label": "研究党费使用",
        "fields": [
          {
            "name": "usage_detail",
            "label": "使用方案",
            "type": "textarea",
            "required": true
          }
        ],
        "structure": [
          "通报党费收缴和结余情况",
          "提出使用方案",
          "各委员讨论",
          "表决"
        ],
        "speakingOrder": [
          "组织委员（通报收支）",
          "委员（讨论使用方案）",
          "书记（宣布结果）"
        ],
        "keyPoints": "需有具体金额数字；使用要合理合规",
        "tone": "严谨规范",
        "minSpeeches": 3,
        "needsResearch": false
      },
      {
        "key": "taolun_jiaoyu_guanli",
        "label": "讨论党员教育管理",
        "fields": [
          {
            "name": "management_detail",
            "label": "教育管理内容",
            "type": "textarea",
            "required": true
          }
        ],
        "structure": [
          "分析党员队伍现状和存在的问题",
          "提出教育管理措施",
          "各委员讨论完善",
          "形成方案"
        ],
        "speakingOrder": [
          "纪检委员（通报问题）",
          "宣传委员（提学习计划）",
          "各委员（讨论）",
          "书记（总结）"
        ],
        "keyPoints": "需有具体问题、针对性措施；措施要可操作",
        "tone": "实事求是，注重实效",
        "minSpeeches": 3,
        "needsResearch": false
      },
      {
        "key": "yanjiu_zuzhi_shenghuo",
        "label": "研究组织生活会方案",
        "fields": [
          {
            "name": "plan_detail",
            "label": "方案内容",
            "type": "textarea",
            "required": true
          }
        ],
        "structure": [
          "确定会议主题和时间安排",
          "讨论对照检查方向",
          "明确征求意见安排",
          "各委员分工"
        ],
        "speakingOrder": [
          "书记（提出方案）",
          "各委员（讨论补充）",
          "书记（明确分工）"
        ],
        "keyPoints": "方案要具体，有时间节点和责任人",
        "tone": "认真负责，细致周密",
        "minSpeeches": 3,
        "needsResearch": false
      },
      {
        "key": "taolun_pingyou",
        "label": "讨论评优评先",
        "fields": [
          {
            "name": "award_detail",
            "label": "评优内容",
            "type": "textarea",
            "required": true
          }
        ],
        "structure": [
          "传达评选通知和条件",
          "讨论评选标准",
          "民主推荐候选人",
          "确定推荐名单"
        ],
        "speakingOrder": [
          "书记（传达通知）",
          "各委员（推荐并说明理由）",
          "书记（确定名单）"
        ],
        "keyPoints": "需有候选人事迹、推荐理由；要有比较分析；推荐理由充分",
        "tone": "公正客观，择优推荐",
        "minSpeeches": 3,
        "needsResearch": false
      },
      {
        "key": "other",
        "label": "其他",
        "fields": [
          {
            "name": "custom_detail",
            "label": "具体内容",
            "type": "textarea",
            "required": true
          }
        ],
        "structure": [
          "说明议题内容",
          "各参会人员讨论",
          "形成结论"
        ],
        "speakingOrder": [
          "主持人（说明）",
          "各人员（讨论）",
          "主持人（总结）"
        ],
        "keyPoints": "根据具体内容灵活处理",
        "tone": "规范认真",
        "minSpeeches": 3,
        "needsResearch": false
      }
    ],
    "writingRequirements": "支委会议事以研究讨论和形成决议为主：先传达学习、再逐项研究、明确责任人和时限；委员发言要有观点差异，不能千篇一律。",
    "builtin": true
  },
  {
    "id": "tpl-member-assembly",
    "kind": "meeting",
    "name": "党员大会（内置）",
    "meetingType": "党员大会",
    "label": "党员大会",
    "description": "党员大会要体现党内民主和表决程序：学习传达、审议报告、表决事项分开记录；涉及发展党员、选举、评议时必须写清程序、人数和票数。",
    "applicableMeetingTypes": [
      "党员大会"
    ],
    "requiredInfo": [
      "meetingDate",
      "meetingTime",
      "location",
      "host",
      "recorder",
      "attendees"
    ],
    "topics": [
      {
        "key": "chuanda_xuexi",
        "label": "传达学习",
        "fields": [
          {
            "name": "document",
            "label": "学习内容",
            "type": "textarea",
            "required": true
          }
        ],
        "structure": [
          "主持人宣布会议开始，说明本次学习的主题和来源",
          "逐条传达文件/会议精神的核心内容",
          "参会人员逐一发言谈学习体会（每人侧重不同角度）",
          "书记做学习小结，提出贯彻落实要求"
        ],
        "speakingOrder": [
          "书记（传达）",
          "各委员/党员（逐一谈体会）",
          "书记（小结）"
        ],
        "keyPoints": "必须引用具体文件名称、会议精神；发言要结合实际工作，不能空泛表态；每人发言角度不同（理论认识、工作结合、自身差距、下一步打算）",
        "tone": "庄重严肃，体现政治学习的规范性",
        "minSpeeches": 4,
        "needsResearch": true
      },
      {
        "key": "xuexi_lilun",
        "label": "学习理论/文件",
        "fields": [
          {
            "name": "document",
            "label": "学习文件名称",
            "type": "text",
            "required": true
          }
        ],
        "structure": [
          "主持人导读文件/讲话原文",
          "分段学习重点内容",
          "党员逐一交流学习心得",
          "书记做学习小结"
        ],
        "speakingOrder": [
          "主持人（领学）",
          "各党员（谈心得）",
          "书记（小结）"
        ],
        "keyPoints": "需注明学习的具体文件/书籍名称，引用原文金句；结合文件具体内容谈认识",
        "tone": "认真严肃，理论联系实际",
        "minSpeeches": 4,
        "needsResearch": true
      },
      {
        "key": "fazhan_dangyuan_jieshou",
        "label": "发展党员(接收)",
        "fields": [
          {
            "name": "candidate",
            "label": "发展对象",
            "type": "text",
            "required": true
          }
        ],
        "structure": [
          "发展对象宣读入党志愿书",
          "入党介绍人分别介绍情况",
          "支委会报告审查情况",
          "与会党员讨论",
          "无记名投票表决",
          "宣读支部决议"
        ],
        "speakingOrder": [
          "发展对象（宣读志愿书）",
          "介绍人1",
          "介绍人2",
          "组织委员（审查报告）",
          "各党员（讨论）",
          "书记（宣布结果）"
        ],
        "keyPoints": "严格按照《发展党员工作细则》程序；介绍人各从不同角度介绍；需有票数统计（应到X人，实到X人，同意X票）",
        "tone": "庄严神圣，程序严格规范",
        "minSpeeches": 5,
        "needsResearch": false
      },
      {
        "key": "fazhan_dangyuan_zhuangzheng",
        "label": "发展党员(转正)",
        "fields": [
          {
            "name": "candidate",
            "label": "转正对象",
            "type": "text",
            "required": true
          }
        ],
        "structure": [
          "预备党员宣读转正申请",
          "介绍人发言（预备期表现）",
          "支委会报告考察情况",
          "党员讨论",
          "投票表决",
          "宣读决议"
        ],
        "speakingOrder": [
          "预备党员（宣读申请）",
          "介绍人（评价预备期表现）",
          "组织委员（考察报告）",
          "各党员（讨论）",
          "书记（宣布结果）"
        ],
        "keyPoints": "需有预备期起止时间；重点谈预备期表现、改正不足情况；需有票数",
        "tone": "庄重规范",
        "minSpeeches": 4,
        "needsResearch": false
      },
      {
        "key": "minzhu_pingyi",
        "label": "民主评议党员",
        "fields": [
          {
            "name": "eval_year",
            "label": "评议年度",
            "type": "text",
            "required": true
          }
        ],
        "structure": [
          "学习评议标准和要求",
          "党员逐一自评（成绩+不足+努力方向）",
          "互评环节（每位自评后，2-3名其他党员提出批评意见）",
          "民主测评投票",
          "公布评议结果"
        ],
        "speakingOrder": [
          "书记（说明评议要求）",
          "各党员（自评+被评）"
        ],
        "keyPoints": "自评要谈不足，不能全是成绩；互评要真诚，不能全是表扬；批评要有具体事例；评议等次（优秀/合格/基本合格/不合格）",
        "tone": "诚恳真实，批评要有辣味但对事不对人",
        "minSpeeches": 5,
        "needsResearch": false
      },
      {
        "key": "xuanju",
        "label": "选举",
        "fields": [
          {
            "name": "election_detail",
            "label": "选举内容",
            "type": "textarea",
            "required": true
          }
        ],
        "structure": [
          "宣读选举办法",
          "介绍候选人基本情况",
          "投票选举",
          "计票",
          "宣布选举结果"
        ],
        "speakingOrder": [
          "主持人（宣读办法）",
          "介绍人（介绍候选人）",
          "监票人（报告计票结果）"
        ],
        "keyPoints": "严格按照选举程序；需有应到/实到人数、发出票数、收回票数、有效票数、各候选人得票数",
        "tone": "程序严谨，庄重规范",
        "minSpeeches": 3,
        "needsResearch": false
      },
      {
        "key": "dangfei_baogao",
        "label": "党费报告",
        "fields": [
          {
            "name": "report_period",
            "label": "报告期间",
            "type": "text",
            "required": true
          }
        ],
        "structure": [
          "报告党费收缴情况（应收、实收、补缴等）",
          "报告党费使用情况（各项支出明细）",
          "报告党费结余情况",
          "党员审议"
        ],
        "speakingOrder": [
          "组织委员（报告）",
          "各党员（审议）"
        ],
        "keyPoints": "需有具体数字（收缴总额、使用明细、结余金额）；数据要准确完整",
        "tone": "严肃认真，数据准确",
        "minSpeeches": 2,
        "needsResearch": false
      },
      {
        "key": "taolun_zhongda_shixiang",
        "label": "讨论支部重大事项",
        "fields": [
          {
            "name": "matter_detail",
            "label": "讨论事项",
            "type": "textarea",
            "required": true
          }
        ],
        "structure": [
          "提出议题背景和方案",
          "各党员充分讨论",
          "表决形成决议"
        ],
        "speakingOrder": [
          "书记（提出方案）",
          "各党员（讨论）",
          "书记（宣布表决结果）"
        ],
        "keyPoints": "需体现民主讨论过程，不能'一致同意'一笔带过；要有不同意见的表达",
        "tone": "民主集中，畅所欲言",
        "minSpeeches": 4,
        "needsResearch": false
      },
      {
        "key": "other",
        "label": "其他",
        "fields": [
          {
            "name": "custom_detail",
            "label": "具体内容",
            "type": "textarea",
            "required": true
          }
        ],
        "structure": [
          "说明议题内容",
          "各参会人员讨论",
          "形成结论"
        ],
        "speakingOrder": [
          "主持人（说明）",
          "各人员（讨论）",
          "主持人（总结）"
        ],
        "keyPoints": "根据具体内容灵活处理",
        "tone": "规范认真",
        "minSpeeches": 3,
        "needsResearch": false
      }
    ],
    "writingRequirements": "党员大会要体现党内民主和表决程序：学习传达、审议报告、表决事项分开记录；涉及发展党员、选举、评议时必须写清程序、人数和票数。",
    "builtin": true
  },
  {
    "id": "tpl-party-group",
    "kind": "meeting",
    "name": "党小组会（内置）",
    "meetingType": "党小组会",
    "label": "党小组会",
    "description": "党小组会以学习讨论和思想交流为主，记录党员发言要点和思想动态，不作决议的事项写清讨论意见。",
    "applicableMeetingTypes": [
      "党小组会"
    ],
    "requiredInfo": [
      "meetingDate",
      "meetingTime",
      "location",
      "host",
      "recorder",
      "attendees"
    ],
    "topics": [
      {
        "key": "xuexi_taolun",
        "label": "学习讨论",
        "fields": [
          {
            "name": "topic",
            "label": "学习主题",
            "type": "textarea",
            "required": true
          }
        ],
        "structure": [
          "组长领学",
          "各组员逐一发言",
          "组长小结"
        ],
        "speakingOrder": [
          "组长（领学）",
          "各组员（发言）",
          "组长（小结）"
        ],
        "keyPoints": "党小组会氛围较支部大会更轻松但有内容；结合工作实际",
        "tone": "亲切自然，有实质内容",
        "minSpeeches": 3,
        "needsResearch": true
      },
      {
        "key": "sixi_huibao",
        "label": "党员思想汇报",
        "fields": [],
        "structure": [
          "各组员逐一汇报近期思想、工作、生活情况",
          "组长点评"
        ],
        "speakingOrder": [
          "各党员（逐一汇报）",
          "组长（点评）"
        ],
        "keyPoints": "要真实具体，有困惑有收获；不能全是空话；要体现近期的思想变化",
        "tone": "真诚坦率，氛围相对轻松",
        "minSpeeches": 3,
        "needsResearch": false
      },
      {
        "key": "buzhi_renwu",
        "label": "布置工作任务",
        "fields": [
          {
            "name": "task_detail",
            "label": "工作内容",
            "type": "textarea",
            "required": true
          }
        ],
        "structure": [
          "传达支部安排和工作要求",
          "分解具体任务到人",
          "各组员表态"
        ],
        "speakingOrder": [
          "组长（传达布置）",
          "各组员（表态）"
        ],
        "keyPoints": "需有具体分工和完成时限；任务要明确可执行",
        "tone": "务实高效",
        "minSpeeches": 3,
        "needsResearch": false
      },
      {
        "key": "piping_ziwo_piping",
        "label": "批评与自我批评",
        "fields": [],
        "structure": [
          "自我批评（每人先自我评价，查找不足）",
          "相互批评（其他党员逐一提出批评意见）",
          "本人表态（接受批评，表示改进方向）"
        ],
        "speakingOrder": [
          "各党员（自我批评+被批评+表态）"
        ],
        "keyPoints": "自评要触及灵魂，不能泛泛而谈；批评意见要具体，不能'希望多注意身体'式空话；要有'辣味'，真刀真枪",
        "tone": "严肃认真，实事求是",
        "minSpeeches": 4,
        "needsResearch": false
      },
      {
        "key": "other",
        "label": "其他",
        "fields": [
          {
            "name": "custom_detail",
            "label": "具体内容",
            "type": "textarea",
            "required": true
          }
        ],
        "structure": [
          "说明议题内容",
          "各参会人员讨论",
          "形成结论"
        ],
        "speakingOrder": [
          "主持人（说明）",
          "各人员（讨论）",
          "主持人（总结）"
        ],
        "keyPoints": "根据具体内容灵活处理",
        "tone": "规范认真",
        "minSpeeches": 3,
        "needsResearch": false
      }
    ],
    "writingRequirements": "党小组会以学习讨论和思想交流为主，记录党员发言要点和思想动态，不作决议的事项写清讨论意见。",
    "builtin": true
  },
  {
    "id": "tpl-party-class",
    "kind": "meeting",
    "name": "党课（内置）",
    "meetingType": "党课",
    "label": "党课",
    "description": "党课记录以党课主题、主要内容要点和讨论交流为主，不逐句记录；要写明授课人、党课提纲和党员讨论要点。",
    "applicableMeetingTypes": [
      "党课"
    ],
    "requiredInfo": [
      "meetingDate",
      "meetingTime",
      "location",
      "host",
      "recorder",
      "attendees"
    ],
    "topics": [
      {
        "key": "zhuanti_dangke",
        "label": "专题党课",
        "fields": [
          {
            "name": "course_topic",
            "label": "党课主题",
            "type": "text",
            "required": true
          },
          {
            "name": "course_outline",
            "label": "党课大纲/要点",
            "type": "textarea",
            "required": false
          }
        ],
        "structure": [
          "授课人开篇引入主题",
          "分章节讲授（理论+案例）",
          "穿插党员提问/讨论",
          "书记总结"
        ],
        "speakingOrder": [
          "授课人（讲授主线）",
          "各党员（提问/讨论穿插）",
          "书记（总结）"
        ],
        "keyPoints": "内容要有逻辑框架，理论+案例结合；授课人是主线，其他党员穿插讨论；内容要充实有深度",
        "tone": "严肃生动，既有理论深度又有实践案例",
        "minSpeeches": 5,
        "needsResearch": true
      },
      {
        "key": "xuexi_wenjian",
        "label": "学习文件/讲话",
        "fields": [
          {
            "name": "document",
            "label": "文件/讲话名称",
            "type": "text",
            "required": true
          }
        ],
        "structure": [
          "原文领学",
          "解读要点",
          "党员讨论",
          "总结"
        ],
        "speakingOrder": [
          "授课人（领学解读）",
          "各党员（讨论）",
          "书记（总结）"
        ],
        "keyPoints": "需引用原文，解读要准确；讨论要结合实际",
        "tone": "认真严肃",
        "minSpeeches": 4,
        "needsResearch": true
      },
      {
        "key": "jingshi_jiaoyu",
        "label": "警示教育",
        "fields": [
          {
            "name": "case_detail",
            "label": "警示案例",
            "type": "textarea",
            "required": true
          }
        ],
        "structure": [
          "通报典型案例（案情、处分结果）",
          "分析原因教训",
          "党员逐一谈认识",
          "提出纪律要求"
        ],
        "speakingOrder": [
          "主持人（通报案例）",
          "各党员（谈认识）",
          "书记（提要求）"
        ],
        "keyPoints": "案例要具体，有案情和处分结果；党员反思要触及灵魂，不能泛泛；要引以为戒",
        "tone": "严肃警示，发人深省",
        "minSpeeches": 4,
        "needsResearch": true
      },
      {
        "key": "xianjin_shiji",
        "label": "先进事迹学习",
        "fields": [
          {
            "name": "role_model",
            "label": "先进人物/事迹",
            "type": "textarea",
            "required": true
          }
        ],
        "structure": [
          "介绍先进人物事迹",
          "党员逐一谈感悟",
          "对照查找自身差距",
          "表态向先进学习"
        ],
        "speakingOrder": [
          "主持人（介绍事迹）",
          "各党员（谈感悟）",
          "书记（总结）"
        ],
        "keyPoints": "事迹要感人，有具体细节；感悟要真诚，对照自身找差距",
        "tone": "积极向上，感人奋进",
        "minSpeeches": 4,
        "needsResearch": true
      },
      {
        "key": "other",
        "label": "其他",
        "fields": [
          {
            "name": "custom_detail",
            "label": "具体内容",
            "type": "textarea",
            "required": true
          }
        ],
        "structure": [
          "说明议题内容",
          "各参会人员讨论",
          "形成结论"
        ],
        "speakingOrder": [
          "主持人（说明）",
          "各人员（讨论）",
          "主持人（总结）"
        ],
        "keyPoints": "根据具体内容灵活处理",
        "tone": "规范认真",
        "minSpeeches": 3,
        "needsResearch": false
      }
    ],
    "writingRequirements": "党课记录以党课主题、主要内容要点和讨论交流为主，不逐句记录；要写明授课人、党课提纲和党员讨论要点。",
    "builtin": true
  },
  {
    "id": "tpl-theme-party-day",
    "kind": "meeting",
    "name": "主题党日（内置）",
    "meetingType": "主题党日",
    "label": "主题党日",
    "description": "主题党日记录活动主题、内容、参与情况和党员体会；参观实践写明地点、内容；志愿服务写明事项和成效。",
    "applicableMeetingTypes": [
      "主题党日"
    ],
    "requiredInfo": [
      "meetingDate",
      "meetingTime",
      "location",
      "host",
      "recorder",
      "attendees"
    ],
    "topics": [
      {
        "key": "xuexi_jiaoyu",
        "label": "学习教育",
        "fields": [
          {
            "name": "topic",
            "label": "学习主题",
            "type": "textarea",
            "required": true
          }
        ],
        "structure": [
          "明确学习主题和目的",
          "集体学习（可结合视频、PPT等）",
          "交流学习体会",
          "总结"
        ],
        "speakingOrder": [
          "主持人（引题）",
          "各党员（交流体会）",
          "书记（总结）"
        ],
        "keyPoints": "氛围较党员大会更活跃；可结合多种形式（视频、参观等）",
        "tone": "生动活泼但不失严肃",
        "minSpeeches": 4,
        "needsResearch": true
      },
      {
        "key": "fuwu_zhiyuan",
        "label": "志愿服务",
        "fields": [
          {
            "name": "activity",
            "label": "志愿活动内容",
            "type": "textarea",
            "required": true
          }
        ],
        "structure": [
          "说明活动安排和意义",
          "活动过程记录",
          "活动总结和党员感言"
        ],
        "speakingOrder": [
          "主持人（说明安排）",
          "各党员（参与感受）",
          "组织者（总结）"
        ],
        "keyPoints": "需有具体活动内容、地点、服务对象；党员感受要真实",
        "tone": "积极向上，服务为民",
        "minSpeeches": 3,
        "needsResearch": false
      },
      {
        "key": "canguan_shijian",
        "label": "参观实践",
        "fields": [
          {
            "name": "destination",
            "label": "参观地点",
            "type": "text",
            "required": true
          },
          {
            "name": "content",
            "label": "参观内容",
            "type": "textarea",
            "required": true
          }
        ],
        "structure": [
          "出发前动员说明",
          "参观过程记录",
          "现场教学内容",
          "心得交流"
        ],
        "speakingOrder": [
          "组织者（动员说明）",
          "讲解员（现场教学）",
          "各党员（心得交流）"
        ],
        "keyPoints": "需有参观地点、展览/教育内容；党员感悟要结合参观内容",
        "tone": "生动具体，寓教于行",
        "minSpeeches": 3,
        "needsResearch": false
      },
      {
        "key": "zhuti_yantao",
        "label": "主题研讨",
        "fields": [
          {
            "name": "topic",
            "label": "研讨主题",
            "type": "textarea",
            "required": true
          }
        ],
        "structure": [
          "主持人引题",
          "各党员围绕主题逐一发言",
          "自由讨论/观点交锋",
          "总结形成共识"
        ],
        "speakingOrder": [
          "主持人（引题）",
          "各党员（逐一发言+讨论）",
          "书记（总结）"
        ],
        "keyPoints": "围绕主题深入讨论，要有观点交锋；不能都是一样的观点",
        "tone": "热烈深入，各抒己见",
        "minSpeeches": 4,
        "needsResearch": false
      },
      {
        "key": "chongwen_shishi",
        "label": "重温入党誓词",
        "fields": [],
        "structure": [
          "说明重温入党誓词的意义",
          "集体面对党旗宣誓",
          "党员发表感言"
        ],
        "speakingOrder": [
          "主持人（说明意义）",
          "全体党员（宣誓）",
          "各党员（感言）"
        ],
        "keyPoints": "程序规范，感言要触及初心；仪式感要强",
        "tone": "庄严神圣，不忘初心",
        "minSpeeches": 3,
        "needsResearch": false
      },
      {
        "key": "jiaona_dangfei",
        "label": "缴纳党费",
        "fields": [],
        "structure": [
          "说明党费缴纳标准和意义",
          "党员逐一缴纳",
          "通报收缴情况"
        ],
        "speakingOrder": [
          "组织委员（说明标准）",
          "各党员（缴纳）"
        ],
        "keyPoints": "简洁庄重，体现仪式感",
        "tone": "庄重简朴",
        "minSpeeches": 2,
        "needsResearch": false
      },
      {
        "key": "zhengzhi_shengri",
        "label": "政治生日",
        "fields": [
          {
            "name": "birthday_members",
            "label": "过政治生日的党员",
            "type": "textarea",
            "required": true
          }
        ],
        "structure": [
          "宣读过政治生日的党员名单",
          "赠送政治生日贺卡",
          "重温入党志愿",
          "过生日党员发表感言"
        ],
        "speakingOrder": [
          "主持人（宣读名单）",
          "过生日党员（感言）",
          "其他党员（寄语）"
        ],
        "keyPoints": "需有入党年月、党龄；感言要回顾入党初心和成长历程，要感人",
        "tone": "温暖感人，不忘初心",
        "minSpeeches": 3,
        "needsResearch": false
      },
      {
        "key": "other",
        "label": "其他",
        "fields": [
          {
            "name": "custom_detail",
            "label": "具体内容",
            "type": "textarea",
            "required": true
          }
        ],
        "structure": [
          "说明议题内容",
          "各参会人员讨论",
          "形成结论"
        ],
        "speakingOrder": [
          "主持人（说明）",
          "各人员（讨论）",
          "主持人（总结）"
        ],
        "keyPoints": "根据具体内容灵活处理",
        "tone": "规范认真",
        "minSpeeches": 3,
        "needsResearch": false
      }
    ],
    "writingRequirements": "主题党日记录活动主题、内容、参与情况和党员体会；参观实践写明地点、内容；志愿服务写明事项和成效。",
    "builtin": true
  },
  {
    "id": "tpl-organization-life",
    "kind": "meeting",
    "name": "组织生活会（内置）",
    "meetingType": "组织生活会",
    "label": "组织生活会",
    "description": "组织生活会必须记录对照检查、批评与自我批评、民主评议和整改措施；涉及个人检查内容注意隐私，只记录会议要求的必要内容；批评意见要有具体事例。",
    "applicableMeetingTypes": [
      "组织生活会"
    ],
    "requiredInfo": [
      "meetingDate",
      "meetingTime",
      "location",
      "host",
      "recorder",
      "attendees"
    ],
    "topics": [
      {
        "key": "duizhao_jiancha",
        "label": "对照检查",
        "fields": [
          {
            "name": "check_topic",
            "label": "对照检查主题",
            "type": "textarea",
            "required": true
          }
        ],
        "structure": [
          "通报征求意见情况",
          "班子对照检查（从多个维度查摆问题）",
          "个人对照检查"
        ],
        "speakingOrder": [
          "书记（通报征求意见）",
          "班子对照检查",
          "各党员（个人对照检查）"
        ],
        "keyPoints": "对照党章党规、初心使命查摆问题；问题要具体，不能泛泛；要从思想、政治、作风、能力、廉政等方面",
        "tone": "严肃深刻，刀刃向内",
        "minSpeeches": 4,
        "needsResearch": false
      },
      {
        "key": "piping_ziwo_piping",
        "label": "批评与自我批评",
        "fields": [],
        "structure": [
          "自我批评（每人先自我评价，查找不足）",
          "相互批评（其他党员逐一提出批评意见）",
          "本人表态（接受批评，表示改进方向）"
        ],
        "speakingOrder": [
          "各党员（自我批评+被批评+表态）"
        ],
        "keyPoints": "自评要触及灵魂，不能泛泛而谈；批评意见要具体，不能'希望多注意身体'式空话；要有'辣味'，真刀真枪",
        "tone": "严肃认真，实事求是",
        "minSpeeches": 4,
        "needsResearch": false
      },
      {
        "key": "minzhu_pingyi",
        "label": "民主评议",
        "fields": [],
        "structure": [
          "学习评议标准和要求",
          "党员逐一自评（成绩+不足+努力方向）",
          "互评环节（每位自评后，2-3名其他党员提出批评意见）",
          "民主测评投票",
          "公布评议结果"
        ],
        "speakingOrder": [
          "书记（说明评议要求）",
          "各党员（自评+被评）"
        ],
        "keyPoints": "自评要谈不足，不能全是成绩；互评要真诚，不能全是表扬；批评要有具体事例；评议等次（优秀/合格/基本合格/不合格）",
        "tone": "诚恳真实，批评要有辣味但对事不对人",
        "minSpeeches": 5,
        "needsResearch": false
      },
      {
        "key": "zhenggai_luoshi",
        "label": "整改落实",
        "fields": [
          {
            "name": "rectification_detail",
            "label": "整改内容",
            "type": "textarea",
            "required": true
          }
        ],
        "structure": [
          "通报上次整改落实情况",
          "逐项报告完成效果",
          "讨论新发现的问题",
          "形成新的整改清单"
        ],
        "speakingOrder": [
          "书记（通报整改情况）",
          "各党员（讨论评价）",
          "书记（形成新清单）"
        ],
        "keyPoints": "整改要有台账，完成销号；新整改措施要具体可操作",
        "tone": "务实推进，真改实改",
        "minSpeeches": 3,
        "needsResearch": false
      },
      {
        "key": "other",
        "label": "其他",
        "fields": [
          {
            "name": "custom_detail",
            "label": "具体内容",
            "type": "textarea",
            "required": true
          }
        ],
        "structure": [
          "说明议题内容",
          "各参会人员讨论",
          "形成结论"
        ],
        "speakingOrder": [
          "主持人（说明）",
          "各人员（讨论）",
          "主持人（总结）"
        ],
        "keyPoints": "根据具体内容灵活处理",
        "tone": "规范认真",
        "minSpeeches": 3,
        "needsResearch": false
      }
    ],
    "writingRequirements": "组织生活会必须记录对照检查、批评与自我批评、民主评议和整改措施；涉及个人检查内容注意隐私，只记录会议要求的必要内容；批评意见要有具体事例。",
    "builtin": true
  },
  {
    "id": "tpl-party-committee",
    "kind": "meeting",
    "name": "党委会（内置）",
    "meetingType": "党委会",
    "label": "党委会",
    "description": "党委会议事记录要写明议题、汇报内容、讨论意见和决定事项；涉及人事、资金、党建部署的，写清具体内容和责任分工。",
    "applicableMeetingTypes": [
      "党委会"
    ],
    "requiredInfo": [
      "meetingDate",
      "meetingTime",
      "location",
      "host",
      "recorder",
      "attendees"
    ],
    "topics": [
      {
        "key": "chuanda_xuexi",
        "label": "传达学习上级精神",
        "fields": [
          {
            "name": "document",
            "label": "学习内容",
            "type": "textarea",
            "required": true
          }
        ],
        "structure": [
          "主持人宣布会议开始，说明本次学习的主题和来源",
          "逐条传达文件/会议精神的核心内容",
          "参会人员逐一发言谈学习体会（每人侧重不同角度）",
          "书记做学习小结，提出贯彻落实要求"
        ],
        "speakingOrder": [
          "书记（传达）",
          "各委员/党员（逐一谈体会）",
          "书记（小结）"
        ],
        "keyPoints": "必须引用具体文件名称、会议精神；发言要结合实际工作，不能空泛表态；每人发言角度不同（理论认识、工作结合、自身差距、下一步打算）",
        "tone": "庄重严肃，体现政治学习的规范性",
        "minSpeeches": 4,
        "needsResearch": true
      },
      {
        "key": "renshi_renmian",
        "label": "人事任免",
        "fields": [
          {
            "name": "personnel_detail",
            "label": "任免内容",
            "type": "textarea",
            "required": true
          }
        ],
        "structure": [
          "介绍拟任免人员基本情况",
          "说明任免理由和依据",
          "各委员讨论",
          "表决"
        ],
        "speakingOrder": [
          "主持人（介绍情况）",
          "各委员（讨论）",
          "书记（宣布结果）"
        ],
        "keyPoints": "需有拟任免人员简历、工作表现；任免理由充分；有票数",
        "tone": "严肃规范，程序严格",
        "minSpeeches": 3,
        "needsResearch": false
      },
      {
        "key": "zijin_shiyong",
        "label": "重大资金使用",
        "fields": [
          {
            "name": "fund_detail",
            "label": "资金用途",
            "type": "textarea",
            "required": true
          }
        ],
        "structure": [
          "说明资金使用方案",
          "各委员讨论审议",
          "表决"
        ],
        "speakingOrder": [
          "主持人（说明方案）",
          "各委员（审议讨论）",
          "书记（宣布结果）"
        ],
        "keyPoints": "需有具体金额、用途、预算依据；讨论要认真审议",
        "tone": "严谨审慎，精打细算",
        "minSpeeches": 3,
        "needsResearch": false
      },
      {
        "key": "dangjian_bushu",
        "label": "党建工作部署",
        "fields": [
          {
            "name": "deployment_detail",
            "label": "部署内容",
            "type": "textarea",
            "required": true
          }
        ],
        "structure": [
          "分析当前党建形势",
          "提出工作部署方案",
          "各委员讨论",
          "形成决议"
        ],
        "speakingOrder": [
          "书记（分析形势+提出方案）",
          "各委员（讨论）",
          "书记（总结决议）"
        ],
        "keyPoints": "部署要具体，有时间节点和责任人；讨论要充分",
        "tone": "高瞻远瞩，务实推进",
        "minSpeeches": 3,
        "needsResearch": false
      },
      {
        "key": "other",
        "label": "其他",
        "fields": [
          {
            "name": "custom_detail",
            "label": "具体内容",
            "type": "textarea",
            "required": true
          }
        ],
        "structure": [
          "说明议题内容",
          "各参会人员讨论",
          "形成结论"
        ],
        "speakingOrder": [
          "主持人（说明）",
          "各人员（讨论）",
          "主持人（总结）"
        ],
        "keyPoints": "根据具体内容灵活处理",
        "tone": "规范认真",
        "minSpeeches": 3,
        "needsResearch": false
      }
    ],
    "writingRequirements": "党委会议事记录要写明议题、汇报内容、讨论意见和决定事项；涉及人事、资金、党建部署的，写清具体内容和责任分工。",
    "builtin": true
  },
  {
    "id": "proc-xuanju",
    "kind": "procedure",
    "name": "支部选举（内置流程）",
    "meetingType": "",
    "label": "支部选举",
    "description": "适用于支部委员会换届选举或补选；按选举程序记录，必须写明应到/实到人数、发出/收回/有效票数、各候选人得票数和当选结果。",
    "applicableMeetingTypes": [
      "党员大会",
      "支委会"
    ],
    "requiredInfo": [],
    "procedureSteps": [
      "宣读选举办法",
      "介绍候选人基本情况",
      "投票选举",
      "计票",
      "宣布选举结果"
    ],
    "speakingOrder": [
      "主持人（宣读办法）",
      "介绍人（介绍候选人）",
      "监票人（报告计票结果）"
    ],
    "keyPoints": "严格按照选举程序；需有应到/实到人数、发出票数、收回票数、有效票数、各候选人得票数",
    "tone": "程序严谨，庄重规范",
    "minSpeeches": 3,
    "writingRequirements": "适用于支部委员会换届选举或补选；按选举程序记录，必须写明应到/实到人数、发出/收回/有效票数、各候选人得票数和当选结果。\n要点：严格按照选举程序；需有应到/实到人数、发出票数、收回票数、有效票数、各候选人得票数",
    "builtin": true
  },
  {
    "id": "proc-fazhan-dangyuan-jieshou",
    "kind": "procedure",
    "name": "发展党员（接收）（内置流程）",
    "meetingType": "",
    "label": "发展党员（接收）",
    "description": "适用于接收预备党员的党员大会；按《发展党员工作细则》程序记录，必须写明发展对象信息、介绍人意见、政审和公示情况、表决票数。",
    "applicableMeetingTypes": [
      "党员大会"
    ],
    "requiredInfo": [],
    "procedureSteps": [
      "发展对象宣读入党志愿书",
      "入党介绍人分别介绍情况",
      "支委会报告审查情况",
      "与会党员讨论",
      "无记名投票表决",
      "宣读支部决议"
    ],
    "speakingOrder": [
      "发展对象（宣读志愿书）",
      "介绍人1",
      "介绍人2",
      "组织委员（审查报告）",
      "各党员（讨论）",
      "书记（宣布结果）"
    ],
    "keyPoints": "严格按照《发展党员工作细则》程序；介绍人各从不同角度介绍；需有票数统计（应到X人，实到X人，同意X票）",
    "tone": "庄严神圣，程序严格规范",
    "minSpeeches": 5,
    "writingRequirements": "适用于接收预备党员的党员大会；按《发展党员工作细则》程序记录，必须写明发展对象信息、介绍人意见、政审和公示情况、表决票数。\n要点：严格按照《发展党员工作细则》程序；介绍人各从不同角度介绍；需有票数统计（应到X人，实到X人，同意X票）",
    "builtin": true
  },
  {
    "id": "proc-fazhan-dangyuan-zhuangzheng",
    "kind": "procedure",
    "name": "发展党员（转正）（内置流程）",
    "meetingType": "",
    "label": "发展党员（转正）",
    "description": "适用于预备党员转正的党员大会；必须写明预备期起止时间、预备期表现、考察结论和表决票数。",
    "applicableMeetingTypes": [
      "党员大会"
    ],
    "requiredInfo": [],
    "procedureSteps": [
      "预备党员宣读转正申请",
      "介绍人发言（预备期表现）",
      "支委会报告考察情况",
      "党员讨论",
      "投票表决",
      "宣读决议"
    ],
    "speakingOrder": [
      "预备党员（宣读申请）",
      "介绍人（评价预备期表现）",
      "组织委员（考察报告）",
      "各党员（讨论）",
      "书记（宣布结果）"
    ],
    "keyPoints": "需有预备期起止时间；重点谈预备期表现、改正不足情况；需有票数",
    "tone": "庄重规范",
    "minSpeeches": 4,
    "writingRequirements": "适用于预备党员转正的党员大会；必须写明预备期起止时间、预备期表现、考察结论和表决票数。\n要点：需有预备期起止时间；重点谈预备期表现、改正不足情况；需有票数",
    "builtin": true
  },
  {
    "id": "proc-taolun-fazhan-dangyuan",
    "kind": "procedure",
    "name": "支委会讨论发展党员（内置流程）",
    "meetingType": "",
    "label": "支委会讨论发展党员",
    "description": "适用于支委会研究/讨论发展党员事项（确定发展对象、审查材料、形成意见后提交党员大会）；记录培养考察情况、审查结论和支委逐一意见，必须写明表决或形成意见情况。",
    "applicableMeetingTypes": [
      "支委会"
    ],
    "requiredInfo": [],
    "procedureSteps": [
      "介绍发展对象基本情况（姓名、年龄、递交申请时间、培养联系人）",
      "组织委员汇报培养考察过程（培训情况、思想汇报、群众座谈）",
      "支委会审查材料（政审结论、公示情况）",
      "各支委逐一发表意见（从思想认识、工作表现、群众基础、存在不足等方面）",
      "表决（形成同意接收/转正的决议）"
    ],
    "speakingOrder": [
      "书记（主持）",
      "组织委员（汇报培养情况）",
      "各支委（逐一发表意见）",
      "书记（宣布表决结果）"
    ],
    "keyPoints": "需包含发展对象的入党申请时间、培养联系人、培训情况、政审结论；支委发言不能千篇一律；必须有表决程序和票数",
    "tone": "严谨规范，体现组织程序的严肃性",
    "minSpeeches": 4,
    "writingRequirements": "适用于支委会研究/讨论发展党员事项（确定发展对象、审查材料、形成意见后提交党员大会）；记录培养考察情况、审查结论和支委逐一意见，必须写明表决或形成意见情况。\n要点：需包含发展对象的入党申请时间、培养联系人、培训情况、政审结论；支委发言不能千篇一律；必须有表决程序和票数",
    "builtin": true
  },
  {
    "id": "proc-minzhu-pingyi",
    "kind": "procedure",
    "name": "民主评议党员（内置流程）",
    "meetingType": "",
    "label": "民主评议党员",
    "description": "适用于年度民主评议党员；记录自评、互评、民主测评和评议等次，批评要有具体事例。",
    "applicableMeetingTypes": [
      "党员大会",
      "组织生活会"
    ],
    "requiredInfo": [],
    "procedureSteps": [
      "学习评议标准和要求",
      "党员逐一自评（成绩+不足+努力方向）",
      "互评环节（每位自评后，2-3名其他党员提出批评意见）",
      "民主测评投票",
      "公布评议结果"
    ],
    "speakingOrder": [
      "书记（说明评议要求）",
      "各党员（自评+被评）"
    ],
    "keyPoints": "自评要谈不足，不能全是成绩；互评要真诚，不能全是表扬；批评要有具体事例；评议等次（优秀/合格/基本合格/不合格）",
    "tone": "诚恳真实，批评要有辣味但对事不对人",
    "minSpeeches": 5,
    "writingRequirements": "适用于年度民主评议党员；记录自评、互评、民主测评和评议等次，批评要有具体事例。\n要点：自评要谈不足，不能全是成绩；互评要真诚，不能全是表扬；批评要有具体事例；评议等次（优秀/合格/基本合格/不合格）",
    "builtin": true
  },
  {
    "id": "proc-piping-ziwo-piping",
    "kind": "procedure",
    "name": "批评与自我批评（内置流程）",
    "meetingType": "",
    "label": "批评与自我批评",
    "description": "适用于组织生活会和民主生活会；记录自我批评、相互批评和表态，批评意见要具体。",
    "applicableMeetingTypes": [
      "组织生活会",
      "党委会"
    ],
    "requiredInfo": [],
    "procedureSteps": [
      "自我批评（每人先自我评价，查找不足）",
      "相互批评（其他党员逐一提出批评意见）",
      "本人表态（接受批评，表示改进方向）"
    ],
    "speakingOrder": [
      "各党员（自我批评+被批评+表态）"
    ],
    "keyPoints": "自评要触及灵魂，不能泛泛而谈；批评意见要具体，不能'希望多注意身体'式空话；要有'辣味'，真刀真枪",
    "tone": "严肃认真，实事求是",
    "minSpeeches": 4,
    "writingRequirements": "适用于组织生活会和民主生活会；记录自我批评、相互批评和表态，批评意见要具体。\n要点：自评要触及灵魂，不能泛泛而谈；批评意见要具体，不能'希望多注意身体'式空话；要有'辣味'，真刀真枪",
    "builtin": true
  },
  {
    "id": "proc-dangfei-baogao",
    "kind": "procedure",
    "name": "党费报告（内置流程）",
    "meetingType": "",
    "label": "党费报告",
    "description": "适用于党员大会报告党费收缴、使用和结余情况；必须写明具体金额和数据。",
    "applicableMeetingTypes": [
      "党员大会"
    ],
    "requiredInfo": [],
    "procedureSteps": [
      "报告党费收缴情况（应收、实收、补缴等）",
      "报告党费使用情况（各项支出明细）",
      "报告党费结余情况",
      "党员审议"
    ],
    "speakingOrder": [
      "组织委员（报告）",
      "各党员（审议）"
    ],
    "keyPoints": "需有具体数字（收缴总额、使用明细、结余金额）；数据要准确完整",
    "tone": "严肃认真，数据准确",
    "minSpeeches": 2,
    "writingRequirements": "适用于党员大会报告党费收缴、使用和结余情况；必须写明具体金额和数据。\n要点：需有具体数字（收缴总额、使用明细、结余金额）；数据要准确完整",
    "builtin": true
  }
,
  {
    "id": "tpl-general-office",
    "kind": "meeting",
    "name": "办公会/部门例会（通用）",
    "meetingType": "办公会",
    "label": "部门办公会",
    "description": "适用于机关部门办公会、工作例会：通报情况、研究事项、部署任务。",
    "applicableMeetingTypes": ["办公会"],
    "requiredInfo": ["meetingDate", "meetingTime", "location", "host", "recorder", "attendees"],
    "topics": [
      {
        "key": "tongbao_qingkuang",
        "label": "通报工作情况",
        "fields": [
          { "name": "detail", "label": "工作进展、存在问题、下一步安排", "type": "textarea", "required": true }
        ],
        "structure": [
          "主持人通报近期工作；各人补充；形成安排"
        ],
        "speakingOrder": ["主持人/负责人（主持）", "参会人员（逐一发言）", "主持人（归纳）"],
        "keyPoints": "记录事实、意见、决定和分工；不编造；责任人和时限尽量明确",
        "tone": "务实、简洁、准确",
        "minSpeeches": 2
      },
      {
        "key": "yanjiu_shixiang",
        "label": "研究事项",
        "fields": [
          { "name": "detail", "label": "需研究决定的具体事项", "type": "textarea", "required": true }
        ],
        "structure": [
          "提出事项；逐人发表意见；明确结论"
        ],
        "speakingOrder": ["主持人/负责人（主持）", "参会人员（逐一发言）", "主持人（归纳）"],
        "keyPoints": "记录事实、意见、决定和分工；不编造；责任人和时限尽量明确",
        "tone": "务实、简洁、准确",
        "minSpeeches": 2
      },
      {
        "key": "bushu_renwu",
        "label": "部署任务",
        "fields": [
          { "name": "detail", "label": "任务、责任人、完成时限", "type": "textarea", "required": true }
        ],
        "structure": [
          "明确任务分工和时限；提出要求"
        ],
        "speakingOrder": ["主持人/负责人（主持）", "参会人员（逐一发言）", "主持人（归纳）"],
        "keyPoints": "记录事实、意见、决定和分工；不编造；责任人和时限尽量明确",
        "tone": "务实、简洁、准确",
        "minSpeeches": 2
      }
    ],
    "builtin": true
  },
  {
    "id": "tpl-general-special",
    "kind": "meeting",
    "name": "专题会（通用）",
    "meetingType": "专题会",
    "label": "专题会议",
    "description": "适用于围绕一个专门事项召开的专题会、评审会、推进会。",
    "applicableMeetingTypes": ["专题会"],
    "requiredInfo": ["meetingDate", "meetingTime", "location", "host", "recorder", "attendees"],
    "topics": [
      {
        "key": "beijing_qingkuang",
        "label": "背景与情况",
        "fields": [
          { "name": "detail", "label": "事项背景、现状、政策依据", "type": "textarea", "required": true }
        ],
        "structure": [
          "介绍背景；说明问题；提出初步意见"
        ],
        "speakingOrder": ["主持人/负责人（主持）", "参会人员（逐一发言）", "主持人（归纳）"],
        "keyPoints": "记录事实、意见、决定和分工；不编造；责任人和时限尽量明确",
        "tone": "务实、简洁、准确",
        "minSpeeches": 2
      },
      {
        "key": "taolun_yijian",
        "label": "讨论意见",
        "fields": [
          { "name": "detail", "label": "参会人员对方案的意见", "type": "textarea", "required": true }
        ],
        "structure": [
          "逐人发言；记录不同意见；归纳共识"
        ],
        "speakingOrder": ["主持人/负责人（主持）", "参会人员（逐一发言）", "主持人（归纳）"],
        "keyPoints": "记录事实、意见、决定和分工；不编造；责任人和时限尽量明确",
        "tone": "务实、简洁、准确",
        "minSpeeches": 2
      },
      {
        "key": "xingcheng_jielun",
        "label": "形成结论",
        "fields": [
          { "name": "detail", "label": "决定、分工、下一步", "type": "textarea", "required": true }
        ],
        "structure": [
          "明确结论、责任人和时限"
        ],
        "speakingOrder": ["主持人/负责人（主持）", "参会人员（逐一发言）", "主持人（归纳）"],
        "keyPoints": "记录事实、意见、决定和分工；不编造；责任人和时限尽量明确",
        "tone": "务实、简洁、准确",
        "minSpeeches": 2
      }
    ],
    "builtin": true
  },
  {
    "id": "tpl-general-coordination",
    "kind": "meeting",
    "name": "协调会（通用）",
    "meetingType": "协调会",
    "label": "协调会议",
    "description": "适用于跨部门、跨层级协调事项：明确分工、时限和配合要求。",
    "applicableMeetingTypes": ["协调会"],
    "requiredInfo": ["meetingDate", "meetingTime", "location", "host", "recorder", "attendees"],
    "topics": [
      {
        "key": "shuoming_shixiang",
        "label": "说明协调事项",
        "fields": [
          { "name": "detail", "label": "需协调的问题、涉及单位", "type": "textarea", "required": true }
        ],
        "structure": [
          "说明事项；提出协调需求"
        ],
        "speakingOrder": ["主持人/负责人（主持）", "参会人员（逐一发言）", "主持人（归纳）"],
        "keyPoints": "记录事实、意见、决定和分工；不编造；责任人和时限尽量明确",
        "tone": "务实、简洁、准确",
        "minSpeeches": 2
      },
      {
        "key": "xietiao_yijian",
        "label": "协调意见",
        "fields": [
          { "name": "detail", "label": "各单位意见和配合事项", "type": "textarea", "required": true }
        ],
        "structure": [
          "逐单位发言；明确职责边界"
        ],
        "speakingOrder": ["主持人/负责人（主持）", "参会人员（逐一发言）", "主持人（归纳）"],
        "keyPoints": "记录事实、意见、决定和分工；不编造；责任人和时限尽量明确",
        "tone": "务实、简洁、准确",
        "minSpeeches": 2
      },
      {
        "key": "luoshi_fengong",
        "label": "落实分工",
        "fields": [
          { "name": "detail", "label": "任务、责任单位、时限", "type": "textarea", "required": true }
        ],
        "structure": [
          "形成分工表；明确反馈要求"
        ],
        "speakingOrder": ["主持人/负责人（主持）", "参会人员（逐一发言）", "主持人（归纳）"],
        "keyPoints": "记录事实、意见、决定和分工；不编造；责任人和时限尽量明确",
        "tone": "务实、简洁、准确",
        "minSpeeches": 2
      }
    ],
    "builtin": true
  },
  {
    "id": "tpl-general-training",
    "kind": "meeting",
    "name": "培训会（通用）",
    "meetingType": "培训会",
    "label": "培训会议",
    "description": "适用于业务培训、政策宣讲、工作部署培训。",
    "applicableMeetingTypes": ["培训会"],
    "requiredInfo": ["meetingDate", "meetingTime", "location", "host", "recorder", "attendees"],
    "topics": [
      {
        "key": "peixun_beijing",
        "label": "培训背景与目的",
        "fields": [
          { "name": "detail", "label": "培训主题、对象、依据", "type": "textarea", "required": true }
        ],
        "structure": [
          "介绍培训目的和安排"
        ],
        "speakingOrder": ["主持人/负责人（主持）", "参会人员（逐一发言）", "主持人（归纳）"],
        "keyPoints": "记录事实、意见、决定和分工；不编造；责任人和时限尽量明确",
        "tone": "务实、简洁、准确",
        "minSpeeches": 2
      },
      {
        "key": "peixun_neirong",
        "label": "培训主要内容",
        "fields": [
          { "name": "detail", "label": "课程/政策/业务要点", "type": "textarea", "required": true }
        ],
        "structure": [
          "讲授或传达主要内容；记录关键要求"
        ],
        "speakingOrder": ["主持人/负责人（主持）", "参会人员（逐一发言）", "主持人（归纳）"],
        "keyPoints": "记录事实、意见、决定和分工；不编造；责任人和时限尽量明确",
        "tone": "务实、简洁、准确",
        "minSpeeches": 2
      },
      {
        "key": "tiwen_jiaoliu",
        "label": "交流与要求",
        "fields": [
          { "name": "detail", "label": "答疑、讨论、落实要求", "type": "textarea", "required": true }
        ],
        "structure": [
          "交流答疑；明确后续落实事项"
        ],
        "speakingOrder": ["主持人/负责人（主持）", "参会人员（逐一发言）", "主持人（归纳）"],
        "keyPoints": "记录事实、意见、决定和分工；不编造；责任人和时限尽量明确",
        "tone": "务实、简洁、准确",
        "minSpeeches": 2
      }
    ],
    "builtin": true
  },
  {
    "id": "tpl-general-symposium",
    "kind": "meeting",
    "name": "座谈会（通用）",
    "meetingType": "座谈会",
    "label": "座谈会议",
    "description": "适用于听取意见、交流经验、调研座谈。",
    "applicableMeetingTypes": ["座谈会"],
    "requiredInfo": ["meetingDate", "meetingTime", "location", "host", "recorder", "attendees"],
    "topics": [
      {
        "key": "jieshao_qingkuang",
        "label": "介绍情况",
        "fields": [
          { "name": "detail", "label": "座谈主题、参会人员、背景", "type": "textarea", "required": true }
        ],
        "structure": [
          "介绍座谈目的和背景"
        ],
        "speakingOrder": ["主持人/负责人（主持）", "参会人员（逐一发言）", "主持人（归纳）"],
        "keyPoints": "记录事实、意见、决定和分工；不编造；责任人和时限尽量明确",
        "tone": "务实、简洁、准确",
        "minSpeeches": 2
      },
      {
        "key": "jiaoliu_fayan",
        "label": "交流发言",
        "fields": [
          { "name": "detail", "label": "各方意见建议、经验做法", "type": "textarea", "required": true }
        ],
        "structure": [
          "逐人发言；记录观点和建议"
        ],
        "speakingOrder": ["主持人/负责人（主持）", "参会人员（逐一发言）", "主持人（归纳）"],
        "keyPoints": "记录事实、意见、决定和分工；不编造；责任人和时限尽量明确",
        "tone": "务实、简洁、准确",
        "minSpeeches": 2
      },
      {
        "key": "zongjie_yijian",
        "label": "总结意见",
        "fields": [
          { "name": "detail", "label": "归纳意见、下一步安排", "type": "textarea", "required": true }
        ],
        "structure": [
          "归纳主要意见；明确采纳和落实方向"
        ],
        "speakingOrder": ["主持人/负责人（主持）", "参会人员（逐一发言）", "主持人（归纳）"],
        "keyPoints": "记录事实、意见、决定和分工；不编造；责任人和时限尽量明确",
        "tone": "务实、简洁、准确",
        "minSpeeches": 2
      }
    ],
    "builtin": true
  }
,
  {
    "id": "tpl-hr-appraisal",
    "kind": "meeting",
    "name": "干部考察会（通用）",
    "meetingType": "干部考察会",
    "label": "干部考察",
    "description": "适用于干部考察、任前考察：了解德能勤绩廉、听取意见、形成考察意见。",
    "applicableMeetingTypes": ["干部考察会"],
    "requiredInfo": ["meetingDate", "meetingTime", "location", "host", "recorder", "attendees"],
    "topics": [
      {
        "key": "kaocha_qingkuang",
        "label": "考察对象基本情况",
        "fields": [{ "name": "detail", "label": "基本情况、工作表现、主要成绩", "type": "textarea", "required": true }],
        "structure": ["介绍考察对象情况；说明考察安排"],
        "speakingOrder": ["主持人/负责人（主持）", "参会人员（逐一发言）", "主持人（归纳）"],
        "keyPoints": "记录事实、意见、决定和分工；不编造；责任人和时限尽量明确",
        "tone": "务实、准确、简洁",
        "minSpeeches": 2
      },      {
        "key": "tingqu_yijian",
        "label": "听取意见",
        "fields": [{ "name": "detail", "label": "谈话、测评、民主推荐情况", "type": "textarea", "required": true }],
        "structure": ["通报谈话和测评情况；逐人发表意见"],
        "speakingOrder": ["主持人/负责人（主持）", "参会人员（逐一发言）", "主持人（归纳）"],
        "keyPoints": "记录事实、意见、决定和分工；不编造；责任人和时限尽量明确",
        "tone": "务实、准确、简洁",
        "minSpeeches": 2
      },      {
        "key": "zonghe_yijian",
        "label": "综合考察意见",
        "fields": [{ "name": "detail", "label": "德能勤绩廉评价、使用建议", "type": "textarea", "required": true }],
        "structure": ["归纳意见；形成考察结论和建议"],
        "speakingOrder": ["主持人/负责人（主持）", "参会人员（逐一发言）", "主持人（归纳）"],
        "keyPoints": "记录事实、意见、决定和分工；不编造；责任人和时限尽量明确",
        "tone": "务实、准确、简洁",
        "minSpeeches": 2
      }
    ],
    "builtin": true
  },
  {
    "id": "tpl-hr-review",
    "kind": "meeting",
    "name": "考核评议会（通用）",
    "meetingType": "考核评议会",
    "label": "考核评议",
    "description": "适用于年度考核、绩效考核评议：通报考核情况、评议、形成等次意见。",
    "applicableMeetingTypes": ["考核评议会"],
    "requiredInfo": ["meetingDate", "meetingTime", "location", "host", "recorder", "attendees"],
    "topics": [
      {
        "key": "kaohe_qingkuang",
        "label": "考核情况",
        "fields": [{ "name": "detail", "label": "考核指标、完成情况、得分", "type": "textarea", "required": true }],
        "structure": ["通报考核情况"],
        "speakingOrder": ["主持人/负责人（主持）", "参会人员（逐一发言）", "主持人（归纳）"],
        "keyPoints": "记录事实、意见、决定和分工；不编造；责任人和时限尽量明确",
        "tone": "务实、准确、简洁",
        "minSpeeches": 2
      },      {
        "key": "pingyi_yijian",
        "label": "评议意见",
        "fields": [{ "name": "detail", "label": "参会人员评议意见", "type": "textarea", "required": true }],
        "structure": ["逐人评议；记录不同意见"],
        "speakingOrder": ["主持人/负责人（主持）", "参会人员（逐一发言）", "主持人（归纳）"],
        "keyPoints": "记录事实、意见、决定和分工；不编造；责任人和时限尽量明确",
        "tone": "务实、准确、简洁",
        "minSpeeches": 2
      },      {
        "key": "pingding_jieguo",
        "label": "评定意见",
        "fields": [{ "name": "detail", "label": "考核等次建议、后续安排", "type": "textarea", "required": true }],
        "structure": ["形成评定意见；明确反馈和整改"],
        "speakingOrder": ["主持人/负责人（主持）", "参会人员（逐一发言）", "主持人（归纳）"],
        "keyPoints": "记录事实、意见、决定和分工；不编造；责任人和时限尽量明确",
        "tone": "务实、准确、简洁",
        "minSpeeches": 2
      }
    ],
    "builtin": true
  },
  {
    "id": "tpl-finance-budget",
    "kind": "meeting",
    "name": "预算审议会（通用）",
    "meetingType": "预算审议会",
    "label": "预算审议",
    "description": "适用于部门预算、专项经费审议：说明编制依据、审议收支、形成意见。",
    "applicableMeetingTypes": ["预算审议会"],
    "requiredInfo": ["meetingDate", "meetingTime", "location", "host", "recorder", "attendees"],
    "topics": [
      {
        "key": "yusuan_shuoming",
        "label": "预算编制说明",
        "fields": [{ "name": "detail", "label": "编制依据、收支安排、重点项目", "type": "textarea", "required": true }],
        "structure": ["说明预算编制情况"],
        "speakingOrder": ["主持人/负责人（主持）", "参会人员（逐一发言）", "主持人（归纳）"],
        "keyPoints": "记录事实、意见、决定和分工；不编造；责任人和时限尽量明确",
        "tone": "务实、准确、简洁",
        "minSpeeches": 2
      },      {
        "key": "shenyi_yijian",
        "label": "审议意见",
        "fields": [{ "name": "detail", "label": "收入、支出、项目安排意见", "type": "textarea", "required": true }],
        "structure": ["逐项审议；记录调整意见"],
        "speakingOrder": ["主持人/负责人（主持）", "参会人员（逐一发言）", "主持人（归纳）"],
        "keyPoints": "记录事实、意见、决定和分工；不编造；责任人和时限尽量明确",
        "tone": "务实、准确、简洁",
        "minSpeeches": 2
      },      {
        "key": "xingcheng_yijian",
        "label": "形成审议意见",
        "fields": [{ "name": "detail", "label": "建议方案、报批安排", "type": "textarea", "required": true }],
        "structure": ["归纳意见；明确修改和报批"],
        "speakingOrder": ["主持人/负责人（主持）", "参会人员（逐一发言）", "主持人（归纳）"],
        "keyPoints": "记录事实、意见、决定和分工；不编造；责任人和时限尽量明确",
        "tone": "务实、准确、简洁",
        "minSpeeches": 2
      }
    ],
    "builtin": true
  },
  {
    "id": "tpl-finance-audit",
    "kind": "meeting",
    "name": "审计整改会（通用）",
    "meetingType": "审计整改会",
    "label": "审计整改",
    "description": "适用于审计问题反馈和整改部署：通报问题、研究措施、明确责任时限。",
    "applicableMeetingTypes": ["审计整改会"],
    "requiredInfo": ["meetingDate", "meetingTime", "location", "host", "recorder", "attendees"],
    "topics": [
      {
        "key": "wenti_tongbao",
        "label": "审计问题通报",
        "fields": [{ "name": "detail", "label": "审计发现的问题、依据", "type": "textarea", "required": true }],
        "structure": ["通报审计问题和风险"],
        "speakingOrder": ["主持人/负责人（主持）", "参会人员（逐一发言）", "主持人（归纳）"],
        "keyPoints": "记录事实、意见、决定和分工；不编造；责任人和时限尽量明确",
        "tone": "务实、准确、简洁",
        "minSpeeches": 2
      },      {
        "key": "zhenggai_fangan",
        "label": "整改方案",
        "fields": [{ "name": "detail", "label": "整改措施、责任人、时限", "type": "textarea", "required": true }],
        "structure": ["逐项研究整改措施"],
        "speakingOrder": ["主持人/负责人（主持）", "参会人员（逐一发言）", "主持人（归纳）"],
        "keyPoints": "记录事实、意见、决定和分工；不编造；责任人和时限尽量明确",
        "tone": "务实、准确、简洁",
        "minSpeeches": 2
      },      {
        "key": "luoshi_yaoqiu",
        "label": "落实要求",
        "fields": [{ "name": "detail", "label": "销号管理、复查安排", "type": "textarea", "required": true }],
        "structure": ["明确整改要求和完成时限"],
        "speakingOrder": ["主持人/负责人（主持）", "参会人员（逐一发言）", "主持人（归纳）"],
        "keyPoints": "记录事实、意见、决定和分工；不编造；责任人和时限尽量明确",
        "tone": "务实、准确、简洁",
        "minSpeeches": 2
      }
    ],
    "builtin": true
  },
  {
    "id": "tpl-project-schedule",
    "kind": "meeting",
    "name": "项目调度会（通用）",
    "meetingType": "项目调度会",
    "label": "项目调度",
    "description": "适用于项目进度调度：汇报进展、协调问题、部署下一步。",
    "applicableMeetingTypes": ["项目调度会"],
    "requiredInfo": ["meetingDate", "meetingTime", "location", "host", "recorder", "attendees"],
    "topics": [
      {
        "key": "jindu_huibao",
        "label": "进度汇报",
        "fields": [{ "name": "detail", "label": "目标、完成情况、滞后事项", "type": "textarea", "required": true }],
        "structure": ["逐项汇报进度"],
        "speakingOrder": ["主持人/负责人（主持）", "参会人员（逐一发言）", "主持人（归纳）"],
        "keyPoints": "记录事实、意见、决定和分工；不编造；责任人和时限尽量明确",
        "tone": "务实、准确、简洁",
        "minSpeeches": 2
      },      {
        "key": "wenti_xietiao",
        "label": "问题协调",
        "fields": [{ "name": "detail", "label": "困难问题、需协调事项", "type": "textarea", "required": true }],
        "structure": ["研究解决办法；明确责任单位"],
        "speakingOrder": ["主持人/负责人（主持）", "参会人员（逐一发言）", "主持人（归纳）"],
        "keyPoints": "记录事实、意见、决定和分工；不编造；责任人和时限尽量明确",
        "tone": "务实、准确、简洁",
        "minSpeeches": 2
      },      {
        "key": "xiabu_anpai",
        "label": "下一步安排",
        "fields": [{ "name": "detail", "label": "时间节点、任务分工", "type": "textarea", "required": true }],
        "structure": ["部署下一阶段任务"],
        "speakingOrder": ["主持人/负责人（主持）", "参会人员（逐一发言）", "主持人（归纳）"],
        "keyPoints": "记录事实、意见、决定和分工；不编造；责任人和时限尽量明确",
        "tone": "务实、准确、简洁",
        "minSpeeches": 2
      }
    ],
    "builtin": true
  },
  {
    "id": "tpl-project-review",
    "kind": "meeting",
    "name": "项目评审会（通用）",
    "meetingType": "项目评审会",
    "label": "项目评审",
    "description": "适用于项目立项、方案、验收评审：汇报、质询、形成评审结论。",
    "applicableMeetingTypes": ["项目评审会"],
    "requiredInfo": ["meetingDate", "meetingTime", "location", "host", "recorder", "attendees"],
    "topics": [
      {
        "key": "xiangmu_huibao",
        "label": "项目汇报",
        "fields": [{ "name": "detail", "label": "背景、方案、预算、进度", "type": "textarea", "required": true }],
        "structure": ["项目组汇报"],
        "speakingOrder": ["主持人/负责人（主持）", "参会人员（逐一发言）", "主持人（归纳）"],
        "keyPoints": "记录事实、意见、决定和分工；不编造；责任人和时限尽量明确",
        "tone": "务实、准确、简洁",
        "minSpeeches": 2
      },      {
        "key": "zhiwen_taolun",
        "label": "质询讨论",
        "fields": [{ "name": "detail", "label": "评审意见、问题质询", "type": "textarea", "required": true }],
        "structure": ["逐人发表评审意见"],
        "speakingOrder": ["主持人/负责人（主持）", "参会人员（逐一发言）", "主持人（归纳）"],
        "keyPoints": "记录事实、意见、决定和分工；不编造；责任人和时限尽量明确",
        "tone": "务实、准确、简洁",
        "minSpeeches": 2
      },      {
        "key": "pingshen_jielun",
        "label": "评审结论",
        "fields": [{ "name": "detail", "label": "通过/修改/不通过建议", "type": "textarea", "required": true }],
        "structure": ["形成评审结论和修改要求"],
        "speakingOrder": ["主持人/负责人（主持）", "参会人员（逐一发言）", "主持人（归纳）"],
        "keyPoints": "记录事实、意见、决定和分工；不编造；责任人和时限尽量明确",
        "tone": "务实、准确、简洁",
        "minSpeeches": 2
      }
    ],
    "builtin": true
  },
  {
    "id": "tpl-publicity-work",
    "kind": "meeting",
    "name": "宣传工作会（通用）",
    "meetingType": "宣传工作会",
    "label": "宣传工作",
    "description": "适用于宣传思想工作部署：明确重点、安排活动、落实分工。",
    "applicableMeetingTypes": ["宣传工作会"],
    "requiredInfo": ["meetingDate", "meetingTime", "location", "host", "recorder", "attendees"],
    "topics": [
      {
        "key": "xuanchuan_zhongdian",
        "label": "宣传重点",
        "fields": [{ "name": "detail", "label": "主题、口径、时间节点", "type": "textarea", "required": true }],
        "structure": ["通报宣传重点和要求"],
        "speakingOrder": ["主持人/负责人（主持）", "参会人员（逐一发言）", "主持人（归纳）"],
        "keyPoints": "记录事实、意见、决定和分工；不编造；责任人和时限尽量明确",
        "tone": "务实、准确、简洁",
        "minSpeeches": 2
      },      {
        "key": "huodong_anpai",
        "label": "活动安排",
        "fields": [{ "name": "detail", "label": "活动方案、平台、分工", "type": "textarea", "required": true }],
        "structure": ["讨论活动安排"],
        "speakingOrder": ["主持人/负责人（主持）", "参会人员（逐一发言）", "主持人（归纳）"],
        "keyPoints": "记录事实、意见、决定和分工；不编造；责任人和时限尽量明确",
        "tone": "务实、准确、简洁",
        "minSpeeches": 2
      },      {
        "key": "fengong_yaoqiu",
        "label": "分工要求",
        "fields": [{ "name": "detail", "label": "责任人、完成时限", "type": "textarea", "required": true }],
        "structure": ["明确任务分工"],
        "speakingOrder": ["主持人/负责人（主持）", "参会人员（逐一发言）", "主持人（归纳）"],
        "keyPoints": "记录事实、意见、决定和分工；不编造；责任人和时限尽量明确",
        "tone": "务实、准确、简洁",
        "minSpeeches": 2
      }
    ],
    "builtin": true
  },
  {
    "id": "tpl-publicity-event",
    "kind": "meeting",
    "name": "活动策划会（通用）",
    "meetingType": "活动策划会",
    "label": "活动策划",
    "description": "适用于主题活动、群团活动策划：方案讨论、流程设计、任务分工。",
    "applicableMeetingTypes": ["活动策划会"],
    "requiredInfo": ["meetingDate", "meetingTime", "location", "host", "recorder", "attendees"],
    "topics": [
      {
        "key": "fangan_jieshao",
        "label": "活动方案介绍",
        "fields": [{ "name": "detail", "label": "主题、对象、时间地点、流程", "type": "textarea", "required": true }],
        "structure": ["介绍初步方案"],
        "speakingOrder": ["主持人/负责人（主持）", "参会人员（逐一发言）", "主持人（归纳）"],
        "keyPoints": "记录事实、意见、决定和分工；不编造；责任人和时限尽量明确",
        "tone": "务实、准确、简洁",
        "minSpeeches": 2
      },      {
        "key": "taolun_wanshan",
        "label": "讨论完善",
        "fields": [{ "name": "detail", "label": "内容、形式、保障、风险", "type": "textarea", "required": true }],
        "structure": ["逐项讨论；提出修改意见"],
        "speakingOrder": ["主持人/负责人（主持）", "参会人员（逐一发言）", "主持人（归纳）"],
        "keyPoints": "记录事实、意见、决定和分工；不编造；责任人和时限尽量明确",
        "tone": "务实、准确、简洁",
        "minSpeeches": 2
      },      {
        "key": "renwu_fengong",
        "label": "任务分工",
        "fields": [{ "name": "detail", "label": "筹备组、责任人、时限", "type": "textarea", "required": true }],
        "structure": ["明确分工和节点"],
        "speakingOrder": ["主持人/负责人（主持）", "参会人员（逐一发言）", "主持人（归纳）"],
        "keyPoints": "记录事实、意见、决定和分工；不编造；责任人和时限尽量明确",
        "tone": "务实、准确、简洁",
        "minSpeeches": 2
      }
    ],
    "builtin": true
  },
  {
    "id": "tpl-teaching-research",
    "kind": "meeting",
    "name": "教研会（通用）",
    "meetingType": "教研会",
    "label": "教研活动",
    "description": "适用于教学研究、集体备课、教学质量分析。",
    "applicableMeetingTypes": ["教研会"],
    "requiredInfo": ["meetingDate", "meetingTime", "location", "host", "recorder", "attendees"],
    "topics": [
      {
        "key": "jiaoxue_qingkuang",
        "label": "教学情况",
        "fields": [{ "name": "detail", "label": "课程进度、学情、问题", "type": "textarea", "required": true }],
        "structure": ["通报教学情况"],
        "speakingOrder": ["主持人/负责人（主持）", "参会人员（逐一发言）", "主持人（归纳）"],
        "keyPoints": "记录事实、意见、决定和分工；不编造；责任人和时限尽量明确",
        "tone": "务实、准确、简洁",
        "minSpeeches": 2
      },      {
        "key": "jiaoyan_zhuti",
        "label": "教研主题",
        "fields": [{ "name": "detail", "label": "教研内容、方法、案例", "type": "textarea", "required": true }],
        "structure": ["围绕主题研讨"],
        "speakingOrder": ["主持人/负责人（主持）", "参会人员（逐一发言）", "主持人（归纳）"],
        "keyPoints": "记录事实、意见、决定和分工；不编造；责任人和时限尽量明确",
        "tone": "务实、准确、简洁",
        "minSpeeches": 2
      },      {
        "key": "gaijin_cuoshi",
        "label": "改进措施",
        "fields": [{ "name": "detail", "label": "教学改进、责任分工", "type": "textarea", "required": true }],
        "structure": ["形成改进措施"],
        "speakingOrder": ["主持人/负责人（主持）", "参会人员（逐一发言）", "主持人（归纳）"],
        "keyPoints": "记录事实、意见、决定和分工；不编造；责任人和时限尽量明确",
        "tone": "务实、准确、简洁",
        "minSpeeches": 2
      }
    ],
    "builtin": true
  },
  {
    "id": "tpl-teaching-project",
    "kind": "meeting",
    "name": "课题研讨会（通用）",
    "meetingType": "课题研讨会",
    "label": "课题研讨",
    "description": "适用于课题开题、中期、结题研讨。",
    "applicableMeetingTypes": ["课题研讨会"],
    "requiredInfo": ["meetingDate", "meetingTime", "location", "host", "recorder", "attendees"],
    "topics": [
      {
        "key": "keti_jinzhan",
        "label": "课题进展",
        "fields": [{ "name": "detail", "label": "研究内容、进展、阶段成果", "type": "textarea", "required": true }],
        "structure": ["汇报课题进展"],
        "speakingOrder": ["主持人/负责人（主持）", "参会人员（逐一发言）", "主持人（归纳）"],
        "keyPoints": "记录事实、意见、决定和分工；不编造；责任人和时限尽量明确",
        "tone": "务实、准确、简洁",
        "minSpeeches": 2
      },      {
        "key": "zhuanjia_yijian",
        "label": "研讨意见",
        "fields": [{ "name": "detail", "label": "方法、数据、结论意见", "type": "textarea", "required": true }],
        "structure": ["逐人研讨；记录意见"],
        "speakingOrder": ["主持人/负责人（主持）", "参会人员（逐一发言）", "主持人（归纳）"],
        "keyPoints": "记录事实、意见、决定和分工；不编造；责任人和时限尽量明确",
        "tone": "务实、准确、简洁",
        "minSpeeches": 2
      },      {
        "key": "xiabu_jihua",
        "label": "下一步计划",
        "fields": [{ "name": "detail", "label": "修改、补充、时间安排", "type": "textarea", "required": true }],
        "structure": ["明确下一步任务"],
        "speakingOrder": ["主持人/负责人（主持）", "参会人员（逐一发言）", "主持人（归纳）"],
        "keyPoints": "记录事实、意见、决定和分工；不编造；责任人和时限尽量明确",
        "tone": "务实、准确、简洁",
        "minSpeeches": 2
      }
    ],
    "builtin": true
  },
  {
    "id": "tpl-governance-grid",
    "kind": "meeting",
    "name": "网格调度会（通用）",
    "meetingType": "网格调度会",
    "label": "网格调度",
    "description": "适用于网格化治理调度：通报网格情况、处置问题、部署任务。",
    "applicableMeetingTypes": ["网格调度会"],
    "requiredInfo": ["meetingDate", "meetingTime", "location", "host", "recorder", "attendees"],
    "topics": [
      {
        "key": "wangge_qingkuang",
        "label": "网格情况",
        "fields": [{ "name": "detail", "label": "巡查、诉求、风险隐患", "type": "textarea", "required": true }],
        "structure": ["通报网格情况"],
        "speakingOrder": ["主持人/负责人（主持）", "参会人员（逐一发言）", "主持人（归纳）"],
        "keyPoints": "记录事实、意见、决定和分工；不编造；责任人和时限尽量明确",
        "tone": "务实、准确、简洁",
        "minSpeeches": 2
      },      {
        "key": "wenti_chuzhi",
        "label": "问题处置",
        "fields": [{ "name": "detail", "label": "问题清单、责任单位、处置结果", "type": "textarea", "required": true }],
        "structure": ["逐项研究处置"],
        "speakingOrder": ["主持人/负责人（主持）", "参会人员（逐一发言）", "主持人（归纳）"],
        "keyPoints": "记录事实、意见、决定和分工；不编造；责任人和时限尽量明确",
        "tone": "务实、准确、简洁",
        "minSpeeches": 2
      },      {
        "key": "gongzuo_anpai",
        "label": "工作安排",
        "fields": [{ "name": "detail", "label": "重点任务、走访、反馈", "type": "textarea", "required": true }],
        "structure": ["部署下一步工作"],
        "speakingOrder": ["主持人/负责人（主持）", "参会人员（逐一发言）", "主持人（归纳）"],
        "keyPoints": "记录事实、意见、决定和分工；不编造；责任人和时限尽量明确",
        "tone": "务实、准确、简洁",
        "minSpeeches": 2
      }
    ],
    "builtin": true
  },
  {
    "id": "tpl-governance-residents",
    "kind": "meeting",
    "name": "居民议事会（通用）",
    "meetingType": "居民议事会",
    "label": "居民议事",
    "description": "适用于社区议事协商：说明议题、听取意见、形成共识。",
    "applicableMeetingTypes": ["居民议事会"],
    "requiredInfo": ["meetingDate", "meetingTime", "location", "host", "recorder", "attendees"],
    "topics": [
      {
        "key": "yiti_shuoming",
        "label": "议题说明",
        "fields": [{ "name": "detail", "label": "议题背景、涉及范围、初步方案", "type": "textarea", "required": true }],
        "structure": ["说明议题和方案"],
        "speakingOrder": ["主持人/负责人（主持）", "参会人员（逐一发言）", "主持人（归纳）"],
        "keyPoints": "记录事实、意见、决定和分工；不编造；责任人和时限尽量明确",
        "tone": "务实、准确、简洁",
        "minSpeeches": 2
      },      {
        "key": "jumin_yijian",
        "label": "居民意见",
        "fields": [{ "name": "detail", "label": "诉求、建议、不同意见", "type": "textarea", "required": true }],
        "structure": ["逐人发言；记录意见"],
        "speakingOrder": ["主持人/负责人（主持）", "参会人员（逐一发言）", "主持人（归纳）"],
        "keyPoints": "记录事实、意见、决定和分工；不编造；责任人和时限尽量明确",
        "tone": "务实、准确、简洁",
        "minSpeeches": 2
      },      {
        "key": "yiding_shixiang",
        "label": "议定事项",
        "fields": [{ "name": "detail", "label": "共识、责任、反馈方式", "type": "textarea", "required": true }],
        "structure": ["形成议定事项和落实安排"],
        "speakingOrder": ["主持人/负责人（主持）", "参会人员（逐一发言）", "主持人（归纳）"],
        "keyPoints": "记录事实、意见、决定和分工；不编造；责任人和时限尽量明确",
        "tone": "务实、准确、简洁",
        "minSpeeches": 2
      }
    ],
    "builtin": true
  }
]
