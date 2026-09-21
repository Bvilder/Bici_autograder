import { type NextRequest, NextResponse } from 'next/server'
import { HIGH_AI_COUNT, KNOWLEDGE_ERRORS, STUDENTS, studentResultOf } from '@/lib/reports'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const reportId = url.searchParams.get('report')

  if (reportId) {
    const result = studentResultOf(reportId)
    if (!result) return NextResponse.json({ ok: false, error: '学生不存在' }, { status: 404 })
    return NextResponse.json({ ok: true, result })
  }

  const scores = STUDENTS.map((s) => s.score)
  const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
  const max = Math.max(...scores)
  const min = Math.min(...scores)
  const passCount = scores.filter((s) => s >= 60).length
  const passRate = Math.round((passCount / scores.length) * 100)

  return NextResponse.json({
    ok: true,
    stats: { total: STUDENTS.length, avg, passRate, max, min, highAiCount: HIGH_AI_COUNT },
    students: STUDENTS,
    knowledgeErrors: KNOWLEDGE_ERRORS,
  })
}
