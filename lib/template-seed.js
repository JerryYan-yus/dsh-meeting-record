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
]
