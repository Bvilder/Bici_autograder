import type { GradeResult, GradedPoint, KnowledgeError, Student, Verdict } from './types'
import { buildChunks, composePoint, gradeForRatio, RUBRIC_BANK } from './grading-utils'

/* ------------------------------------------------------------------ */
/* 三份基准报告（次等 / 中等 / 上等），正文 + 基准每题分数 + AI 率      */
/* ------------------------------------------------------------------ */

type Tier = '上等' | '中等' | '次等'

type ReportSpec = {
  tier: Tier
  reportText: string
  aiRate: number
  scores: Record<string, { score: number; verdict: Verdict }>
}

const SPECS: ReportSpec[] = [
  {
    tier: '上等',
    aiRate: 8,
    scores: {
      p1: { score: 10, verdict: 'full' },
      p2: { score: 22, verdict: 'partial' },
      p3: { score: 15, verdict: 'full' },
      p4: { score: 19, verdict: 'partial' },
      p5: { score: 12, verdict: 'partial' },
      p6: { score: 15, verdict: 'full' },
    },
    reportText: `操作系统实验二：进程调度算法实现
姓名：张子昂

一、实验目的
本实验旨在通过实现时间片轮转（RR）与优先级调度两种算法，理解进程调度中上下文切换的开销来源，掌握 PCB 的构造方式与就绪队列的组织形式，并对比不同调度策略在响应时间与吞吐量之间的取舍。

二、实验原理
2.1 时间片轮转调度
系统将所有就绪进程按先来先服务顺序排成队列，每次调度把处理器分配给队首进程，令其执行一个时间片。时间片用完后，该进程被剥夺处理器并重新排到队尾，形成轮转。若进程在时间片内完成，则直接释放。

2.2 优先级调度
每个进程附带一个优先级数值，调度器始终选择优先级最高的就绪进程运行。本次采用静态优先级，优先级在进程创建时确定，运行期间不变。

三、数据结构设计
进程控制块采用结构体 PCB 描述，包含 pid、state、remaining、priority、arrival、counter 六个字段；就绪队列使用 queue 组织，阻塞队列使用 list 以便随机删除。两个队列分别对应调度器与等待事件两条通路，互不干扰。

四、核心算法实现
轮转调度的主循环如下，通过不断取出队首进程、扣减剩余时间再重新入队来实现轮转：
while (!ready_queue.empty()) {
    PCB p = ready_queue.front();
    ready_queue.pop();
    p.remaining -= time_slice;
    if (p.remaining > 0) {
        ready_queue.push(p);
    } else {
        p.state = FINISHED;
    }
    ctx_switches++;
}

五、测试与结果分析
分别以时间片 1、2、4、8 进行了四组对照实验。以时间片等于 2 为例：5 个进程平均周转时间为 6.8，平均等待时间为 4.2。四组数据以表格呈现，等待时间随片长增大而上升。

六、性能对比
相比先来先服务，轮转调度的平均等待时间缩短约 23%。计算过程：FCFS 平均等待时间 5.5，RR 平均等待时间 4.2，(5.5 - 4.2) / 5.5 约等于 23.6%。同时上下文切换次数增加了一倍，说明轮转更适合交互式场景。

七、实验结论
通过本次实验，我理解了调度算法的设计需要在响应时间与切换开销之间做权衡，时间片长度是关键参数。后续可以尝试多级反馈队列，用动态优先级缓解固定时间片带来的公平性问题。`,
  },
  {
    tier: '中等',
    aiRate: 34,
    scores: {
      p1: { score: 8, verdict: 'partial' },
      p2: { score: 18, verdict: 'partial' },
      p3: { score: 12, verdict: 'partial' },
      p4: { score: 14, verdict: 'partial' },
      p5: { score: 11, verdict: 'partial' },
      p6: { score: 15, verdict: 'full' },
    },
    reportText: `操作系统实验二：进程调度算法实现
姓名：江水平平仄

一、实验目的
本实验旨在通过实现时间片轮转与优先级调度两种算法，理解进程调度中上下文切换的开销来源，并掌握 PCB 的构造方式与就绪队列的组织形式。

二、实验原理
系统将所有就绪进程按先来先服务顺序排成队列，每次调度把处理器分配给队首进程，令其执行一个时间片。时间片用完后，该进程被剥夺处理器并重新排到队尾，形成轮转。

三、数据结构设计
进程控制块采用结构体 PCB 描述，包含 pid、state、remaining、priority 四个字段；就绪队列使用 queue 组织，阻塞队列使用 list 以便随机删除。

四、核心算法实现
while (!ready_queue.empty()) {
    PCB p = ready_queue.front();
    ready_queue.pop();
    p.remaining -= time_slice;
    if (p.remaining > 0) ready_queue.push(p);
}

五、测试与结果分析
以 5 个进程、时间片等于 2 的一组数据测试，平均周转时间为 6.8，平均等待时间为 4.2。

六、性能对比
相比先来先服务，轮转调度的平均等待时间缩短约 23%，但上下文切换次数增加了一倍。

七、实验结论
通过本次实验，我理解了调度算法的设计需要在响应时间与切换开销之间做权衡。`,
  },
  {
    tier: '次等',
    aiRate: 71,
    scores: {
      p1: { score: 6, verdict: 'partial' },
      p2: { score: 15, verdict: 'partial' },
      p3: { score: 9, verdict: 'partial' },
      p4: { score: 10, verdict: 'partial' },
      p5: { score: 7, verdict: 'partial' },
      p6: { score: 13, verdict: 'partial' },
    },
    reportText: `操作系统实验二：进程调度算法实现
姓名：李梦琪

一、实验目的
学习进程调度的原理。

二、实验内容
实现了时间片轮转调度，主要代码是一个循环，每次取出队首进程，把剩余时间减掉时间片，再放回队尾。

while (1) {
    PCB p = ready_queue.front();
    ready_queue.pop();
    p.remaining = p.remaining - 2;
    ready_queue.push(p);
}

三、测试
用一组数据测了一下，平均等待时间是 4.2。

四、结论
实验基本完成，了解了调度的过程。`,
  },
]

/* ------------------------------------------------------------------ */
/* 8 个学生：张/江/李固定三档，其余分数分散 60–93                       */
/* ------------------------------------------------------------------ */

type StudentSpec = {
  id: string
  name: string
  score: number
  tier: Tier
  weaknesses: string
}

const STUDENT_SPECS: StudentSpec[] = [
  { id: 's1', name: '张子昂', score: 93, tier: '上等', weaknesses: '时间片边界 · 切换计数' },
  { id: 's2', name: '刘雨桐', score: 88, tier: '上等', weaknesses: '切换计数 · 对照实验' },
  { id: 's3', name: '孙铭泽', score: 83, tier: '中等', weaknesses: '边界处理 · 推导过程' },
  { id: 's4', name: '江水平平仄', score: 78, tier: '中等', weaknesses: '边界处理 · 对照实验 · 推导' },
  { id: 's5', name: '王浩然', score: 74, tier: '中等', weaknesses: '边界处理 · 对照实验 · 推导' },
  { id: 's6', name: '赵一诺', score: 67, tier: '次等', weaknesses: '原理缺失 · 无数据结构' },
  { id: 's7', name: '陈思远', score: 63, tier: '次等', weaknesses: '原理缺失 · 死循环' },
  { id: 's8', name: '李梦琪', score: 60, tier: '次等', weaknesses: '原理缺失 · 死循环 · 无数据结构' },
]

export const KNOWLEDGE_ERRORS: KnowledgeError[] = [
  { topic: '时间片耗尽边界处理', errorRate: 88 },
  { topic: '上下文切换计数', errorRate: 75 },
  { topic: '多组对照实验', errorRate: 63 },
  { topic: '结论推导过程', errorRate: 50 },
  { topic: '数据结构选型理由', errorRate: 38 },
  { topic: '原理表述完整性', errorRate: 25 },
]

/* ------------------------------------------------------------------ */
/* 工具                                                                */
/* ------------------------------------------------------------------ */

// 按目标总分缩放：满分题保持不变，只在部分得分题上按比例调整，保证总分精确
function adjustToTarget(base: Record<string, { score: number; verdict: Verdict }>, target: number) {
  const ids = RUBRIC_BANK.map((r) => r.id)
  const result: Record<string, { score: number; verdict: Verdict }> = {}
  const fullIds = ids.filter((id) => base[id].verdict === 'full')
  const partialIds = ids.filter((id) => base[id].verdict !== 'full')

  fullIds.forEach((id) => { result[id] = { score: base[id].score, verdict: 'full' } })

  const fullSum = fullIds.reduce((s, id) => s + base[id].score, 0)
  const remain = target - fullSum
  const partialSum = partialIds.reduce((s, id) => s + base[id].score, 0)

  if (partialIds.length && partialSum > 0) {
    const exact = partialIds.map((id) => (base[id].score * remain) / partialSum)
    const rounded = exact.map(Math.round)
    let diff = remain - rounded.reduce((a, b) => a + b, 0)
    let best = 0
    for (let i = 1; i < exact.length; i++) if (Math.abs(exact[i] - rounded[i]) > Math.abs(exact[best] - rounded[best])) best = i
    rounded[best] += diff
    partialIds.forEach((id, i) => {
      const max = RUBRIC_BANK.find((r) => r.id === id)!.maxScore
      const sc = Math.max(0, Math.min(max, rounded[i]))
      result[id] = { score: sc, verdict: sc >= max ? 'full' : sc === 0 ? 'missing' : 'partial' }
    })
  }

  // 最终总和修正
  let cur = ids.reduce((s, id) => s + result[id].score, 0)
  let d = target - cur
  if (d !== 0) {
    for (const id of [...partialIds, ...fullIds]) {
      if (d === 0) break
      const max = RUBRIC_BANK.find((r) => r.id === id)!.maxScore
      const sc = Math.max(0, Math.min(max, result[id].score + d))
      const delta = sc - result[id].score
      result[id] = { score: sc, verdict: sc >= max ? 'full' : sc === 0 ? 'missing' : 'partial' }
      d -= delta
    }
  }

  return result
}

function buildResultFor(tier: Tier, score: number, fileName: string): GradeResult {
  const spec = SPECS.find((s) => s.tier === tier)!
  const baseTotal = RUBRIC_BANK.reduce((s, r) => s + spec.scores[r.id].score, 0)
  const scores = score === baseTotal ? spec.scores : adjustToTarget(spec.scores, score)

  const chunks = buildChunks(spec.reportText)
  const points: GradedPoint[] = RUBRIC_BANK.map((rp, i) => composePoint(rp, scores[rp.id], chunks, i))

  const totalScore = points.reduce((s, p) => s + p.score, 0)
  const maxScore = points.reduce((s, p) => s + p.maxScore, 0)
  const rating = gradeForRatio(totalScore / maxScore)
  const weakest = [...points].sort((a, b) => a.score / a.maxScore - b.score / b.maxScore).filter((p) => p.verdict !== 'full').slice(0, 2)
  const comment = weakest.length === 0
    ? `整体完成度优秀，各评分点均达标，总分 ${totalScore}/${maxScore}。`
    : `整体完成度${rating}，总分 ${totalScore}/${maxScore}。主要失分在 ${weakest.map((p) => `「${p.title}」`).join('、')}，${weakest[0].suggestion}`

  return {
    ok: true,
    fileName,
    mode: 'mock',
    rating,
    aiRate: spec.aiRate,
    rubricCount: RUBRIC_BANK.length,
    chunks,
    points,
    totalScore,
    maxScore,
    summary: { comment, grade: rating },
    violations: [],
    meta: { mode: 'mock', chunkCount: chunks.length },
  }
}

export const STUDENTS: Student[] = STUDENT_SPECS.map((s) => ({
  id: s.id,
  name: s.name,
  rating: gradeForRatio(s.score / 100),
  score: s.score,
  weaknesses: s.weaknesses,
}))

// AI 率偏高（>50%）的学生数 = 次等档（AI 71%），即低分报告 AI 率更高
export const HIGH_AI_COUNT = STUDENT_SPECS.filter((s) => s.tier === '次等').length

// 按学生 id 返回其完整一致的评阅结果
export function studentResultOf(id: string): GradeResult | null {
  const s = STUDENT_SPECS.find((x) => x.id === id)
  if (!s) return null
  return buildResultFor(s.tier, s.score, `${s.name}-操作系统实验二.docx`)
}

// 上传报告：按正文指纹识别，命中三份基准报告 → 返回基准结果（93/78/60）
export function matchReport(text: string): GradeResult | null {
  const norm = text.replace(/\s+/g, '')
  const spec = SPECS.find((s) => norm.includes(s.reportText.replace(/\s+/g, '').slice(0, 40)))
  if (!spec) return null
  const baseTotal = RUBRIC_BANK.reduce((sum, r) => sum + spec.scores[r.id].score, 0)
  return buildResultFor(spec.tier, baseTotal, `${spec.tier}水平-操作系统实验二.docx`)
}

// 江水平平仄（中等 78）的报告正文，用于生成可拖拽上传的文件
export function jiangReportText(): string {
  return SPECS.find((s) => s.tier === '中等')!.reportText
}
