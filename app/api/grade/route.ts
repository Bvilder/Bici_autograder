import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { buildChunks, composePoint, gradeForRatio, hash, matchKeywords, normalizeRubric, RUBRIC_BANK, type RubricPoint } from '@/lib/grading-utils'
import { matchReport } from '@/lib/reports'
import type { GradeResult, GradedPoint, SimpleRubricPoint, Verdict } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 60

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

// 用户自行上传的报告：按文本做种子打分（确定性）；自定义细则时按要点关键词匹配打分
function gradeDynamic(reportText: string, fileName: string | null, rubric: RubricPoint[], useKeyword: boolean): GradeResult {
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

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'AutoGrader',
    mode: 'mock',
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

  // 没有自定义细则时，先匹配三份预置报告（分数前后一致）；有自定义细则则全部走动态评分
  if (!hasCustomRubric) {
    const fixed = matchReport(reportText)
    if (fixed) return NextResponse.json(fixed)
  }

  const bank: RubricPoint[] = hasCustomRubric ? normalizeRubric(rubric as SimpleRubricPoint[]) : RUBRIC_BANK
  return NextResponse.json(gradeDynamic(reportText, fileName ?? null, bank, hasCustomRubric))
}
