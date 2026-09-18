import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

export const runtime = 'nodejs'
export const maxDuration = 60

/* ------------------------------------------------------------------ */
/* 类型                                                                */
/* ------------------------------------------------------------------ */

type Verdict = 'full' | 'partial' | 'missing'

type Chunk = { id: string; index: number; section: string; text: string }

type Evidence = { chunkId: string; quote: string; matched: boolean }

type GradedPoint = {
  pointId: string
  title: string
  score: number
  maxScore: number
  verdict: Verdict
  evidence: Evidence[]
  anchor: string | null
  reason: string
  missing: string
  suggestion: string
}

/* ------------------------------------------------------------------ */
/* 输入校验（Zod）                                                      */
/* ------------------------------------------------------------------ */

const RubricPointIn = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  maxScore: z.number().positive(),
  description: z.string().optional(),
  mustInclude: z.array(z.string()).optional(),
})

const GradeRequest = z.object({
  reportText: z.string().min(1, '报告正文不能为空'),
  fileName: z.string().optional(),
  rubric: z.array(RubricPointIn).optional(),
})

/* ------------------------------------------------------------------ */
/* 工具                                                                */
/* ------------------------------------------------------------------ */

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

// FNV-1a 哈希：让同一份报告/评分点在多次请求间得到稳定、可复现的分数
function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function detectSection(text: string): string {
  const first = text.split('\n').map((s) => s.trim()).find(Boolean) ?? ''
  if (/^(#{1,6}\s|\d+(\.\d+)*[\s、.．]|[一二三四五六七八九十]+[、.．]|第[一二三四五六七八九十\d]+[章节部分]|[\u4e00-\u9fa5]{2,15}[:：])/.test(first)) {
    return first.slice(0, 24)
  }
  return first.slice(0, 12)
}

function buildChunks(raw: string): Chunk[] {
  const MAX = 520
  const blocks: string[] = []
  let cur = ''
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim()
    if (!t) {
      if (cur) { blocks.push(cur); cur = '' }
      continue
    }
    const isHeading = /^(#{1,6}\s|\d+(\.\d+)*[\s、.．]|[一二三四五六七八九十]+[、.．]|第[一二三四五六七八九十\d]+[章节部分]|[\u4e00-\u9fa5]{2,15}[:：])/.test(t)
    if (isHeading && cur) { blocks.push(cur); cur = t }
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

  return out.map((text, i) => ({
    id: `chunk_${String(i + 1).padStart(3, '0')}`,
    index: i + 1,
    section: detectSection(text),
    text,
  }))
}

const HEADING_RE = /^(#{1,6}\s+|\d+(\.\d+)*[\s、.．]+|[一二三四五六七八九十]+[、.．]+|第[一二三四五六七八九十\d]+[章节部分][\s:：]+|[\u4e00-\u9fa5]{2,15}[:：]\s*)/

function splitSentences(text: string): string[] {
  const result: string[] = []
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim()
    if (!t) continue
    if (HEADING_RE.test(t)) {
      result.push(t)
      continue
    }
    for (const s of t.split(/(?<=[。！？!?；;])/)) {
      const ss = s.trim()
      if (ss) result.push(ss)
    }
  }
  return result
}

// 从证据块里挑一句"真实原文"作为引用 —— 保证前端点"定位原文"一定能高亮到
function pickQuote(chunk: Chunk, minLen = 8, maxLen = 140): string {
  const sentences = splitSentences(chunk.text)
  const body = sentences.filter((s) => !HEADING_RE.test(s) && s.length >= minLen && s.length <= maxLen)
  const candidates = body.length > 0 ? body : sentences.filter((s) => s.length >= minLen && s.length <= maxLen)
  if (candidates.length === 0) {
    return chunk.text.replace(/\s+/g, ' ').slice(0, maxLen).trim()
  }
  return candidates[Math.floor(candidates.length / 2)]
}

function clampScore(score: number, max: number): number {
  return Math.round(Math.min(Math.max(0, score), max) * 10) / 10
}

function gradeForRatio(ratio: number): '优秀' | '良好' | '中等' | '及格' | '不及格' {
  if (ratio >= 0.9) return '优秀'
  if (ratio >= 0.8) return '良好'
  if (ratio >= 0.7) return '中等'
  if (ratio >= 0.6) return '及格'
  return '不及格'
}

/* ------------------------------------------------------------------ */
/* 教师评语库（按哈希抽取，保证稳定）                                    */
/* ------------------------------------------------------------------ */

const SUGGESTIONS = [
  '建议在对应小节补充更完整的推导过程与关键代码片段，并附上必要的实验数据，避免只给结论。',
  '该部分已有基础表述，建议补充具体的测试用例与截图，让结论更有说服力。',
  '请在正文中明确关键步骤的实现细节，写明用了什么数据结构、为什么这样选，而非一笔带过。',
  '建议补做对照组实验或多种参数下的结果对比，用表格呈现，避免单一数据下结论。',
  '结论方向正确，但缺少计算过程支撑，请列出原始数据与换算公式，让结果可复核。',
  '请补上关键函数的注释与复杂度分析，说明边界条件的处理方式。',
  '格式整体规范，建议为图表补充编号与正文引用，使图文一一对应。',
]

const FULL_PRAISE = [
  '本项完成度较高，要点齐全、表述清晰，可在此基础上补充更严谨的细节。',
  '该项要求已完整满足，证据充分，继续完善其他评分点即可。',
]

const MISSING_REASON = [
  '报告中未找到支撑该评分点的明确原文，故该项不给分。',
  '该评分点要求的内容在正文中未见体现，无法给分。',
]

/* ------------------------------------------------------------------ */
/* 默认评分点（rubric 为空时兜底）                                      */
/* ------------------------------------------------------------------ */

const DEFAULT_RUBRIC: z.infer<typeof RubricPointIn>[] = [
  { id: 'p1', title: '实验目的与原理阐述', maxScore: 10, mustInclude: ['实验目的', '实验原理'] },
  { id: 'p2', title: '核心算法实现正确性', maxScore: 25, mustInclude: ['关键代码', '边界处理'] },
  { id: 'p3', title: '测试与结果分析', maxScore: 20, mustInclude: ['测试用例', '结果分析'] },
]

/* ------------------------------------------------------------------ */
/* 逐评分点生成（确定性，逼真）                                          */
/* ------------------------------------------------------------------ */

function gradePoint(point: z.infer<typeof RubricPointIn>, chunks: Chunk[], idx: number): GradedPoint {
  // 跳过标题块，按评分点顺序分散到不同正文块，让引用更贴合主题
  const n = chunks.length
  const ci = n <= 1 ? 0 : 1 + ((hashString(point.id) + idx * 7) % (n - 1))
  const chunk = chunks[ci]

  // 9% 概率判为"缺失/0 分"，还原真实评分里"真没写"的情况
  const isMissing = hashString(point.id + 'miss') % 11 === 0

  const r = (hashString(point.id + 'ratio') % 100) / 100
  let ratio: number
  if (r < 0.2) ratio = 0.4 + (hashString(point.id + 'x') % 20) / 100 // 0.40–0.59
  else if (r < 0.62) ratio = 0.62 + (hashString(point.id + 'x') % 20) / 100 // 0.62–0.81
  else ratio = 0.88 + (hashString(point.id + 'x') % 10) / 100 // 0.88–0.97

  let verdict: Verdict = ratio >= 0.85 ? 'full' : 'partial'
  let score = clampScore(Math.round(ratio * point.maxScore * 10) / 10, point.maxScore)

  if (isMissing) {
    verdict = 'missing'
    score = 0
  }

  if (verdict === 'partial') {
    score = clampScore(Math.min(score, point.maxScore * 0.6), point.maxScore)
  }

  const quote = chunk ? pickQuote(chunk) : ''
  const evidence: Evidence[] = chunk && quote && verdict !== 'missing'
    ? [{ chunkId: chunk.id, quote, matched: true }]
    : []

  const anchor = evidence.length ? evidence[0].chunkId : null
  const sectionLabel = chunk ? `第「${chunk.section}」部分` : '报告'

  const sIdx = hashString(point.id + 'sugg') % SUGGESTIONS.length

  let reason: string
  let missing = ''
  let suggestion: string

  if (verdict === 'missing') {
    reason = MISSING_REASON[hashString(point.id + 'mr') % MISSING_REASON.length]
    missing = (point.mustInclude?.length
      ? point.mustInclude.map((m) => `「${m}」`).join('、')
      : '核心要求') + ' 均未在报告中体现'
    suggestion = SUGGESTIONS[sIdx]
  } else if (verdict === 'full') {
    reason = `${sectionLabel}已写明“${quote.slice(0, 42)}${quote.length > 42 ? '…' : ''}”，该项要求完整满足。`
    suggestion = FULL_PRAISE[hashString(point.id + 'fp') % FULL_PRAISE.length]
  } else {
    reason = `虽在${sectionLabel}找到“${quote.slice(0, 42)}${quote.length > 42 ? '…' : ''}”，但要求中的关键要点未完全覆盖，故部分给分。`
    missing = point.mustInclude?.length
      ? `未充分体现：${point.mustInclude.map((m) => `「${m}」`).join('、')}`
      : '部分评分要点未见明确表述，论述不够完整'
    suggestion = SUGGESTIONS[sIdx]
  }

  return {
    pointId: point.id,
    title: point.title,
    score,
    maxScore: point.maxScore,
    verdict,
    evidence,
    anchor,
    reason,
    missing,
    suggestion,
  }
}

function buildSummaryComment(points: GradedPoint[], total: number, max: number): { comment: string; grade: z.infer<typeof SummarySchema>['grade'] } {
  const ratio = max === 0 ? 0 : total / max
  const grade = gradeForRatio(ratio)
  const sorted = [...points].sort((a, b) => a.score / a.maxScore - b.score / b.maxScore)
  const weak = sorted.filter((p) => p.verdict !== 'full').slice(0, 2)

  let comment: string
  if (weak.length === 0) {
    comment = `整体完成度优秀，各评分点均达标，总分 ${total}/${max}。建议在细节严谨性与数据充分性上继续打磨，向满分看齐。`
  } else {
    const names = weak.map((p) => `「${p.title}」`).join('、')
    comment = `整体完成度${grade}，总分 ${total}/${max}。主要失分在 ${names}，${weak[0].suggestion}`
  }
  return { comment, grade }
}

/* ------------------------------------------------------------------ */
/* Zod：仅用于输入校验；输出类型用普通接口保证契约清晰                    */
/* ------------------------------------------------------------------ */

const SummarySchema = z.object({
  comment: z.string(),
  grade: z.enum(['优秀', '良好', '中等', '及格', '不及格']),
})

/* ------------------------------------------------------------------ */
/* 处理器                                                              */
/* ------------------------------------------------------------------ */

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'AutoGrader',
    mode: 'mock',
    usage: 'POST /api/grade  { reportText, fileName?, rubric?: [{ id, title, maxScore, description?, mustInclude? }] }',
    note: '纯本地模拟模式：不调用任何外部大模型，证据引用均取自 reportText 原文，可直接用于前端"定位原文"高亮。',
  })
}

export async function POST(req: NextRequest) {
  const started = Date.now()

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: '请求体必须是合法 JSON' }, { status: 400 })
  }

  const parsed = GradeRequest.safeParse(body)
  if (!parsed.success) {
    const issues = (parsed.error.issues ?? []).map((i) => `${i.path.join('.')}: ${i.message}`)
    return NextResponse.json({ ok: false, error: '参数校验失败', details: issues }, { status: 400 })
  }

  const { reportText, fileName } = parsed.data
  const rubric = parsed.data.rubric && parsed.data.rubric.length > 0 ? parsed.data.rubric : DEFAULT_RUBRIC

  // 模拟 AI 思考的随机延迟（0.6–1.8s），让前端展示 Loading
  const thinkingMs = 600 + Math.floor(Math.random() * 1200)
  await sleep(thinkingMs)

  const chunks = buildChunks(reportText)
  const points = rubric.map((p, i) => gradePoint(p, chunks, i))

  const total = Math.round(points.reduce((s, p) => s + p.score, 0) * 10) / 10
  const maxTotal = rubric.reduce((s, p) => s + p.maxScore, 0)
  const summary = buildSummaryComment(points, total, maxTotal)

  return NextResponse.json({
    ok: true,
    fileName: fileName ?? null,
    mode: 'mock',
    rubricCount: rubric.length,
    chunks,
    points,
    totalScore: total,
    maxScore: maxTotal,
    summary,
    violations: [],
    meta: {
      mode: 'mock',
      model: null,
      chunkCount: chunks.length,
      thinkingMs,
      durationMs: Date.now() - started,
    },
  })
}
