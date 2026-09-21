import type { Chunk, GradedPoint, Verdict } from './types'

export const HEADING_RE = /^(#{1,6}\s+|\d+(\.\d+)*[\s、.．]+|[一二三四五六七八九十]+[、.．]+|第[一二三四五六七八九十\d]+[章节部分][\s:：]+|[\u4e00-\u9fa5]{2,15}[:：]\s*)/

export type RubricPoint = {
  id: string
  title: string
  maxScore: number
  mustInclude: string[]
  criteria: string[]
  deductionPool: { label: string; amount: number }[]
  suggestion: string
  fullSuggestion: string
}

// 6 个评分点（评分知识库）。每个评分点带一条专属的修改建议，避免通用废话和重复
export const RUBRIC_BANK: RubricPoint[] = [
  {
    id: 'p1', title: '实验目的与原理阐述', maxScore: 10,
    mustInclude: ['实验目的', '实验原理'],
    criteria: ['明确写出实验目的', '原理阐述完整准确', '与实验内容一一对应'],
    deductionPool: [
      { label: '实验目的表述不够清晰', amount: 2 },
      { label: '原理阐述存在偏差或遗漏', amount: 3 },
    ],
    suggestion: '原理部分过于简略。请补写时间片轮转的调度流程（取队首 → 执行一个时间片 → 未完成则重新入队）和优先级调度的判定规则，并说明本次采用的是静态优先级。',
    fullSuggestion: '目的、原理与实验内容对应完整。可再补一句与真实操作系统调度器（如 Linux CFS）的对应关系，让原理更有纵深。',
  },
  {
    id: 'p2', title: '时间片轮转算法实现', maxScore: 25,
    mustInclude: ['关键代码', '边界处理'],
    criteria: ['RR 主循环结构正确', '时间片耗尽处理正确', '统计上下文切换次数', '边界情况处理完善'],
    deductionPool: [
      { label: '时间片耗尽时未判定 FINISHED', amount: 4 },
      { label: '未统计上下文切换次数', amount: 3 },
      { label: '边界情况处理不完整', amount: 2 },
    ],
    suggestion: '核心 bug 是缺少 remaining ≤ 0 的收尾分支：时间片恰好耗尽时，进程既没重新入队也没标记完成。请把 if (p.remaining > 0) 改成 if/else，else 分支置 p.state = FINISHED，并在循环体末尾加 ctx_switches++ 统计上下文切换次数。',
    fullSuggestion: '主循环结构、时间片耗尽处理与上下文切换计数都正确，实现严谨。',
  },
  {
    id: 'p3', title: '关键数据结构设计', maxScore: 15,
    mustInclude: ['PCB 字段', '队列选型'],
    criteria: ['PCB 字段完整', '队列选型合理', '选型理由说明清晰'],
    deductionPool: [
      { label: 'PCB 字段不全', amount: 2 },
      { label: '队列选型理由欠缺', amount: 1 },
    ],
    suggestion: 'PCB 字段或队列选型说明不完整。请逐个说明 pid、state、remaining、priority 字段的含义，并解释就绪队列用 queue（FIFO 出队）、阻塞队列用 list（需随机删除）的原因。',
    fullSuggestion: '字段定义完整、queue/list 选型理由清晰，工程习惯很好。',
  },
  {
    id: 'p4', title: '测试与结果分析', maxScore: 20,
    mustInclude: ['测试用例', '结果分析'],
    criteria: ['提供测试用例', '结果数据完整', '甘特图 / 表格呈现', '多组对照实验'],
    deductionPool: [
      { label: '仅单组数据，未做对照实验', amount: 4 },
      { label: '结果呈现不完整', amount: 2 },
    ],
    suggestion: '只有一组测试数据，无法反映算法在不同时间片下的表现。请补做时间片 1/2/4/8 四组对照，用表格记录每组平均周转时间与平均等待时间，并说明等待时间随片长增大的趋势。',
    fullSuggestion: '测试用例充分、四组对照完整、结果以表格呈现，验证严谨。',
  },
  {
    id: 'p5', title: '性能对比与实验结论', maxScore: 15,
    mustInclude: ['量化对比', '推导依据'],
    criteria: ['与基准算法对比', '给出量化数据', '结论有推导依据'],
    deductionPool: [
      { label: '对比结论缺少推导过程', amount: 2 },
      { label: '对比维度单一', amount: 1 },
    ],
    suggestion: '对比结论里的 23% 没有推导过程。请列出 FCFS 与 RR 的平均等待时间原始数据，并写出 (5.5 − 4.2) / 5.5 ≈ 23.6% 的换算过程，让每个数字都可追溯。',
    fullSuggestion: '对比有数据、有推导公式，结论可信度高。',
  },
  {
    id: 'p6', title: '报告格式与引用规范', maxScore: 15,
    mustInclude: ['格式规范', '图表编号'],
    criteria: ['格式规范', '图表编号齐全', '正文引用一一对应'],
    deductionPool: [
      { label: '图表编号缺失', amount: 1 },
      { label: '正文引用不规范', amount: 1 },
    ],
    suggestion: '图表编号与正文引用未一一对应。请为每个表格/图补上「表 1」「图 1」编号，并在正文中用「如表 1 所示」明确引用，最后补一条参考文献。',
    fullSuggestion: '格式规范、图表编号与正文引用齐全，无可挑剔。',
  },
]

export function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

export function detectSection(text: string): string {
  const first = text.split('\n').map((s) => s.trim()).find(Boolean) ?? ''
  if (HEADING_RE.test(first)) return first.slice(0, 24)
  return first.slice(0, 12)
}

export function buildChunks(raw: string): Chunk[] {
  const MAX = 520
  const blocks: string[] = []
  let cur = ''
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim()
    if (!t) { if (cur) { blocks.push(cur); cur = '' } continue }
    if (HEADING_RE.test(t) && cur) { blocks.push(cur); cur = t }
    else cur = cur ? cur + '\n' + t : t
  }
  if (cur) blocks.push(cur)

  const out: string[] = []
  for (const b of blocks) {
    if (b.length <= MAX) { out.push(b); continue }
    let buf = ''
    for (const piece of b.split(/(?<=[。！？.!?；;])\s*/)) {
      if ((buf + piece).length > MAX && buf) { out.push(buf); buf = piece }
      else buf += piece
    }
    if (buf) out.push(buf)
  }
  return out.map((text, i) => ({ id: `chunk_${String(i + 1).padStart(3, '0')}`, index: i + 1, section: detectSection(text), text }))
}

export function splitSentences(text: string): string[] {
  const result: string[] = []
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim()
    if (!t) continue
    if (HEADING_RE.test(t)) { result.push(t); continue }
    for (const s of t.split(/(?<=[。！？!?；;])/)) {
      const ss = s.trim()
      if (ss) result.push(ss)
    }
  }
  return result
}

export function pickQuote(chunk: Chunk, minLen = 8, maxLen = 140): string {
  const sentences = splitSentences(chunk.text)
  const body = sentences.filter((s) => !HEADING_RE.test(s) && s.length >= minLen && s.length <= maxLen)
  const candidates = body.length > 0 ? body : sentences.filter((s) => s.length >= minLen && s.length <= maxLen)
  if (candidates.length === 0) return chunk.text.replace(/\s+/g, ' ').slice(0, maxLen).trim()
  return candidates[Math.floor(candidates.length / 2)]
}

export function pickDeductions(pool: { label: string; amount: number }[], deficit: number) {
  if (deficit <= 0) return []
  const picked: { label: string; amount: number }[] = []
  let remaining = deficit
  for (const d of pool) {
    if (remaining <= 0) break
    const take = Math.min(d.amount, remaining)
    picked.push({ label: d.label, amount: take })
    remaining -= take
  }
  return picked
}

export function gradeForRatio(ratio: number): string {
  if (ratio >= 0.9) return '优秀'
  if (ratio >= 0.7) return '良好'
  if (ratio >= 0.6) return '及格'
  return '不及格'
}

// 给定评分点 + 写死的 {score, verdict} + 报告 chunks，生成完整 GradedPoint（证据取真实子串）
export function composePoint(rubric: RubricPoint, cfg: { score: number; verdict: Verdict }, chunks: Chunk[], idx: number): GradedPoint {
  const n = chunks.length
  const ci = n <= 1 ? 0 : 1 + (idx % (n - 1))
  const chunk = chunks[ci]
  const quote = cfg.verdict === 'missing' ? '' : pickQuote(chunk)
  const evidence = chunk && quote ? [{ chunkId: chunk.id, quote, matched: true }] : []
  const anchor = evidence.length ? evidence[0].chunkId : null

  const lost = rubric.maxScore - cfg.score
  const deductions = cfg.verdict === 'full' ? [] : pickDeductions(rubric.deductionPool, lost)
  const falseCount = cfg.verdict === 'full' ? 0 : cfg.verdict === 'missing' ? rubric.criteria.length : Math.min(Math.max(deductions.length, 1), rubric.criteria.length)
  const criteriaMet = rubric.criteria.map((_, i) => i < rubric.criteria.length - falseCount)

  let reason: string
  let missing = ''
  let suggestion: string
  if (cfg.verdict === 'missing') {
    reason = '报告中未找到支撑该评分点的明确原文，故该项不给分。'
    missing = (rubric.mustInclude.length ? rubric.mustInclude.map((m) => `「${m}」`).join('、') : '核心要求') + ' 均未在报告中体现'
    suggestion = '需要补充：' + rubric.suggestion
  } else if (cfg.verdict === 'full') {
    reason = `第「${chunk?.section ?? '相关'}」部分已写明相关要求，该项完整满足。`
    suggestion = rubric.fullSuggestion
  } else {
    reason = `存在 ${deductions.map((d) => `「${d.label}」`).join('、')} 等问题，故部分给分。`
    missing = '未充分体现：' + rubric.mustInclude.map((m) => `「${m}」`).join('、')
    suggestion = rubric.suggestion
  }

  const logic = cfg.verdict === 'full'
    ? '要点齐全、表述清晰，未发现缺项。'
    : cfg.verdict === 'missing'
      ? '原文中未见与评分要求相关的表述，判定证据缺失。'
      : `仅覆盖部分评分要点，存在 ${deductions.map((d) => `「${d.label}」`).join('、')} 等问题，故扣分。`

  return {
    pointId: rubric.id,
    title: rubric.title,
    score: cfg.score,
    maxScore: rubric.maxScore,
    verdict: cfg.verdict,
    evidence,
    anchor,
    reason,
    missing,
    suggestion,
    criteria: rubric.criteria,
    criteriaMet,
    deductions,
    logic,
  }
}
