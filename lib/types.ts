export type Verdict = 'full' | 'partial' | 'missing'

export type Chunk = {
  id: string
  index: number
  section: string
  text: string
}

export type Evidence = {
  chunkId: string
  quote: string
  matched: boolean
}

export type Deduction = { label: string; amount: number }

export type GradedPoint = {
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
  criteria: string[]
  criteriaMet: boolean[]
  deductions: Deduction[]
  logic: string
}

export type GradeResult = {
  ok: boolean
  fileName: string | null
  mode: string
  rating?: string
  aiRate?: number
  rubricCount: number
  chunks: Chunk[]
  points: GradedPoint[]
  totalScore: number
  maxScore: number
  summary: { comment: string; grade: string }
  violations: { pointId: string; type: string; detail: string }[]
  meta: Record<string, unknown>
}

export type Student = {
  id: string
  name: string
  rating: string
  score: number
  weaknesses: string
}

export type KnowledgeError = {
  topic: string
  errorRate: number
}

export type WorkbenchData = {
  ok: boolean
  stats: {
    total: number
    avg: number
    passRate: number
    max: number
    min: number
    highAiCount: number
  }
  students: Student[]
  knowledgeErrors: KnowledgeError[]
}
