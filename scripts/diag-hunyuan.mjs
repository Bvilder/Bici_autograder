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

const USER = `请评改以下实验报告。报告章节索引：
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

console.log(`== 诊断 ${model} @ ${url} ==\n`)

// 1) 非流式，看 message 结构
{
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: USER }], tools, tool_choice: 'auto', stream: false }),
  })
  const data = await res.json()
  console.log('--- [非流式] HTTP', res.status, 'finish_reason:', data.choices?.[0]?.finish_reason)
  const msg = data.choices?.[0]?.message
  console.log('message keys:', Object.keys(msg || {}))
  if (msg?.reasoning_content != null) console.log('reasoning_content:', String(msg.reasoning_content).slice(0, 300))
  if (msg?.content) console.log('content:', String(msg.content).slice(0, 800))
  if (msg?.tool_calls?.length) console.log('tool_calls:', JSON.stringify(msg.tool_calls.map((t) => ({ name: t.function?.name, args: t.function?.arguments?.slice(0, 120) }))))
  if (!msg?.content && !msg?.tool_calls?.length) console.log('原始 message:', JSON.stringify(msg).slice(0, 800))
  if (!res.ok) console.log('ERROR body:', JSON.stringify(data).slice(0, 800))
}

console.log('\n')

// 2) 流式，看 delta 类型
{
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: USER }], tools, tool_choice: 'auto', stream: true }),
  })
  console.log('--- [流式] HTTP', res.status)
  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buf = ''
  let content = ''
  let reasoning = ''
  let toolNames = []
  let n = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    for (const line of buf.split('\n')) {
      const l = line.trim()
      if (!l.startsWith('data:')) continue
      const j = l.slice(5).trim()
      if (j === '[DONE]') continue
      let d; try { d = JSON.parse(j) } catch { continue }
      const delta = d.choices?.[0]?.delta
      if (!delta) continue
      if (delta.content) { content += delta.content; n++ }
      if (delta.reasoning_content) reasoning += delta.reasoning_content
      if (delta.tool_calls) for (const t of delta.tool_calls) if (t.function?.name) toolNames.push(t.function.name)
      if (n <= 3) console.log('  delta sample:', JSON.stringify(delta).slice(0, 200))
    }
  }
  console.log('累计 content 长度:', content.length)
  console.log('累计 reasoning 长度:', reasoning.length)
  console.log('tool_calls 名:', toolNames.join(', ') || '(无)')
  console.log('content 前 400 字:', content.slice(0, 400))
  if (reasoning) console.log('reasoning 前 300 字:', reasoning.slice(0, 300))
}
