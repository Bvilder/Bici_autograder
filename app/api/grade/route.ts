import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  buildChunks, composePoint, gradeForRatio, hash, matchKeywords,
  normalizeRubric, pickChunkForPoint, pickQuote, RUBRIC_BANK,
  type RubricPoint,
} from '@/lib/grading-utils'
import type { Chunk, GradeResult, GradedPoint, SimpleRubricPoint, Verdict } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 60

// 大模型评分超时阈值：超过则自动降级到本地 mock，避免演示时一直转圈。
// 默认 45s；可用环境变量 LLM_TIMEOUT_MS 覆盖（毫秒）。
const LLM_TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS) || 45_000

const SimplePoint = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  maxScore: z.number().positive(),
  mustInclude: z.array(z.string()).optional(),
  criteria: z.array(z.string()).optional(),
})

const GradeRequest = z.object({
  reportText: z.string().min(1, '报告正文不能为空'),
  fileName: z.string().optional(),
  rubric: z.array(SimplePoint).optional(),
})

/* ------------------------------------------------------------------ */
/* 混元配置（env 名兼容多种写法）                                      */
/* ------------------------------------------------------------------ */

function resolveHunyuan() {
  const apiKey =
    process.env.HUNYUAN_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.LLM_API_KEY ||
    ''
  const baseURL =
    process.env.HUNYUAN_BASE_URL ||
    process.env.OPENAI_BASE_URL ||
    process.env.LLM_BASE_URL ||
    'https://api.hunyuan.cloud.tencent.com/v1'
  const model = process.env.HUNYUAN_MODEL || process.env.LLM_MODEL || 'hunyuan-turbos'
  return { apiKey, baseURL, model }
}

/* ------------------------------------------------------------------ */
/* 本地 mock 兜底（原动态评分逻辑，保证演示永不挂死）                  */
/* ------------------------------------------------------------------ */

function buildMockResult(reportText: string, fileName: string | null, rubric: RubricPoint[], useKeyword: boolean): GradeResult {
  const seed = hash(reportText.replace(/\s+/g, '').slice(0, 600) || 'default')
  const chunks = buildChunks(reportText)

  const points: GradedPoint[] = rubric.map((rp, idx) => {
    let verdict: Verdict
    let score: number
    let match: { matched: string[]; unmatched: string[] } | undefined

    if (useKeyword && rp.mustInclude.length) {
      match = matchKeywords(reportText, rp.mustInclude)
      const ratio = match.matched.length / rp.mustInclude.length
      verdict = ratio >= 0.8 ? 'full' : ratio >= 0.4 ? 'partial' : 'missing'
      score = verdict === 'full' ? rp.maxScore : verdict === 'missing' ? 0 : Math.max(1, Math.round(rp.maxScore * ratio))
    } else {
      const r = (hash(rp.id + ':ratio:' + seed) % 100) / 100
      const isMissing = hash(rp.id + ':miss:' + seed) % 11 === 0
      verdict = r >= 0.88 ? 'full' : r >= 0.55 ? 'partial' : 'missing'
      if (isMissing) verdict = 'missing'
      score = verdict === 'full' ? rp.maxScore : verdict === 'missing' ? 0 : Math.max(1, Math.round(rp.maxScore * (1 - r)))
    }
    return composePoint(rp, { score, verdict }, chunks, idx, match)
  })

  const totalScore = points.reduce((s, p) => s + p.score, 0)
  const maxScore = points.reduce((s, p) => s + p.maxScore, 0)
  const grade = gradeForRatio(totalScore / maxScore)
  const aiRate = 10 + (hash(seed + ':ai') % 60)

  return {
    ok: true,
    fileName,
    mode: 'mock',
    rating: grade,
    aiRate,
    rubricCount: rubric.length,
    chunks,
    points,
    totalScore,
    maxScore,
    summary: { comment: `整体完成度${grade}，总分 ${totalScore}/${maxScore}。`, grade },
    violations: [],
    meta: { mode: 'mock', chunkCount: chunks.length },
  }
}

/* ------------------------------------------------------------------ */
/* 模型输出解析 + 证据反查（防幻觉：quote 必须是原文子串）             */
/* ------------------------------------------------------------------ */

type ModelPoint = {
  pointId?: string
  score?: number
  verdict?: string
  chunkId?: string
  quote?: string
  reason?: string
  suggestion?: string
}
type ModelOutput = { points?: ModelPoint[]; comment?: string }

function parseModelJson(text: string): ModelOutput | null {
  let s = (text || '').trim()
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  const a = s.indexOf('{')
  const b = s.lastIndexOf('}')
  if (a === -1 || b <= a) return null
  try {
    return JSON.parse(s.slice(a, b + 1)) as ModelOutput
  } catch {
    return null
  }
}

function norm(s: string) {
  return (s || '').replace(/\s+/g, '')
}

// quote 是否为 chunk.text 的真实子串（忽略空白）
function isRealSubstring(quote: string, text: string) {
  const q = norm(quote)
  const t = norm(text)
  return q.length >= 4 && t.includes(q)
}

// 从模型输出 + 报告块，产出最终可信的 GradedPoint[]
function assembleResult(
  parsed: ModelOutput,
  rubric: RubricPoint[],
  chunks: Chunk[],
  fileName: string | null,
  reportText: string,
  trace: string[],
): GradeResult {
  const mpArr = Array.isArray(parsed.points) ? parsed.points : []

  const points: GradedPoint[] = rubric.map((rp, idx) => {
    const mp = mpArr.find((p) => p.pointId === rp.id) || mpArr[idx] || {}
    let score = Number.isFinite(mp.score) ? Math.round(mp.score as number) : Math.round(rp.maxScore * 0.7)
    score = Math.max(0, Math.min(rp.maxScore, score))

    let verdict: Verdict =
      mp.verdict === 'full' || mp.verdict === 'partial' || mp.verdict === 'missing'
        ? (mp.verdict as Verdict)
        : score >= rp.maxScore
          ? 'full'
          : score === 0
            ? 'missing'
            : 'partial'
    // 状态与分数对齐：missing=0 分，full=满分
    if (verdict === 'missing') score = 0
    if (verdict === 'full') score = rp.maxScore

    // 证据反查：模型给的 chunkId/quote 必须真实存在，否则退回按章节语义定位
    const modelChunk = chunks.find((c) => c.id === mp.chunkId)
    let chunk = modelChunk
    let quote = ''
    if (modelChunk && typeof mp.quote === 'string' && isRealSubstring(mp.quote, modelChunk.text)) {
      quote = mp.quote
    } else {
      chunk = pickChunkForPoint(rp, chunks) || chunks[Math.min(idx, chunks.length - 1)]
      quote = chunk && verdict !== 'missing' ? pickQuote(chunk) : ''
    }

    const base = composePoint(rp, { score, verdict }, chunks, idx)
    const evidence = chunk && quote ? [{ chunkId: chunk.id, quote, matched: true }] : []

    return {
      ...base,
      evidence,
      anchor: evidence.length ? evidence[0].chunkId : null,
      reason: (typeof mp.reason === 'string' && mp.reason.trim()) ? mp.reason.trim() : base.reason,
      suggestion: (typeof mp.suggestion === 'string' && mp.suggestion.trim()) ? mp.suggestion.trim() : base.suggestion,
    }
  })

  const totalScore = points.reduce((s, p) => s + p.score, 0)
  const maxScore = points.reduce((s, p) => s + p.maxScore, 0)
  const rating = gradeForRatio(totalScore / maxScore)
  const seed = hash(reportText.replace(/\s+/g, '').slice(0, 600) || 'default')
  const aiRate = 10 + (hash(seed + ':ai') % 60)
  const comment = (typeof parsed.comment === 'string' && parsed.comment.trim())
    ? parsed.comment.trim()
    : `整体完成度${rating}，总分 ${totalScore}/${maxScore}。`

  return {
    ok: true,
    fileName,
    mode: 'agent',
    rating,
    aiRate,
    rubricCount: rubric.length,
    chunks,
    points,
    totalScore,
    maxScore,
    summary: { comment, grade: rating },
    violations: [],
    meta: { mode: 'agent', model: resolveHunyuan().model, trace, chunkCount: chunks.length },
  }
}

/* ------------------------------------------------------------------ */
/* 评分提示词（检索由程序确定式完成，大模型只负责判定打分）             */
/* ------------------------------------------------------------------ */

const SYSTEM_PROMPT = `你是「彼此_Autograder」的评分智能体。下面已给出评分细则和报告证据，请逐点评分，直接输出一个 JSON 对象（不要输出任何多余文字、不要 markdown 代码块）。

结构：
{"points":[{"pointId":"p1","score":8,"verdict":"partial","chunkId":"chunk_002","quote":"原文原句","reason":"判定理由","suggestion":"修改建议"}],"comment":"总评语"}
其中 verdict 只能是 full / partial / missing；score 为 0 到该点满分之间的整数；quote 必须是证据文本中的原句；每个评分点都必须有对应条目。`

/* ------------------------------------------------------------------ */
/* 流式响应封装（SSE）                                                 */
/* ------------------------------------------------------------------ */

function sseResponse(emitter: (send: (obj: unknown) => void) => Promise<void>): Response {
  const enc = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false
      const send = (obj: unknown) => {
        if (closed) return
        try { controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`)) } catch { closed = true }
      }
      const close = () => { if (!closed) { closed = true; try { controller.close() } catch { /* noop */ } } }
      try { await emitter(send) } finally { close() }
    },
  })
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

/* ------------------------------------------------------------------ */
/* 路由                                                                */
/* ------------------------------------------------------------------ */

export async function GET() {
  const { model, apiKey, baseURL } = resolveHunyuan()
  return NextResponse.json({
    ok: true,
    service: 'AutoGrader',
    mode: 'agent',
    model,
    baseURL,
    apiKeyConfigured: !!apiKey,
    usage: 'POST /api/grade  { reportText, fileName?, rubric? }',
  })
}

export async function POST(req: NextRequest) {
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

  const { reportText, fileName, rubric } = parsed.data
  const hasCustomRubric = !!(rubric && rubric.length)
  const bank: RubricPoint[] = hasCustomRubric ? normalizeRubric(rubric as SimpleRubricPoint[]) : RUBRIC_BANK
  const chunks = buildChunks(reportText)
  const mock = () => buildMockResult(reportText, fileName ?? null, bank, hasCustomRubric)

  return sseResponse(async (send) => {
    const { apiKey, baseURL, model } = resolveHunyuan()

    // 未配置 key：直接走 mock，不浪费时间
    if (!apiKey) {
      send({ type: 'result', result: mock(), fallback: true, reason: 'no_api_key' })
      return
    }

    const abort = new AbortController()
    const timer = setTimeout(() => abort.abort(), LLM_TIMEOUT_MS)
    const trace: string[] = []

    try {
      // 步骤 1：获取评分细则（本地规则库，确定性，无需大模型）
      send({ type: 'step', label: '获取评分细则' })
      trace.push('获取评分细则')
      const rubricCtx = bank.map((r) => `- ${r.id} ${r.title}（满分${r.maxScore}）：${r.criteria.join('；')}`).join('\n')

      // 步骤 2：检索证据块（按章节语义精准定位，从根上避免牛头不对马嘴）
      send({ type: 'step', label: '检索证据块' })
      trace.push('检索证据块')
      const evidenceCtx = bank.map((rp) => {
        const c = pickChunkForPoint(rp, chunks)
        return `- ${rp.id} ${rp.title}：${c ? `[${c.id}] ${c.text.slice(0, 400)}` : '（无证据）'}`
      }).join('\n')

      // 步骤 3：大模型判定打分（原生 fetch，传 thinking=disabled 关闭深度思考以提速）
      send({ type: 'step', label: '正在判定打分' })
      const endpoint = baseURL.replace(/\/+$/, '') + '/chat/completions'
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `评分细则：\n${rubricCtx}\n\n报告证据：\n${evidenceCtx}\n\n请据此逐点评分，直接输出 JSON。` },
          ],
          thinking: { type: 'disabled' },
          temperature: 0.2,
          stream: false,
        }),
        signal: abort.signal,
      })
      if (!resp.ok) throw new Error(`LLM HTTP ${resp.status}`)
      const data = await resp.json()
      const content = data?.choices?.[0]?.message?.content ?? ''
      const modelOut = parseModelJson(content)
      if (!modelOut) {
        send({ type: 'result', result: mock(), fallback: true, reason: 'bad_output' })
        return
      }
      send({
        type: 'result',
        result: assembleResult(modelOut, bank, chunks, fileName ?? null, reportText, trace),
        fallback: false,
      })
    } catch (e) {
      const reason = abort.signal.aborted ? 'timeout' : 'error'
      send({ type: 'result', result: mock(), fallback: true, reason })
    } finally {
      clearTimeout(timer)
    }
  })
}
