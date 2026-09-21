'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, Send, FileText, Quote, Lightbulb, Crosshair, Highlighter,
  Check, X, Minus, Download, Copy, RotateCcw, Paperclip,
  Info, Target, ListChecks, ChevronRight, NotebookPen, ScanSearch, BookOpen, Wrench, Users,
} from 'lucide-react'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import ReportViewer from '@/components/ReportViewer'
import UploadDropzone from '@/components/UploadDropzone'
import Workbench from '@/components/Workbench'
import type { Chunk, GradedPoint, GradeResult, Student, Verdict, WorkbenchData } from '@/lib/types'

/* ------------------------------------------------------------------ */
/* 静态 mock 内容（知识点 / 评语 / 汇总表 / 修改建议）                  */
/* ------------------------------------------------------------------ */

type KnowledgeItem = { title: string; body: string }
type CommentItem = { title: string; text: string }

const KNOWLEDGE: KnowledgeItem[] = [
  { title: '时间片轮转（RR）调度', body: '就绪队列按先来先服务排列，每次取队首进程执行一个时间片；片用完仍未完成则剥夺 CPU 并重新入队。响应快、公平，适合交互式系统。' },
  { title: '先来先服务（FCFS）调度', body: '按进程到达顺序依次执行，非抢占式。实现最简单，但易产生"护航效应"——长进程会长时间阻塞后面的短进程。' },
  { title: '优先级调度', body: '为每个进程分配优先级，调度器始终选择优先级最高的就绪进程运行。静态优先级在创建时确定、运行期间不变。' },
  { title: '上下文切换（Context Switch）', body: 'CPU 从一个进程切换到另一个进程时，需保存/恢复寄存器与 PCB 状态，这部分是纯开销，切换越频繁系统效率越低。' },
  { title: '进程控制块（PCB）', body: '操作系统用于记录进程信息的数据结构，通常含 pid、状态、剩余时间、优先级、计数器等字段，是调度的最小管理单元。' },
  { title: '周转时间与等待时间', body: '周转时间 = 完成时间 − 到达时间；等待时间 = 周转时间 − 服务时间。二者是衡量调度算法性能的核心指标。' },
]

const COMMENTS: CommentItem[] = [
  { title: '实验目的与原理阐述', text: '原理理解到位，继续保持对"为什么"的追问，试着把抽象概念对应到真实调度器的实现细节上。' },
  { title: '时间片轮转算法实现', text: '思路是对的，但尤其要注意边界条件——时间片"恰好耗尽"最容易被漏掉，补上 FINISHED 判定就完整了。' },
  { title: '关键数据结构设计', text: '选型理由写得很清楚，这是好的工程习惯，之后可以进一步思考多级队列该怎么组织。' },
  { title: '测试与结果分析', text: '数据呈现规范，下一步一定要做对照实验，改变时间片大小观察趋势，结论会扎实得多。' },
  { title: '性能对比与实验结论', text: '有对比意识很好，但每个结论数字都要能写出推导过程，这样才经得起复核。' },
  { title: '报告格式与引用规范', text: '格式无可挑剔，保持即可。' },
]

const CLASS_TABLE = {
  caption: '操作系统实验二 · 全班成绩汇总（模拟数据）',
  head: ['学号', '姓名', '总分', '等级', '主要扣分点'],
  rows: [
    ['2023150164', '江水平平仄', '87', '良好', '算法边界 · 测试对照'],
    ['2023150101', '张子昂', '92', '优秀', '原理表述'],
    ['2023150122', '李梦琪', '78', '中等', '性能对比推导'],
    ['2023150133', '王浩然', '84', '良好', '测试数据偏少'],
    ['2023150144', '陈思远', '71', '中等', '数据结构 · 边界'],
    ['2023150155', '刘雨桐', '90', '优秀', '引用格式'],
  ],
}

const FIX_KNOWLEDGE: { match: RegExp; title: string; steps: string[]; code?: string }[] = [
  {
    match: /FINISHED|收尾|时间片|remaining|入队|边界/,
    title: '补全时间片耗尽的分支',
    steps: [
      '扣减 remaining 后，用 if/else 区分「未完成」与「已完成」两种情况。',
      'remaining > 0 才重新入队；否则置 state = FINISHED，不再入队。',
      '顺手在每次取出队首进程时累加一次上下文切换计数。',
    ],
    code: `while (!ready_queue.empty()) {
    PCB p = ready_queue.front();
    ready_queue.pop();
    p.remaining -= time_slice;
    if (p.remaining > 0) ready_queue.push(p);
    else p.state = FINISHED;
    ctx_switches++;
}`,
  },
  {
    match: /上下文切换|切换次数|ctx/,
    title: '统计上下文切换次数',
    steps: ['每次从就绪队列取出进程放回，都计一次上下文切换。', '在循环体末尾对计数器累加，最后随结果一起输出。'],
  },
  {
    match: /对照|测试|数据/,
    title: '补做对照实验',
    steps: ['固定进程集，分别取时间片 1 / 2 / 4 / 8 各跑一遍。', '用表格记录平均等待时间与切换次数随片长的变化趋势。'],
  },
  {
    match: /推导|计算|复核|23%|结论/,
    title: '补全推导过程',
    steps: ['列出两种算法的原始周转/等待数据。', '写出换算公式并逐项计算，让 23% 这类数字可被复核。'],
  },
]

function resolveFix(topic: string) {
  const hit = FIX_KNOWLEDGE.find((f) => f.match.test(topic))
  if (hit) return { title: hit.title, steps: hit.steps, code: hit.code }
  return { title: '针对性修改建议', steps: ['先明确该扣分点对应的评分要求。', '对照报告原文，定位缺失的表述。', '补充完整的推导 / 实现 / 数据，再重新提交评阅。'] }
}

const DEMO_REPORT_TEXT = `操作系统实验二：进程调度算法实现
深圳大学 计算机与软件学院 · 软件工程 2023 级 · 2023150164

一、实验目的
本实验旨在通过实现时间片轮转（RR）与优先级调度两种算法，理解进程调度中上下文切换的开销来源，并掌握 PCB 的构造方式与就绪队列的组织形式。在此基础上，对比不同调度策略在响应时间与吞吐量之间的取舍。

二、实验原理
2.1 时间片轮转调度
系统将所有就绪进程按先来先服务顺序排成队列，每次调度把处理器分配给队首进程，令其执行一个时间片。时间片用完后，该进程被剥夺处理器并重新排到队尾，形成轮转。若进程在时间片内完成，则直接释放。

2.2 优先级调度
每个进程附带一个优先级数值，调度器始终选择优先级最高的就绪进程运行。本次采用静态优先级，优先级在进程创建时确定，运行期间不变。

三、数据结构设计
进程控制块采用结构体 PCB 描述，包含 pid、state、remaining、priority 四个字段；就绪队列使用 queue 组织，阻塞队列使用 list 以便随机删除。两个队列分别对应调度器与等待事件两条通路。

四、核心算法实现
轮转调度的主循环如下，通过不断取出队首进程、扣减剩余时间再重新入队来实现轮转。
while (!ready_queue.empty()) {
    PCB p = ready_queue.front();
    ready_queue.pop();
    p.remaining -= time_slice;
    if (p.remaining > 0) ready_queue.push(p);
}

五、测试与结果分析
以 5 个进程、时间片等于 2 的一组数据测试，平均周转时间为 6.8，平均等待时间为 4.2，甘特图以表格呈现。

六、性能对比
相比先来先服务，轮转调度的平均等待时间缩短约 23%，但上下文切换次数增加了一倍。这说明轮转调度更适合交互式场景。

七、实验结论
通过本次实验，我理解了调度算法的设计需要在响应时间与切换开销之间做权衡，时间片长度是关键参数。后续可以尝试多级反馈队列。`

const DEMO_NAME = '示例-操作系统实验二.docx'

const GROUPS: Record<string, string> = {
  p1: '内容与原理', p2: '实现正确性', p3: '实现正确性', p4: '测试与验证', p5: '测试与验证', p6: '规范与表达',
}

const VERDICT_STYLE: Record<Verdict, { label: string; text: string; bg: string; bar: string }> = {
  full:    { label: '完全达标', text: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200/70', bar: 'bg-emerald-500' },
  partial: { label: '部分达标', text: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200/70',     bar: 'bg-amber-400' },
  missing: { label: '证据缺失', text: 'text-rose-700',    bg: 'bg-rose-50 border-rose-200/70',       bar: 'bg-rose-400' },
}

const CHIPS = ['帮我评改这份实验报告', '第 2 个评分点为什么扣分？', '相关知识点查阅', '生成全班成绩汇总表', '按评分点生成个性化评语']

const STEPS = ['解析报告结构', '切分证据块', '对齐评分细则', '逐项核查证据', '生成评语']

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function download(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function dimsFromPoints(points: GradedPoint[]) {
  const map: Record<string, string[]> = { 内容与原理: ['p1'], 实现正确性: ['p2', 'p3'], 测试与验证: ['p4', 'p5'], 规范与表达: ['p6'] }
  return Object.entries(map).map(([label, ids]) => {
    const pts = points.filter((p) => ids.includes(p.pointId))
    return { label, got: pts.reduce((s, p) => s + p.score, 0), full: pts.reduce((s, p) => s + p.maxScore, 0) }
  })
}

/* ------------------------------------------------------------------ */
/* 意图路由                                                            */
/* ------------------------------------------------------------------ */

type Intent =
  | { kind: 'grade' }
  | { kind: 'point-detail'; index: number }
  | { kind: 'knowledge' }
  | { kind: 'table' }
  | { kind: 'comments' }
  | { kind: 'fix'; topic: string }

type Reply =
  | { kind: 'grade'; points: GradedPoint[]; aiRate?: number; summary?: { comment: string; grade: string } }
  | { kind: 'point-detail'; point: GradedPoint }
  | { kind: 'knowledge'; items: KnowledgeItem[] }
  | { kind: 'table'; caption: string; head: string[]; rows: string[][] }
  | { kind: 'comments'; items: CommentItem[] }
  | { kind: 'fix'; title: string; steps: string[]; code?: string }
  | { kind: 'text'; content: string }

type Message =
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'assistant'; reply: Reply; visible: number }

type NotebookItem = { pointId: string; title: string; suggestion: string }
type Toast = { title: string; detail: string; mode: 'anchor' | 'weak' }

function intentOf(text: string): Intent {
  const t = text.trim()
  if (/怎么改|如何改|怎么修|如何修|怎么补|如何补|修改方法|修复|修正|怎么处理/.test(t)) {
    return { kind: 'fix', topic: t }
  }
  const pm = t.match(/第\s*(\d+)\s*个?.*(评分点|扣分|为什么)/)
  if (pm || /为什么扣分|扣分原因|扣了.{0,4}分/.test(t)) {
    const idx = pm ? Math.min(Math.max(parseInt(pm[1], 10) - 1, 0), 5) : 1
    return { kind: 'point-detail', index: idx }
  }
  if (/知识|知识点|查阅|概念|原理讲解/.test(t)) return { kind: 'knowledge' }
  if (/汇总|成绩表|全班|名次|排名/.test(t)) return { kind: 'table' }
  if (/评语/.test(t)) return { kind: 'comments' }
  return { kind: 'grade' }
}

/* ------------------------------------------------------------------ */
/* 小件                                                                */
/* ------------------------------------------------------------------ */

function Avatar() {
  return (
    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-zinc-900">
      <Sparkles className="h-3.5 w-3.5 text-white" />
    </div>
  )
}

function ReplyShell({ children }: { children: ReactNode }) {
  return (
    <div className="ag-in flex gap-2.5">
      <Avatar />
      <div className="min-w-0 flex-1 space-y-3">{children}</div>
    </div>
  )
}

function Ring({ value, max, size = 92 }: { value: number; max: number; size?: number }) {
  const ratio = max ? value / max : 0
  const stroke = 7
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f4f4f5" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#18181b" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c}
          initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - ratio) }} transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[22px] font-semibold leading-none tabular-nums text-zinc-900">{value}</span>
        <span className="mt-0.5 text-[10px] text-zinc-400">/ {max}</span>
      </div>
    </div>
  )
}

function aiRiskInfo(rate: number) {
  if (rate > 50) return { label: '高风险', note: 'AI 生成痕迹明显，建议人工复核原创性', cls: 'bg-rose-50 text-rose-600 border-rose-200/70' }
  if (rate > 20) return { label: '中风险', note: '部分段落疑似由 AI 生成', cls: 'bg-amber-50 text-amber-700 border-amber-200/70' }
  return { label: '低风险', note: '原创度较高，AI 痕迹较少', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200/70' }
}

function AiRing({ value }: { value: number }) {
  const ratio = value / 100
  const size = 56, stroke = 5, r = (size - stroke) / 2, c = 2 * Math.PI * r
  const color = value > 50 ? '#E24B4A' : value > 20 ? '#EF9F27' : '#1D9E75'
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f4f4f5" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c}
          initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - ratio) }} transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-[13px] font-semibold tabular-nums" style={{ color }}>{value}%</div>
    </div>
  )
}

function Radar({ dims, size = 150 }: { dims: { label: string; got: number; full: number }[]; size?: number }) {
  const cx = size / 2, cy = size / 2, R = size / 2 - 20, n = dims.length
  const ang = (i: number) => (2 * Math.PI * i) / n - Math.PI / 2
  const pt = (i: number, r: number) => [cx + r * Math.cos(ang(i)), cy + r * Math.sin(ang(i))]
  const poly = (r: number) => dims.map((_, i) => pt(i, r).map((v) => v.toFixed(1)).join(',')).join(' ')
  const value = dims.map((d, i) => pt(i, R * (d.full ? d.got / d.full : 0)).map((v) => v.toFixed(1)).join(',')).join(' ')
  const COLORS = ['#378ADD', '#1D9E75', '#BA7517', '#7F77DD']
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="overflow-visible">
        {[0.34, 0.67, 1].map((g) => <polygon key={g} points={poly(R * g)} fill="none" stroke="#e4e4e7" strokeWidth="1" />)}
        {dims.map((_, i) => { const [x, y] = pt(i, R); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#e4e4e7" strokeWidth="1" /> })}
        <motion.polygon points={value} fill="rgba(24,24,27,0.10)" stroke="#18181b" strokeWidth="1.5" strokeLinejoin="round" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7, ease: 'easeOut' }} />
        {dims.map((d, i) => {
          const [x, y] = pt(i, R + 15); const a = Math.cos(ang(i)); const anchor = Math.abs(a) < 0.3 ? 'middle' : a > 0 ? 'start' : 'end'
          return <text key={d.label} x={x} y={y} textAnchor={anchor} dominantBaseline="middle" fontSize="9" className="fill-zinc-500">{d.label.slice(0, 2)}</text>
        })}
      </svg>
      <div className="mt-1 grid w-full grid-cols-2 gap-x-3 gap-y-0.5">
        {dims.map((d, i) => (
          <div key={d.label} className="flex items-center gap-1.5 text-[10px] text-zinc-500">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: COLORS[i] }} />
            <span className="truncate">{d.label}</span>
            <span className="ml-auto tabular-nums text-zinc-400">{d.got}/{d.full}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 主页面                                                              */
/* ------------------------------------------------------------------ */

export default function Page() {
  const [view, setView] = useState<'grade' | 'class'>('grade')
  const [report, setReport] = useState<GradeResult | null>(null)
  const [reportText, setReportText] = useState('')
  const [reportName, setReportName] = useState('')
  const [workbench, setWorkbench] = useState<WorkbenchData | null>(null)
  const [batchResults, setBatchResults] = useState<GradeResult[]>([])
  const [batching, setBatching] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [phase, setPhase] = useState<'idle' | 'loading' | 'revealing'>('idle')
  const [step, setStep] = useState(0)
  const [reveal, setReveal] = useState<{ msgId: string; count: number; total: number } | null>(null)
  const [activeAnchor, setActiveAnchor] = useState<string | null>(null)
  const [weakAnchor, setWeakAnchor] = useState<string | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  const [sheetPoint, setSheetPoint] = useState<GradedPoint | null>(null)
  const [notebook, setNotebook] = useState<NotebookItem[]>([])
  const [notebookOpen, setNotebookOpen] = useState(false)

  const chatRef = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)

  const busy = phase !== 'idle'
  const adopted = new Set(notebook.map((i) => i.pointId))

  useEffect(() => { chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' }) }, [messages, phase, reveal, notebookOpen])

  useEffect(() => {
    if (phase !== 'loading') return
    setStep(0)
    const t = setInterval(() => setStep((s) => (s + 1) % STEPS.length), 500)
    return () => clearInterval(t)
  }, [phase])

  useEffect(() => {
    if (!reveal) return
    if (reveal.count >= reveal.total) { setReveal(null); setPhase('idle'); return }
    const timer = setTimeout(() => {
      setMessages((ms) => ms.map((m) => (m.id === reveal.msgId && m.role === 'assistant' ? { ...m, visible: reveal.count + 1 } : m)))
      setReveal((r) => (r ? { ...r, count: r.count + 1 } : r))
    }, 1500)
    return () => clearTimeout(timer)
  }, [reveal])

  async function fetchGrade(text: string, name: string): Promise<GradeResult | { ok: false; error: string }> {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 30000)
      const res = await fetch('/api/grade', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reportText: text, fileName: name }), signal: controller.signal })
      clearTimeout(timer)
      if (!res.ok) return { ok: false, error: `评阅服务异常（HTTP ${res.status}），请稍后重试` }
      return await res.json()
    } catch {
      return { ok: false, error: '评阅请求失败，请确认后端服务已启动' }
    }
  }

  async function runGrade(text: string, name: string) {
    setReportText(text)
    setReportName(name)
    setPhase('loading')
    setStep(0)
    let data: GradeResult | { ok: false; error: string }
    try {
      ;[data] = await Promise.all([fetchGrade(text, name), sleep(1200)])
    } catch {
      data = { ok: false, error: '评阅请求失败，请重试' }
    }
    if (!data.ok) {
      setPhase('idle')
      setMessages((m) => [...m, { id: `a${Date.now()}`, role: 'assistant', reply: { kind: 'text', content: 'error' in data ? data.error : '评阅失败，请重试' }, visible: 0 }])
      return
    }
    setReport(data)
    const msgId = `a${Date.now()}`
    setMessages((m) => [...m, { id: msgId, role: 'assistant', reply: { kind: 'grade', points: data.points, aiRate: data.aiRate, summary: data.summary }, visible: 0 }])
    setPhase('revealing')
    setReveal({ msgId, count: 0, total: data.points.length })
  }

  async function ensureDemo(): Promise<GradeResult> {
    if (report) return report
    const data = await fetchGrade(DEMO_REPORT_TEXT, DEMO_NAME)
    if (data.ok) { setReport(data); setReportText(DEMO_REPORT_TEXT); setReportName(DEMO_NAME); return data }
    return { ok: true, fileName: DEMO_NAME, mode: 'mock', rubricCount: 0, chunks: [], points: [], totalScore: 0, maxScore: 0, summary: { comment: '', grade: '' }, violations: [], meta: {} }
  }

  async function send(text: string) {
    const t = text.trim()
    if (!t || busy) return
    setInput('')
    if (taRef.current) taRef.current.style.height = 'auto'
    setMessages((m) => [...m, { id: `u${Date.now()}`, role: 'user', text: t }])
    const intent = intentOf(t)

    if (intent.kind === 'grade') {
      await runGrade(reportText || DEMO_REPORT_TEXT, reportName || DEMO_NAME)
      return
    }
    if (intent.kind === 'point-detail') {
      let rep = report
      if (!rep) rep = await ensureDemo()
      const point = rep.points[intent.index] ?? rep.points[0]
      setPhase('loading'); await sleep(900); setPhase('idle')
      if (point) {
        setMessages((m) => [...m, { id: `a${Date.now()}`, role: 'assistant', reply: { kind: 'point-detail', point }, visible: 0 }])
      } else {
        setMessages((m) => [...m, { id: `a${Date.now()}`, role: 'assistant', reply: { kind: 'text', content: '未能加载示例报告，请稍后重试' }, visible: 0 }])
      }
      return
    }

    setPhase('loading'); await sleep(900); setPhase('idle')
    let reply: Reply
    if (intent.kind === 'knowledge') reply = { kind: 'knowledge', items: KNOWLEDGE }
    else if (intent.kind === 'table') reply = { kind: 'table', ...CLASS_TABLE }
    else if (intent.kind === 'comments') reply = { kind: 'comments', items: COMMENTS }
    else reply = { kind: 'fix', ...resolveFix(intent.topic) }
    setMessages((m) => [...m, { id: `a${Date.now()}`, role: 'assistant', reply, visible: 0 }])
  }

  async function handleFile(file: File) {
    if (busy) return
    setMessages((m) => [...m, { id: `u${Date.now()}`, role: 'user', text: `请评改「${file.name}」` }])
    setPhase('loading'); setStep(0)
    const form = new FormData()
    form.append('file', file)
    let pdata: { ok: boolean; error?: string; fileName?: string; text?: string }
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 30000)
      const pres = await fetch('/api/parse', { method: 'POST', body: form, signal: controller.signal })
      clearTimeout(timer)
      if (!pres.ok) { setPhase('idle'); setMessages((m) => [...m, { id: `a${Date.now()}`, role: 'assistant', reply: { kind: 'text', content: `解析服务异常（HTTP ${pres.status}）` }, visible: 0 }]); return }
      pdata = await pres.json()
    } catch {
      setPhase('idle')
      setMessages((m) => [...m, { id: `a${Date.now()}`, role: 'assistant', reply: { kind: 'text', content: '解析请求失败，请确认后端服务已启动' }, visible: 0 }])
      return
    }
    if (!pdata.ok) {
      setPhase('idle')
      setMessages((m) => [...m, { id: `a${Date.now()}`, role: 'assistant', reply: { kind: 'text', content: pdata.error || '解析失败' }, visible: 0 }])
      return
    }
    setView('grade')
    await runGrade(pdata.text!, pdata.fileName!)
  }

  async function openStudent(s: Student) {
    if (busy) return
    setView('grade')
    let data: { ok: boolean; result?: GradeResult }
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 30000)
      const res = await fetch(`/api/class?report=${s.id}`, { signal: controller.signal })
      clearTimeout(timer)
      data = await res.json()
    } catch {
      data = { ok: false }
    }
    if (!data.ok || !data.result) {
      setMessages([{ id: `a${Date.now()}`, role: 'assistant', reply: { kind: 'text', content: '加载报告失败，请确认后端服务已启动' }, visible: 0 }])
      return
    }
    const r: GradeResult = data.result
    setReport(r)
    setReportText(r.chunks.map((c) => c.text).join('\n\n'))
    setReportName(r.fileName ?? '')
    setActiveAnchor(null); setWeakAnchor(null); setToast(null)
    setMessages([
      { id: `u${Date.now()}`, role: 'user', text: `评改「${s.name}」的报告` },
      { id: `a${Date.now()}`, role: 'assistant', reply: { kind: 'grade', points: r.points, aiRate: r.aiRate, summary: r.summary }, visible: r.points.length },
    ])
  }

  async function openWorkbench() {
    setView('class')
    if (!workbench) {
      try {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 30000)
        const res = await fetch('/api/class', { signal: controller.signal })
        clearTimeout(timer)
        const data = await res.json()
        if (data.ok) setWorkbench(data)
      } catch {
        /* 工作台加载失败，保持空态 */
      }
    }
  }

  async function handleBatchFiles(files: File[]) {
    if (batching) return
    setBatching(true)
    try {
      for (const file of files) {
        const form = new FormData()
        form.append('file', file)
        try {
          const pres = await fetch('/api/parse', { method: 'POST', body: form })
          const pdata = await pres.json()
          if (!pdata.ok) continue
          const gres = await fetch('/api/grade', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reportText: pdata.text, fileName: pdata.fileName }) })
          const gdata = await gres.json()
          if (gdata.ok) setBatchResults((r) => [gdata, ...r])
        } catch { /* 单份失败跳过 */ }
      }
    } finally {
      setBatching(false)
    }
  }

  function openBatchResult(r: GradeResult) {
    setReport(r)
    setReportText(r.chunks.map((c) => c.text).join('\n\n'))
    setReportName(r.fileName ?? '')
    setActiveAnchor(null)
    setWeakAnchor(null)
    setToast(null)
    setView('grade')
    setMessages([
      { id: `u${Date.now()}`, role: 'user', text: `查看「${r.fileName ?? '报告'}」的批阅结果` },
      { id: `a${Date.now()}`, role: 'assistant', reply: { kind: 'grade', points: r.points, aiRate: r.aiRate, summary: r.summary }, visible: r.points.length },
    ])
  }

  const locate = (point: GradedPoint) => {
    setWeakAnchor(null)
    const anchor = point.anchor ?? point.evidence[0]?.chunkId ?? null
    if (!anchor) return
    setToast({ title: '已定位到原文', detail: anchor, mode: 'anchor' })
    const jump = () => {
      setActiveAnchor(anchor)
      requestAnimationFrame(() => document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
    }
    if (activeAnchor === anchor) { setActiveAnchor(null); setTimeout(jump, 50) } else jump()
  }

  const locateAllWeak = () => {
    if (!report) return
    setActiveAnchor(null); setToast(null)
    const weak = report.points.filter((p) => p.verdict !== 'full')
    weak.forEach((p, i) => {
      const anchor = p.anchor ?? p.evidence[0]?.chunkId
      if (!anchor) return
      setTimeout(() => {
        setWeakAnchor(anchor)
        setToast({ title: '扣分点', detail: p.title, mode: 'weak' })
        requestAnimationFrame(() => document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
      }, i * 900)
    })
  }

  const toggleAdopt = (p: GradedPoint) => {
    setNotebook((nb) => {
      const exists = nb.some((i) => i.pointId === p.pointId)
      if (exists) return nb.filter((i) => i.pointId !== p.pointId)
      return [...nb, { pointId: p.pointId, title: p.title, suggestion: p.suggestion }]
    })
  }

  const copyNotebook = () => navigator.clipboard?.writeText(notebook.map((i, idx) => `${idx + 1}. ${i.title}：${i.suggestion}`).join('\n'))
  const exportNotebook = () => download(['# 采纳记事簿', '', ...notebook.map((i, idx) => `${idx + 1}. **${i.title}**：${i.suggestion}`), ''].join('\n'), '采纳记事簿.md', 'text/markdown;charset=utf-8')

  const exportReport = () => {
    if (!report) return
    const head = ['评分点', '得分', '满分', '状态', '评语']
    const rows = report.points.map((p) => [p.title, String(p.score), String(p.maxScore), VERDICT_STYLE[p.verdict].label, p.suggestion.replace(/,/g, '，')])
    const csv = [head, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n')
    download('\ufeff' + csv, `${report.fileName ?? '成绩单'}.csv`, 'text/csv;charset=utf-8')
  }

  const resetChat = () => { setMessages([]); setActiveAnchor(null); setWeakAnchor(null); setToast(null); setReveal(null); setPhase('idle') }

  return (
    <div
      className="h-[100dvh] w-full overflow-hidden text-zinc-900 antialiased"
      style={{
        fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif",
        backgroundImage: [
          'radial-gradient(circle at 1px 1px, rgba(9,9,11,0.055) 1px, transparent 0)',
          'radial-gradient(880px 520px at 92% -10%, rgba(96,165,250,0.10), transparent 62%)',
          'radial-gradient(720px 480px at -6% 6%, rgba(167,139,250,0.09), transparent 62%)',
          'linear-gradient(180deg, #ffffff 0%, #fafafa 42%, #f3f3f5 100%)',
        ].join(','),
        backgroundSize: '22px 22px, 100% 100%, 100% 100%, 100% 100%',
      }}
    >
      <style>{`
        .ag-scroll::-webkit-scrollbar{width:9px;height:9px}
        .ag-scroll::-webkit-scrollbar-track{background:transparent}
        .ag-scroll::-webkit-scrollbar-thumb{background:rgba(9,9,11,.13);border-radius:99px;border:2.5px solid transparent;background-clip:content-box}
        .ag-scroll::-webkit-scrollbar-thumb:hover{background:rgba(9,9,11,.24);background-clip:content-box}
        .ag-anchor{border-radius:4px;transition:background-color .5s ease,box-shadow .5s ease}
        .ag-anchor-on{background-color:rgba(253,224,71,.5);box-shadow:0 0 0 4px rgba(253,224,71,.22);animation:ag-flash .75s ease-out}
        .ag-anchor-weak-on{background-color:rgba(225,29,72,.12);box-shadow:0 0 0 4px rgba(225,29,72,.16);animation:ag-flash-weak .75s ease-out}
        @keyframes ag-flash{0%{background-color:rgba(253,224,71,0);box-shadow:0 0 0 0 rgba(253,224,71,0)}45%{background-color:rgba(253,224,71,.9);box-shadow:0 0 0 8px rgba(253,224,71,.38)}100%{background-color:rgba(253,224,71,.5);box-shadow:0 0 0 4px rgba(253,224,71,.22)}}
        @keyframes ag-flash-weak{0%{background-color:rgba(244,63,94,0);box-shadow:0 0 0 0 rgba(244,63,94,0)}45%{background-color:rgba(244,63,94,.34);box-shadow:0 0 0 8px rgba(244,63,94,.22)}100%{background-color:rgba(225,29,72,.12);box-shadow:0 0 0 4px rgba(225,29,72,.16)}}
        @keyframes ag-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        .ag-in{animation:ag-in .38s cubic-bezier(.22,1,.36,1) both}
        @keyframes ag-spin{to{transform:rotate(360deg)}}
        .ag-spin{animation:ag-spin .8s linear infinite}
        @media (prefers-reduced-motion:reduce){.ag-anchor-on,.ag-anchor-weak-on,.ag-in,.ag-spin{animation:none}}
      `}</style>

      <div className="mx-auto flex h-full max-w-[1800px] flex-col p-3 sm:p-4">
        {/* 顶栏 + 视图切换 */}
        <header className="flex h-12 shrink-0 items-center gap-3 px-1">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-zinc-900">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-[13px] font-medium tracking-tight">彼此_Autograder</span>
          </div>
          <div className="ml-3 flex items-center gap-1 rounded-xl border border-zinc-200 bg-white p-1">
            <button
              onClick={() => setView('grade')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11.5px] font-medium transition ${view === 'grade' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900'}`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              评阅
            </button>
            <button
              onClick={openWorkbench}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11.5px] font-medium transition ${view === 'class' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900'}`}
            >
              <Users className="h-3.5 w-3.5" />
              工作台
            </button>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {report && (
              <button onClick={exportReport} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-zinc-900 px-3 text-[11.5px] font-medium text-white transition hover:bg-zinc-700">
                <Download className="h-3.5 w-3.5" />
                导出成绩单
              </button>
            )}
          </div>
        </header>

        {view === 'class' ? (
          <Workbench data={workbench} onOpenStudent={openStudent} onBatchFiles={handleBatchFiles} onOpenResult={openBatchResult} batchResults={batchResults} busy={busy || batching} />
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            {/* 左：AI 评阅 */}
            <section className="relative flex min-h-0 flex-col overflow-hidden rounded-2xl border border-zinc-200/70 bg-white/75 shadow-[0_1px_2px_rgba(9,9,11,.04),0_10px_30px_-18px_rgba(9,9,11,.18)] backdrop-blur-xl">
              <header className="flex h-12 shrink-0 items-center gap-3 border-b border-zinc-200/60 bg-white/70 px-4">
                <div className="min-w-0">
                  <h1 className="truncate text-[13px] font-medium tracking-tight">AI 评阅</h1>
                  <p className="truncate text-[11px] text-zinc-500">{reportName || '尚未加载报告'}</p>
                </div>
                <span className="ml-auto hidden items-center gap-1 rounded-full border border-emerald-200/70 bg-emerald-50 px-2 py-[3px] text-[10.5px] font-medium text-emerald-700 sm:inline-flex">
                  <Target className="h-3 w-3" />
                  证据可溯源
                </span>
                <button onClick={resetChat} className="grid h-7 w-7 place-items-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700" title="清空对话">
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </header>

              <div ref={chatRef} className="ag-scroll min-h-0 flex-1 overflow-y-auto">
                {messages.length === 0 && !busy ? (
                  <div className="flex h-full flex-col items-center justify-center px-6 py-10 text-center">
                    <div className="grid h-14 w-14 place-items-center rounded-2xl bg-zinc-900">
                      <Sparkles className="h-7 w-7 text-white" />
                    </div>
                    <h2 className="mt-5 text-[15px] font-medium tracking-tight text-zinc-900">你好，我是彼此_Autograder</h2>
                    <p className="mt-1.5 max-w-[300px] text-[12px] leading-relaxed text-zinc-500">
                      上传实验报告，或直接让我评改示例报告，我会逐评分点核查并给出可溯源到原文的证据。
                    </p>
                    <div className="mt-6 grid w-full max-w-[320px] gap-2">
                      {CHIPS.slice(0, 4).map((c) => (
                        <button key={c} onClick={() => send(c)} className="group flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-left text-[12px] text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900">
                          <span className="min-w-0 flex-1 truncate">{c}</span>
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-300 transition group-hover:text-zinc-500" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 px-4 py-5">
                    {messages.map((m) =>
                      m.role === 'user' ? (
                        <div key={m.id} className="ag-in flex justify-end">
                          <div className="max-w-[88%] rounded-2xl rounded-br-md bg-zinc-900 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-white shadow-[0_1px_2px_rgba(9,9,11,.08)]">{m.text}</div>
                        </div>
                      ) : (
                        <AssistantMessage key={m.id} reply={m.reply} visible={m.visible} activeAnchor={activeAnchor} adopted={adopted} onLocate={locate} onLocateAll={locateAllWeak} onOpenSheet={setSheetPoint} onAdopt={toggleAdopt} onExport={exportReport} onAskFix={(label) => send(`怎么修改「${label}」？`)} />
                      )
                    )}

                    {phase === 'loading' && (
                      <div className="ag-in flex gap-2.5">
                        <Avatar />
                        <div className="flex-1 rounded-xl border border-zinc-200/80 bg-white px-3.5 py-3">
                          <div className="flex items-center gap-2">
                            <span className="ag-spin inline-block h-3.5 w-3.5 rounded-full border-2 border-zinc-200 border-t-zinc-500" />
                            <span className="text-[12px] text-zinc-500">{STEPS[step]}…</span>
                          </div>
                          <div className="mt-2.5 space-y-1.5">
                            {[80, 62, 44].map((w, i) => <div key={i} className="h-2 animate-pulse rounded-full bg-zinc-100" style={{ width: `${w}%`, animationDelay: `${i * 0.12}s` }} />)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 评语记事本 */}
              <div className="absolute bottom-[84px] right-4 z-20 flex flex-col items-end gap-2">
                <AnimatePresence>
                  {notebookOpen && (
                    <motion.div initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.97 }} transition={{ duration: 0.18 }} className="w-64 rounded-xl border border-zinc-200 bg-white shadow-[0_12px_40px_-16px_rgba(9,9,11,.28)]">
                      <div className="flex items-center gap-1.5 border-b border-zinc-100 px-3 py-2.5">
                        <NotebookPen className="h-3.5 w-3.5 text-zinc-500" />
                        <span className="text-[11px] font-medium text-zinc-700">采纳记事簿</span>
                        <span className="ml-auto rounded-full bg-zinc-100 px-1.5 py-[1px] text-[10px] tabular-nums text-zinc-500">{notebook.length}</span>
                      </div>
                      <div className="ag-scroll max-h-44 overflow-y-auto px-2 py-2">
                        {notebook.length === 0 ? <p className="px-1 py-3 text-center text-[10.5px] text-zinc-400">点卡片上的「采纳」收集评语</p> : (
                          <ul className="space-y-1.5">
                            {notebook.map((it, i) => (
                              <li key={it.pointId} className="rounded-lg bg-zinc-50 px-2.5 py-2">
                                <p className="text-[10.5px] font-medium text-zinc-700">{i + 1}. {it.title}</p>
                                <p className="mt-0.5 text-[10px] leading-relaxed text-zinc-500">{it.suggestion}</p>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div className="flex gap-1.5 border-t border-zinc-100 px-2.5 py-2">
                        <button onClick={copyNotebook} className="flex-1 rounded-lg border border-zinc-200 py-1.5 text-[10.5px] text-zinc-600 transition hover:bg-zinc-50">复制</button>
                        <button onClick={exportNotebook} className="flex-1 rounded-lg bg-zinc-900 py-1.5 text-[10.5px] font-medium text-white transition hover:bg-zinc-700">导出 .md</button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <motion.button whileTap={{ scale: 0.92 }} onClick={() => setNotebookOpen((o) => !o)} className="relative grid h-10 w-10 place-items-center rounded-full bg-zinc-900 text-white shadow-[0_8px_20px_-8px_rgba(9,9,11,.5)]" title="采纳记事簿">
                  <NotebookPen className="h-4 w-4" />
                  {notebook.length > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-amber-400 px-1 text-[9px] font-semibold tabular-nums text-zinc-900">{notebook.length}</span>}
                </motion.button>
              </div>

              <div className="shrink-0 border-t border-zinc-200/60 bg-white/70 px-4 pb-3 pt-3">
                <div className="ag-scroll -mx-1 mb-2.5 flex gap-2 overflow-x-auto px-1 pb-0.5">
                  {CHIPS.map((c) => (
                    <button key={c} onClick={() => send(c)} className="shrink-0 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[11px] text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900">{c}</button>
                  ))}
                </div>
                <div className="flex items-end gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 transition focus-within:border-zinc-300 focus-within:shadow-[0_0_0_4px_rgba(9,9,11,.045)]">
                  <button className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"><Paperclip className="h-4 w-4" /></button>
                  <textarea
                    ref={taRef} rows={1} value={input}
                    placeholder="发消息，让我评改这份实验报告…"
                    onChange={(e) => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = `${Math.min(e.target.scrollHeight, 132)}px` }}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }}
                    className="ag-scroll max-h-[132px] flex-1 resize-none bg-transparent py-1 text-[12.5px] leading-relaxed text-zinc-900 outline-none placeholder:text-zinc-400"
                  />
                  <button onClick={() => send(input)} disabled={!input.trim() || busy} className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-zinc-900 text-white transition hover:bg-zinc-700 disabled:opacity-25 disabled:hover:bg-zinc-900">
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="mt-2 text-center text-[10.5px] text-zinc-400">AI 评阅结果仅供参考，请教师复核后确认</p>
              </div>
            </section>

            {/* 右：实验报告 */}
            <section className="relative flex min-h-0 flex-col overflow-hidden rounded-2xl border border-zinc-200/70 bg-white/75 shadow-[0_1px_2px_rgba(9,9,11,.04),0_10px_30px_-18px_rgba(9,9,11,.18)] backdrop-blur-xl">
              <header className="flex h-12 shrink-0 items-center gap-3 border-b border-zinc-200/60 bg-white/70 px-4">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-zinc-200 bg-white"><FileText className="h-4 w-4 text-zinc-500" /></div>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium tracking-tight">{reportName || '未加载报告'}</p>
                  <p className="truncate text-[11px] text-zinc-500">{report ? `${report.chunks.length} 个证据块 · 总分 ${report.totalScore}/${report.maxScore}` : '上传报告后自动解析'}</p>
                </div>
              </header>

              {report ? (
                <ReportViewer chunks={report.chunks} activeAnchor={activeAnchor} weakAnchor={weakAnchor} />
              ) : (
                <div className="ag-scroll min-h-0 flex-1 overflow-y-auto bg-zinc-100/50 p-6">
                  <div className="mx-auto max-w-[520px] pt-8">
                    <UploadDropzone onFile={handleFile} busy={busy} />
                    <div className="mt-4 flex items-center gap-3">
                      <div className="h-px flex-1 bg-zinc-200" />
                      <span className="text-[11px] text-zinc-400">或</span>
                      <div className="h-px flex-1 bg-zinc-200" />
                    </div>
                    <button onClick={() => send('帮我评改这份实验报告')} className="mt-4 w-full rounded-xl border border-zinc-200 bg-white py-2.5 text-[12px] font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50">
                      加载示例报告并评阅
                    </button>
                  </div>
                </div>
              )}

              {toast && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4">
                  <div className={`ag-in pointer-events-auto mx-auto flex max-w-[520px] items-center gap-2 rounded-xl border px-3 py-2 backdrop-blur ${toast.mode === 'weak' ? 'border-rose-300/70 bg-rose-50/95 text-rose-900' : 'border-amber-300/70 bg-amber-50/95 text-amber-900'}`}>
                    {toast.mode === 'weak' ? <ScanSearch className="h-3.5 w-3.5 shrink-0 text-rose-500" /> : <Highlighter className="h-3.5 w-3.5 shrink-0 text-amber-600" />}
                    <span className="truncate text-[11.5px]">
                      <span className="font-medium">{toast.title}</span>
                      <span className="mx-1.5 opacity-40">·</span>
                      <span className="opacity-70">{toast.detail}</span>
                    </span>
                    <button onClick={() => { setActiveAnchor(null); setWeakAnchor(null); setToast(null) }} className="ml-auto grid h-5 w-5 shrink-0 place-items-center rounded-md opacity-60 transition hover:bg-black/5 hover:opacity-100"><X className="h-3 w-3" /></button>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {/* 评分依据抽屉 */}
      <Sheet open={!!sheetPoint} onOpenChange={(o) => !o && setSheetPoint(null)}>
        <SheetContent side="right" className="bg-zinc-50">
          <SheetDescription className="sr-only">评分依据详情</SheetDescription>
          {sheetPoint && (
            <div className="ag-scroll min-h-0 flex-1 overflow-y-auto px-5 py-5">
              <SheetHeader>
                <div className="flex items-center gap-2">
                  <span className="rounded-md border border-zinc-200 bg-white px-1.5 py-[2px] text-[11px] font-medium tabular-nums text-zinc-500">{sheetPoint.pointId.replace(/\D/g, '').padStart(2, '0')}</span>
                  <SheetTitle>{sheetPoint.title}</SheetTitle>
                </div>
                <div className="flex items-center gap-2 pt-0.5">
                  <span className="text-[22px] font-semibold tabular-nums leading-none">{sheetPoint.score}<span className="text-[12px] font-normal text-zinc-400">/{sheetPoint.maxScore}</span></span>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-[2px] text-[11px] font-medium ${VERDICT_STYLE[sheetPoint.verdict].bg} ${VERDICT_STYLE[sheetPoint.verdict].text}`}>
                    {sheetPoint.verdict === 'full' ? <Check className="h-3 w-3" /> : sheetPoint.verdict === 'partial' ? <Minus className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    {VERDICT_STYLE[sheetPoint.verdict].label}
                  </span>
                </div>
              </SheetHeader>

              <Section title="满分标准" icon={<ListChecks className="h-3.5 w-3.5 text-zinc-500" />}>
                <ul className="space-y-1.5">
                  {sheetPoint.criteria.map((c, i) => (
                    <li key={c} className="flex items-start gap-2 text-[12px] text-zinc-700">
                      <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full ${sheetPoint.criteriaMet[i] ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-500'}`}>
                        {sheetPoint.criteriaMet[i] ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
                      </span>
                      {c}
                    </li>
                  ))}
                </ul>
              </Section>

              <Section title="扣分细则" icon={<Minus className="h-3.5 w-3.5 text-zinc-500" />}>
                {sheetPoint.deductions.length === 0 ? <p className="text-[12px] text-zinc-400">无扣分项</p> : (
                  <ul className="space-y-1.5">
                    {sheetPoint.deductions.map((d) => (
                      <li key={d.label} className="flex items-start justify-between gap-3 text-[12px] text-zinc-700">
                        <span>{d.label}</span>
                        <span className="shrink-0 rounded-md bg-rose-50 px-1.5 py-[1px] text-[11px] font-medium tabular-nums text-rose-600">-{d.amount}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <Section title="AI 判定逻辑" icon={<Sparkles className="h-3.5 w-3.5 text-zinc-500" />}>
                <p className="rounded-lg border border-zinc-200/70 bg-white px-3 py-2.5 text-[12px] leading-relaxed text-zinc-700">{sheetPoint.logic}</p>
                {sheetPoint.evidence[0] && (
                  <div className="mt-2 rounded-lg border border-amber-200/60 bg-amber-50/60 px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <Quote className="h-3 w-3 text-amber-600/80" />
                      <span className="text-[10.5px] font-medium text-amber-800/90">原文引用</span>
                      <span className="ml-auto font-mono text-[9.5px] text-amber-700/55">{sheetPoint.evidence[0].chunkId}</span>
                    </div>
                    <p className="mt-1.5 text-[12px] leading-relaxed text-zinc-700">{sheetPoint.evidence[0].quote}</p>
                  </div>
                )}
              </Section>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-5">
      <div className="mb-2 flex items-center gap-1.5">{icon}<span className="text-[12px] font-medium text-zinc-700">{title}</span></div>
      {children}
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* 各类回复                                                            */
/* ------------------------------------------------------------------ */

function AssistantMessage({ reply, visible, activeAnchor, adopted, onLocate, onLocateAll, onOpenSheet, onAdopt, onExport, onAskFix }: {
  reply: Reply
  visible: number
  activeAnchor: string | null
  adopted: Set<string>
  onLocate: (p: GradedPoint) => void
  onLocateAll: () => void
  onOpenSheet: (p: GradedPoint) => void
  onAdopt: (p: GradedPoint) => void
  onExport: () => void
  onAskFix: (label: string) => void
}) {
  if (reply.kind === 'grade') return <GradeReply reply={reply} visible={visible} activeAnchor={activeAnchor} adopted={adopted} onLocate={onLocate} onLocateAll={onLocateAll} onOpenSheet={onOpenSheet} onAdopt={onAdopt} onExport={onExport} />
  if (reply.kind === 'point-detail') return <PointDetailReply point={reply.point} activeAnchor={activeAnchor} adopted={adopted} onLocate={onLocate} onOpenSheet={onOpenSheet} onAdopt={onAdopt} onAskFix={onAskFix} />
  if (reply.kind === 'knowledge') return <KnowledgeReply items={reply.items} />
  if (reply.kind === 'table') return <TableReply caption={reply.caption} head={reply.head} rows={reply.rows} />
  if (reply.kind === 'comments') return <CommentsReply items={reply.items} />
  if (reply.kind === 'fix') return <FixReply title={reply.title} steps={reply.steps} code={reply.code} />
  return <ReplyShell><p className="text-[12.5px] leading-relaxed text-zinc-700">{reply.content}</p></ReplyShell>
}

function Overview({ points, onLocateAll }: { points: GradedPoint[]; onLocateAll: () => void }) {
  const total = points.reduce((s, p) => s + p.score, 0)
  const full = points.reduce((s, p) => s + p.maxScore, 0)
  const pct = full ? Math.round((total / full) * 100) : 0
  const grade = pct >= 90 ? '优秀' : pct >= 80 ? '良好' : pct >= 70 ? '中等' : pct >= 60 ? '及格' : '不及格'
  const weakCount = points.filter((p) => p.verdict !== 'full').length
  return (
    <div className="rounded-xl border border-zinc-200/80 bg-gradient-to-b from-zinc-50/90 to-white p-3.5">
      <div className="flex items-center gap-4">
        <Ring value={total} max={full} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-zinc-500">总分分布</span>
            <span className="rounded-full border border-sky-200/70 bg-sky-50 px-2 py-[2px] text-[10.5px] font-medium text-sky-700">{grade} · 前 {Math.max(0, 100 - pct) + 15}%</span>
          </div>
          <Radar dims={dimsFromPoints(points)} />
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-zinc-100 pt-2.5">
        <span className="text-[10.5px] text-zinc-400">共 {points.length} 个评分点</span>
        <button onClick={onLocateAll} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300/70 bg-rose-50/60 px-2.5 py-1.5 text-[11px] font-medium text-rose-700 transition hover:bg-rose-100">
          <ScanSearch className="h-3.5 w-3.5" />
          定位 {weakCount} 处扣分点
        </button>
      </div>
    </div>
  )
}

function PointCard({ p, activeAnchor, adopted, onLocate, onOpenSheet, onAdopt }: {
  p: GradedPoint
  activeAnchor: string | null
  adopted: Set<string>
  onLocate: (p: GradedPoint) => void
  onOpenSheet: (p: GradedPoint) => void
  onAdopt: (p: GradedPoint) => void
}) {
  const v = VERDICT_STYLE[p.verdict]
  const anchor = p.anchor ?? p.evidence[0]?.chunkId ?? null
  const on = anchor !== null && activeAnchor === anchor
  const isAdopted = adopted.has(p.pointId)
  const idx = p.pointId.replace(/\D/g, '').padStart(2, '0')
  return (
    <motion.article initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: 'easeOut' }} className={`group overflow-hidden rounded-xl border bg-white transition ${on ? 'border-amber-300 shadow-[0_0_0_3px_rgba(251,191,36,.16)]' : 'border-zinc-200/80 hover:border-zinc-300'}`}>
      <div className="flex items-start gap-2.5 px-3.5 pt-3">
        <span className="mt-[1px] shrink-0 rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-[2px] text-[10.5px] font-medium tabular-nums text-zinc-500">{idx}</span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[12.5px] font-medium leading-snug tracking-tight text-zinc-900">{p.title}</h3>
          <p className="mt-0.5 text-[10.5px] text-zinc-400">{GROUPS[p.pointId] ?? '评分项'} · {anchor ?? '无证据'}</p>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[15px] font-semibold leading-none tabular-nums">{p.score}<span className="text-[11px] font-normal text-zinc-400">/{p.maxScore}</span></div>
          <span className={`mt-1.5 inline-flex items-center gap-1 rounded-full border px-1.5 py-[1.5px] text-[10px] font-medium ${v.bg} ${v.text}`}>
            {p.verdict === 'full' ? <Check className="h-2.5 w-2.5" /> : p.verdict === 'partial' ? <Minus className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
            {v.label}
          </span>
        </div>
      </div>

      <div className="px-3.5 pt-2.5">
        <div className="h-1 overflow-hidden rounded-full bg-zinc-100">
          <motion.div className={`h-full rounded-full ${v.bar}`} initial={{ width: 0 }} animate={{ width: `${(p.score / p.maxScore) * 100}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} />
        </div>
      </div>

      {p.evidence[0] && (
        <div className="mx-3.5 mt-3 rounded-lg border border-amber-200/60 bg-amber-50/50 px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            <Quote className="h-3 w-3 text-amber-600/80" />
            <span className="text-[10.5px] font-medium text-amber-800/90">原文引用</span>
            <span className="ml-auto font-mono text-[9.5px] text-amber-700/55">{p.evidence[0].chunkId}</span>
          </div>
          <p className="mt-1.5 text-[12px] leading-relaxed text-zinc-700">{p.evidence[0].quote}</p>
        </div>
      )}

      <div className="mx-3.5 mt-2 rounded-lg border border-zinc-200/70 bg-zinc-50/70 px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <Lightbulb className="h-3 w-3 text-zinc-500" />
          <span className="text-[10.5px] font-medium text-zinc-600">推荐修改</span>
        </div>
        <p className="mt-1.5 text-[12px] leading-relaxed text-zinc-700">{p.suggestion}</p>
      </div>

      <div className="flex items-center gap-1.5 px-3.5 py-3">
        <button onClick={() => onLocate(p)} className={`inline-flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[11.5px] font-medium transition ${on ? 'bg-amber-400 text-zinc-900 shadow-[0_0_0_3px_rgba(251,191,36,.24)]' : 'border border-amber-300/70 bg-amber-50/60 text-amber-900 hover:bg-amber-100'}`}>
          <Crosshair className="h-3.5 w-3.5" />
          {on ? '已定位' : '定位原文'}
        </button>
        <button onClick={() => onAdopt(p)} className={`inline-flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-[11.5px] transition ${isAdopted ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'}`}>
          <Check className="h-3.5 w-3.5" />
          {isAdopted ? '已采纳' : '采纳'}
        </button>
        <button onClick={() => onOpenSheet(p)} className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 text-[11.5px] text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900">
          <Info className="h-3.5 w-3.5" />
          评分依据
        </button>
        <button className="ml-auto grid h-7 w-7 place-items-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"><Copy className="h-3.5 w-3.5" /></button>
      </div>
    </motion.article>
  )
}

function GradeReply({ reply, visible, activeAnchor, adopted, onLocate, onLocateAll, onOpenSheet, onAdopt, onExport }: {
  reply: Extract<Reply, { kind: 'grade' }>
  visible: number
  activeAnchor: string | null
  adopted: Set<string>
  onLocate: (p: GradedPoint) => void
  onLocateAll: () => void
  onOpenSheet: (p: GradedPoint) => void
  onAdopt: (p: GradedPoint) => void
  onExport: () => void
}) {
  const points = reply.points
  const done = visible >= points.length
  const weakCount = points.filter((p) => p.verdict !== 'full').length
  const current = visible < points.length ? points[visible] : null

  return (
    <ReplyShell>
      <p className="text-[12.5px] leading-relaxed text-zinc-700">
        已按评分细则开始逐项核查，共 <span className="font-medium text-zinc-900">{points.length}</span> 个评分点。
        点击「定位原文」在右侧<span className="text-amber-700">黄色高亮</span>；「定位扣分点」以<span className="text-rose-600">红色高亮</span>依次标出失分处。
      </p>
      <Overview points={points} onLocateAll={onLocateAll} />
      {!done && (
        <div>
          <div className="mb-1.5 flex items-center justify-between text-[10.5px] text-zinc-500">
            <span className="inline-flex items-center gap-1.5"><span className="ag-spin inline-block h-3 w-3 rounded-full border-2 border-zinc-200 border-t-zinc-500" />正在逐项评阅</span>
            <span className="tabular-nums">{visible}/{points.length} · {current ? current.title : '完成'}</span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-zinc-100">
            <motion.div className="h-full rounded-full bg-zinc-900" animate={{ width: `${(visible / points.length) * 100}%` }} transition={{ duration: 0.4, ease: 'easeOut' }} />
          </div>
        </div>
      )}
      <div className="space-y-2.5">
        {points.slice(0, visible).map((p) => (
          <PointCard key={p.pointId} p={p} activeAnchor={activeAnchor} adopted={adopted} onLocate={onLocate} onOpenSheet={onOpenSheet} onAdopt={onAdopt} />
        ))}
      </div>
      {done && (
        <div className="rounded-xl border border-zinc-200/80 bg-white px-3.5 py-3">
          <div className="flex items-center gap-1.5">
            <ListChecks className="h-3.5 w-3.5 text-zinc-500" />
            <span className="text-[11px] font-medium text-zinc-600">总评语</span>
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-[2px] text-[10px] font-medium text-emerald-700"><Check className="h-2.5 w-2.5" />评阅完成</span>
          </div>
          <p className="mt-1.5 text-[12px] leading-relaxed text-zinc-700">
            {reply.summary?.comment ?? '报告已完成逐项评阅。'}
          </p>
          {reply.aiRate != null && (
            <div className="mt-2.5 flex items-center gap-3 rounded-lg border border-zinc-200/70 bg-zinc-50/60 px-3 py-2.5">
              <AiRing value={reply.aiRate} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10.5px] font-medium text-zinc-600">AI 生成率检测</span>
                  <span className={`rounded-full border px-1.5 py-[1px] text-[10px] font-medium ${aiRiskInfo(reply.aiRate).cls}`}>{aiRiskInfo(reply.aiRate).label}</span>
                </div>
                <p className="mt-0.5 text-[11px] text-zinc-500">{aiRiskInfo(reply.aiRate).note}</p>
              </div>
            </div>
          )}
          <div className="mt-3 flex items-center gap-1.5 border-t border-zinc-100 pt-2.5">
            <button onClick={onExport} className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-zinc-900 px-2.5 text-[11.5px] font-medium text-white transition hover:bg-zinc-700"><Download className="h-3.5 w-3.5" />导出成绩单</button>
            <button onClick={onLocateAll} className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-2.5 text-[11.5px] text-rose-600 transition hover:bg-rose-50"><ScanSearch className="h-3.5 w-3.5" />定位 {weakCount} 处扣分点</button>
          </div>
        </div>
      )}
    </ReplyShell>
  )
}

function PointDetailReply({ point, activeAnchor, adopted, onLocate, onOpenSheet, onAdopt, onAskFix }: {
  point: GradedPoint
  activeAnchor: string | null
  adopted: Set<string>
  onLocate: (p: GradedPoint) => void
  onOpenSheet: (p: GradedPoint) => void
  onAdopt: (p: GradedPoint) => void
  onAskFix: (label: string) => void
}) {
  const lost = point.maxScore - point.score
  const unmet = point.criteria.filter((_, i) => !point.criteriaMet[i])
  return (
    <ReplyShell>
      <p className="text-[12.5px] leading-relaxed text-zinc-700">
        <span className="font-medium text-zinc-900">{point.title}</span> 满分 {point.maxScore}，实得 {point.score}，
        扣 <span className="font-medium text-rose-600">{lost} 分</span>。逐条扣分原因如下：
      </p>
      <div className="space-y-2">
        {point.deductions.length === 0 ? (
          <div className="rounded-lg border border-emerald-200/70 bg-emerald-50/60 px-3 py-2.5 text-[12px] text-emerald-800">该评分点无扣分项，已完全达标。</div>
        ) : (
          point.deductions.map((d, i) => (
            <div key={d.label} className="flex items-start gap-2.5 rounded-lg border border-rose-200/70 bg-rose-50/50 px-3 py-2.5">
              <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-rose-500 text-[10px] font-semibold text-white">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium text-zinc-800">{d.label}</p>
                <span className="mt-0.5 inline-block rounded bg-white px-1.5 py-[1px] text-[10.5px] font-medium tabular-nums text-rose-600">-{d.amount} 分</span>
              </div>
              <button onClick={() => onAskFix(d.label)} className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[10.5px] text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900">
                <Wrench className="h-3 w-3" />
                怎么改？
              </button>
            </div>
          ))
        )}
      </div>
      {unmet.length > 0 && (
        <div className="rounded-lg border border-zinc-200/70 bg-white px-3 py-2.5">
          <div className="flex items-center gap-1.5"><X className="h-3 w-3 text-zinc-400" /><span className="text-[10.5px] font-medium text-zinc-600">未满足的满分标准</span></div>
          <ul className="mt-1.5 space-y-1">
            {unmet.map((c) => <li key={c} className="flex items-start gap-1.5 text-[12px] text-zinc-700"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-zinc-300" />{c}</li>)}
          </ul>
        </div>
      )}
      <PointCard p={point} activeAnchor={activeAnchor} adopted={adopted} onLocate={onLocate} onOpenSheet={onOpenSheet} onAdopt={onAdopt} />
    </ReplyShell>
  )
}

function KnowledgeReply({ items }: { items: KnowledgeItem[] }) {
  return (
    <ReplyShell>
      <p className="text-[12.5px] leading-relaxed text-zinc-700">以下是本实验报告涉及的 <span className="font-medium text-zinc-900">{items.length}</span> 个核心知识点：</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((k, i) => (
          <motion.div key={k.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.06 }} className="rounded-xl border border-zinc-200/80 bg-white p-3">
            <div className="flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5 text-sky-500" /><h4 className="text-[12px] font-medium text-zinc-900">{k.title}</h4></div>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-zinc-600">{k.body}</p>
          </motion.div>
        ))}
      </div>
    </ReplyShell>
  )
}

function TableReply({ caption, head, rows }: { caption: string; head: string[]; rows: string[][] }) {
  return (
    <ReplyShell>
      <p className="text-[12.5px] leading-relaxed text-zinc-700">已生成 <span className="font-medium text-zinc-900">{caption}</span>：</p>
      <div className="overflow-x-auto rounded-xl border border-zinc-200/80 bg-white">
        <table className="w-full border-collapse text-[11.5px]">
          <thead><tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">{head.map((h) => <th key={h} className="whitespace-nowrap px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
          <tbody className="text-zinc-700">
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-zinc-100 last:border-0">
                {r.map((cell, j) => <td key={j} className={`whitespace-nowrap px-3 py-2 ${j === 0 ? 'font-mono text-zinc-500' : j === 2 ? 'font-medium tabular-nums' : ''}`}>{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={() => download('\ufeff' + [head, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n'), '全班成绩汇总.csv', 'text/csv;charset=utf-8')} className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-zinc-900 px-2.5 text-[11.5px] font-medium text-white transition hover:bg-zinc-700">
        <Download className="h-3.5 w-3.5" />导出汇总表
      </button>
    </ReplyShell>
  )
}

function CommentsReply({ items }: { items: CommentItem[] }) {
  return (
    <ReplyShell>
      <p className="text-[12.5px] leading-relaxed text-zinc-700">已按评分点为每位同学生成 <span className="font-medium text-zinc-900">个性化评语</span>：</p>
      <div className="space-y-2">
        {items.map((c, i) => (
          <motion.div key={c.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.05 }} className="rounded-xl border border-zinc-200/80 bg-white px-3 py-2.5">
            <div className="flex items-center gap-1.5"><span className="rounded-md bg-zinc-100 px-1.5 py-[1px] text-[10px] font-medium tabular-nums text-zinc-500">{String(i + 1).padStart(2, '0')}</span><h4 className="text-[12px] font-medium text-zinc-900">{c.title}</h4></div>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-zinc-600">{c.text}</p>
          </motion.div>
        ))}
      </div>
    </ReplyShell>
  )
}

function FixReply({ title, steps, code }: { title: string; steps: string[]; code?: string }) {
  return (
    <ReplyShell>
      <p className="text-[12.5px] leading-relaxed text-zinc-700"><span className="font-medium text-zinc-900">{title}</span>，按以下步骤修改：</p>
      <ol className="space-y-1.5">
        {steps.map((s, i) => (
          <li key={i} className="flex items-start gap-2.5 rounded-lg border border-zinc-200/70 bg-white px-3 py-2 text-[12px] text-zinc-700">
            <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-zinc-900 text-[10px] font-semibold text-white">{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
      {code && <pre className="overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 font-mono text-[11px] leading-relaxed text-zinc-700">{code}</pre>}
    </ReplyShell>
  )
}
