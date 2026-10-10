import { readFileSync } from 'node:fs'

function loadEnv(p = '.env.local') {
  const out = {}
  try {
    for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const i = t.indexOf('=')
      if (i <= 0) continue
      const k = t.slice(0, i).trim()
      let v = t.slice(i + 1).trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
      out[k] = v
    }
  } catch {}
  return out
}

const env = { ...process.env, ...loadEnv('.env.local') }
const apiKey = env.HUNYUAN_API_KEY || env.OPENAI_API_KEY || env.LLM_API_KEY || ''
const baseURL = (env.HUNYUAN_BASE_URL || env.OPENAI_BASE_URL || env.LLM_BASE_URL || 'https://api.hunyuan.cloud.tencent.com/v1').replace(/\/+$/, '')
const model = env.HUNYUAN_MODEL || env.LLM_MODEL || 'hunyuan-turbos'
const url = baseURL + '/chat/completions'

const SYSTEM = `你是「彼此_Autograder」的评分智能体，负责对中国高校计算机实验报告进行严格的逐项评分。
工作准则：
1. 绝不凭空判断：必须先调用 get_rubric 获取评分细则，再用 search_evidence 检索报告原文证据，再依据证据打分。
2. 证据必须真实：每个评分点的 chunkId 必须来自 search_evidence 的返回；quote 必须是返回文本中的原句。
3. 找不到证据就判 missing（0 分）。
最终只输出一个 JSON 对象，不要输出任何多余文字，结构如下：
{"points":[{"pointId":"p1","score":8,"verdict":"partial","chunkId":"chunk_002","quote":"原文原句","reason":"判定理由","suggestion":"修改建议"}],"comment":"总评语"}
其中 verdict 只能是 full / partial / missing；score 为 0 到该点满分之间的整数。`

const USER = `请评改以下实验报告（共 9 个证据块）。报告章节索引：
- chunk_001：操作系统实验二
- chunk_002：姓名：测试
- chunk_003：一、实验目的
- chunk_004：二、实验原理
- chunk_005：三、数据结构设计
- chunk_006：四、核心算法实现
- chunk_007：五、测试与结果分析
- chunk_008：六、性能对比
- chunk_009：七、实验结论
请先获取评分细则，再逐个评分点检索证据，完成逐项评分并输出 JSON。`

const tools = [
  { type: 'function', function: { name: 'get_rubric', description: '获取评分细则', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'search_evidence', description: '检索证据块', parameters: { type: 'object', properties: { pointId: { type: 'string' }, query: { type: 'string' } } } } },
]

// 模拟工具实现
const RUBRIC = [
  { pointId: 'p1', title: '实验目的与原理阐述', maxScore: 10, criteria: ['明确写出实验目的', '原理阐述完整准确'], mustInclude: ['实验目的', '实验原理'] },
  { pointId: 'p2', title: '时间片轮转算法实现', maxScore: 25, criteria: ['RR 主循环结构正确', '时间片耗尽处理正确'], mustInclude: ['关键代码', '边界处理'] },
  { pointId: 'p3', title: '关键数据结构设计', maxScore: 15, criteria: ['PCB 字段完整', '队列选型合理'], mustInclude: ['PCB 字段', '队列选型'] },
]
const CHUNKS = {
  chunk_003: { id: 'chunk_003', section: '一、实验目的', text: '一、实验目的\n学习进程调度。' },
  chunk_004: { id: 'chunk_004', section: '二、实验原理', text: '二、实验原理\n时间片轮转。' },
  chunk_005: { id: 'chunk_005', section: '三、数据结构设计', text: '三、数据结构设计\nPCB 含 pid、state、remaining、priority；就绪队列用 queue。' },
  chunk_006: { id: 'chunk_006', section: '四、核心算法实现', text: '四、核心算法实现\nwhile(!empty()){ p=front(); pop(); p.remaining-=2; push(p); }' },
}

function runTool(name, args) {
  if (name === 'get_rubric') return { points: RUBRIC }
  if (name === 'search_evidence') {
    const res = []
    if (args.pointId === 'p1') res.push(CHUNKS.chunk_003, CHUNKS.chunk_004)
    else if (args.pointId === 'p2') res.push(CHUNKS.chunk_006)
    else if (args.pointId === 'p3') res.push(CHUNKS.chunk_005)
    if (!res.length) res.push(CHUNKS.chunk_003)
    return { count: res.length, results: res }
  }
  return {}
}

async function call(messages) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, tools, tool_choice: 'auto', stream: false }),
  })
  return res.json()
}

const messages = [{ role: 'system', content: SYSTEM }, { role: 'user', content: USER }]

for (let round = 1; round <= 5; round++) {
  const data = await call(messages)
  const msg = data.choices?.[0]?.message
  const fr = data.choices?.[0]?.finish_reason
  console.log(`\n===== 第 ${round} 轮 finish_reason=${fr} =====`)
  if (msg?.content) {
    console.log('最终 content（前 1200 字）:\n' + String(msg.content).slice(0, 1200))
    break
  }
  if (msg?.tool_calls?.length) {
    console.log('调用工具:', msg.tool_calls.map((t) => t.function?.name + '(' + (t.function?.arguments || '').slice(0, 60) + ')').join('  '))
    // 追加 assistant(tool_calls) 消息
    messages.push({ role: 'assistant', content: msg.content || null, tool_calls: msg.tool_calls })
    // 追加 tool 结果消息
    for (const tc of msg.tool_calls) {
      const args = JSON.parse(tc.function.arguments || '{}')
      const result = runTool(tc.function.name, args)
      messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result) })
    }
  } else {
    console.log('无 content 也无 tool_calls，原始 message:', JSON.stringify(msg).slice(0, 600))
    break
  }
}
