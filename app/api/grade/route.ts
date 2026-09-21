import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { buildChunks, composePoint, gradeForRatio, hash, RUBRIC_BANK } from '@/lib/grading-utils'
import { matchReport } from '@/lib/reports'
import type { GradeResult, GradedPoint, Verdict } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 60

const GradeRequest = z.object({
  reportText: z.string().min(1, '报告正文不能为空'),
  fileName: z.string().optional(),
})

// 用户自行上传的报告：按文本做种子打分（确定性）
function gradeDynamic(reportText: string, fileName: string | null): GradeResult {
  const seed = hash(reportText.replace(/\s+/g, '').slice(0, 600) || 'default')
  const chunks = buildChunks(reportText)

  const points: GradedPoint[] = RUBRIC_BANK.map((rp, idx) => {
    const r = (hash(rp.id + ':ratio:' + seed) % 100) / 100
    const isMissing = hash(rp.id + ':miss:' + seed) % 11 === 0
    let verdict: Verdict = r >= 0.88 ? 'full' : r >= 0.55 ? 'partial' : 'missing'
    if (isMissing) verdict = 'missing'
    let score: number
    if (verdict === 'full') score = rp.maxScore
    else if (verdict === 'missing') score = 0
    else score = Math.max(1, Math.round(rp.maxScore * (1 - r)))
    return composePoint(rp, { score, verdict }, chunks, idx)
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
    rubricCount: RUBRIC_BANK.length,
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
    usage: 'POST /api/grade  { reportText, fileName? }',
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

  const { reportText, fileName } = parsed.data

  // 命中三份写死报告 → 返回写死结果（分数、AI 率前后一致）
  const fixed = matchReport(reportText)
  if (fixed) return NextResponse.json(fixed)

  return NextResponse.json(gradeDynamic(reportText, fileName ?? null))
}
