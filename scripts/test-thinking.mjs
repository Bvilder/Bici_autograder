import { readFileSync } from 'node:fs'
const env = {}
for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const i = t.indexOf('=')
  if (i > 0) env[t.slice(0, i).trim()] = t.slice(i + 1).trim()
}
const key = env.HUNYUAN_API_KEY
const url = env.LLM_BASE_URL.replace(/\/+$/, '') + '/chat/completions'
const model = env.LLM_MODEL

const rubric = `- p1 实验目的与原理阐述（满分10）：明确写出实验目的；原理阐述完整准确
- p2 时间片轮转算法实现（满分25）：RR 主循环结构正确；时间片耗尽处理正确；统计上下文切换次数
- p3 关键数据结构设计（满分15）：PCB 字段完整；队列选型合理；选型理由说明清晰
- p4 测试与结果分析（满分20）：提供测试用例；结果数据完整；多组对照实验
- p5 性能对比与实验结论（满分15）：与基准算法对比；给出量化数据；结论有推导依据
- p6 报告格式与引用规范（满分15）：格式规范；图表编号齐全`

const evidence = `- p1：[chunk_003] 本实验旨在通过实现时间片轮转与优先级调度两种算法，理解进程调度中上下文切换的开销来源。
- p2：[chunk_006] while (!ready_queue.empty()) { PCB p = front(); pop(); p.remaining -= time_slice; if (p.remaining > 0) push(p); }
- p3：[chunk_005] 进程控制块采用结构体 PCB 描述，包含 pid、state、remaining、priority；就绪队列用 queue，阻塞队列用 list。
- p4：[chunk_007] 以 5 个进程、时间片等于 2 测试，平均周转时间 6.8，平均等待时间 4.2。
- p5：[chunk_008] 相比先来先服务，轮转调度平均等待时间缩短约 23%，但上下文切换次数增加一倍。
- p6：[chunk_009] 通过本次实验，理解了调度算法需在响应时间与切换开销之间做权衡。`

const SYSTEM = `你是评分智能体，根据评分细则和报告证据逐点评分，直接输出一个 JSON 对象，不要输出多余文字、不要 markdown。结构：{"points":[{"pointId":"p1","score":8,"verdict":"partial","chunkId":"chunk_003","quote":"原句","reason":"理由","suggestion":"建议"}],"comment":"总评语"}。verdict 只能是 full/partial/missing，score 为 0 到满分之间的整数，quote 必须是证据文本里的原句。`
const prompt = `评分细则：\n${rubric}\n\n报告证据：\n${evidence}\n\n请据此逐点评分，直接输出 JSON。`

async function test(label, body) {
  const t0 = Date.now()
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
    body: JSON.stringify(body),
  })
  const txt = await res.text()
  const s = ((Date.now() - t0) / 1000).toFixed(1)
  process.stdout.write(`[${label}] HTTP ${res.status} 耗时 ${s}s | `)
  if (!res.ok) { process.stdout.write('ERROR ' + txt.slice(0, 200) + '\n'); return }
  try {
    const d = JSON.parse(txt)
    const c = d.choices?.[0]?.message?.content || ''
    const rc = d.choices?.[0]?.message?.reasoning_content || ''
    process.stdout.write(`content ${c.length} 字 / reasoning ${rc.length} 字 | ${c.slice(0, 80)}\n`)
  } catch { process.stdout.write('parse失败 ' + txt.slice(0, 120) + '\n') }
}

const base = { model, messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: prompt }], stream: false, temperature: 0.2 }
await test('关思考 thinking=disabled', { ...base, thinking: { type: 'disabled' } })
