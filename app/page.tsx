'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Sparkles, Send, FileText, Quote, Lightbulb, Crosshair, Highlighter,
  Check, X, Minus, Search, Plus, Download, Copy, RotateCcw, Paperclip,
  Info, Target, ListChecks, Layers, ChevronRight,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/* mock data                                                          */
/* ------------------------------------------------------------------ */

type Verdict = 'full' | 'partial' | 'missing'

type Point = {
  id: string
  idx: string
  title: string
  group: string
  score: number
  max: number
  verdict: Verdict
  anchor: string
  anchorLabel: string
  chunk: string
  quote: string
  suggestion: string
}

const POINTS: Point[] = [
  {
    id: 'p1', idx: '01', title: '实验目的与原理阐述', group: '内容与原理',
    score: 10, max: 10, verdict: 'full',
    anchor: 'q-purpose', anchorLabel: '第 1 节 · 实验目的', chunk: 'chunk_003',
    quote: '本实验旨在通过实现时间片轮转（RR）与优先级调度两种算法，理解进程调度中上下文切换的开销来源，并掌握 PCB 的构造方式与就绪队列的组织形式。',
    suggestion: '论述完整。可补一句与真实操作系统调度器的对应关系，让原理部分更有纵深。',
  },
  {
    id: 'p2', idx: '02', title: '时间片轮转算法实现', group: '实现正确性',
    score: 18, max: 25, verdict: 'partial',
    anchor: 'q-impl', anchorLabel: '第 4 节 · 核心算法实现', chunk: 'chunk_018',
    quote: 'while (!ready_queue.empty()) { PCB p = ready_queue.front(); ready_queue.pop(); p.remaining -= time_slice; if (p.remaining > 0) ready_queue.push(p); }',
    suggestion: '缺少 remaining <= 0 的收尾分支：剩余时间刚好被时间片耗尽时，进程会被错误地重新入队，导致队列永不排空。建议补上 FINISHED 状态判定，并累加一次上下文切换计数。',
  },
  {
    id: 'p3', idx: '03', title: '关键数据结构设计', group: '实现正确性',
    score: 14, max: 15, verdict: 'full',
    anchor: 'q-ds', anchorLabel: '第 3 节 · 数据结构设计', chunk: 'chunk_011',
    quote: '进程控制块采用结构体 PCB 描述，包含 pid、state、remaining、priority 四个字段；就绪队列使用 queue 组织，阻塞队列使用 list 以便随机删除。',
    suggestion: '选型理由清晰。如果后续要扩展多级反馈队列，建议把字段抽成独立的枚举定义，便于维护。',
  },
  {
    id: 'p4', idx: '04', title: '测试用例与结果分析', group: '测试与验证',
    score: 16, max: 20, verdict: 'partial',
    anchor: 'q-test', anchorLabel: '第 5 节 · 测试与结果分析', chunk: 'chunk_026',
    quote: '以 5 个进程、时间片等于 2 的一组数据测试，平均周转时间为 6.8，平均等待时间为 4.2，甘特图如下表所示。',
    suggestion: '只有一组测试数据，无法说明算法在不同时间片下的表现。建议补做时间片 = 1 / 2 / 4 / 8 的对照实验，用表格呈现等待时间随片长变化的趋势。',
  },
  {
    id: 'p5', idx: '05', title: '性能对比与实验结论', group: '测试与验证',
    score: 14, max: 15, verdict: 'partial',
    anchor: 'q-perf', anchorLabel: '第 6 节 · 性能对比', chunk: 'chunk_031',
    quote: '相比先来先服务，轮转调度的平均等待时间缩短约 23%，但上下文切换次数增加了一倍。',
    suggestion: '结论方向正确，但 23% 这个数字没有给出计算过程。建议在正文中列出两种算法的原始数据与换算公式，让结论可复核。',
  },
  {
    id: 'p6', idx: '06', title: '报告格式与引用规范', group: '规范与表达',
    score: 15, max: 15, verdict: 'full',
    anchor: 'q-conclusion', anchorLabel: '第 7 节 · 实验结论', chunk: 'chunk_038',
    quote: '通过本次实验，我理解了调度算法的设计需要在响应时间与切换开销之间做权衡，时间片长度是关键参数。',
    suggestion: '格式规范，图表编号与正文引用一一对应。可以补一条参考文献。',
  },
]

const DIMS = [
  { label: '内容与原理', got: 24, full: 25 },
  { label: '实现正确性', got: 32, full: 40 },
  { label: '测试与验证', got: 16, full: 20 },
  { label: '规范与表达', got: 15, full: 15 },
]

const VERDICT_STYLE: Record<Verdict, { label: string; text: string; bg: string; bar: string }> = {
  full:    { label: '完全达标', text: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200/70', bar: 'bg-emerald-500' },
  partial: { label: '部分达标', text: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200/70',     bar: 'bg-amber-400' },
  missing: { label: '证据缺失', text: 'text-rose-700',    bg: 'bg-rose-50 border-rose-200/70',       bar: 'bg-rose-400' },
}

const CHIPS = [
  '帮我评改这份实验报告',
  '第 2 个评分点为什么扣分？',
  '生成全班成绩汇总表',
  '按评分点生成个性化评语',
]

const STEPS = ['解析报告结构', '切分证据块', '对齐评分细则', '逐项核查证据', '生成评语']

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

type Message = { id: string; role: 'user' | 'assistant'; text?: string; points?: Point[] }

/* ------------------------------------------------------------------ */
/* page                                                               */
/* ------------------------------------------------------------------ */

export default function Page() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)
  const [step, setStep] = useState(0)
  const [activeAnchor, setActiveAnchor] = useState<string | null>(null)
  const [activePoint, setActivePoint] = useState<string | null>(null)

  const chatRef = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, pending])

  useEffect(() => {
    if (!pending) return
    setStep(0)
    const t = setInterval(() => setStep((s) => (s + 1) % STEPS.length), 620)
    return () => clearInterval(t)
  }, [pending])

  const locate = (point: Point) => {
    setActivePoint(point.id)
    const jump = () => {
      setActiveAnchor(point.anchor)
      requestAnimationFrame(() => {
        document.getElementById(point.anchor)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
    }
    if (activeAnchor === point.anchor) {
      setActiveAnchor(null)
      setTimeout(jump, 50)
    } else jump()
  }

  async function send(text: string) {
    const t = text.trim()
    if (!t || pending) return
    setMessages((m) => [...m, { id: `u${Date.now()}`, role: 'user', text: t }])
    setInput('')
    if (taRef.current) taRef.current.style.height = 'auto'
    setPending(true)
    await sleep(2400)
    setPending(false)
    setMessages((m) => [...m, { id: `a${Date.now()}`, role: 'assistant', points: POINTS }])
  }

  const located = POINTS.find((p) => p.id === activePoint) ?? null

  return (
    <div
      className="h-[100dvh] w-full overflow-hidden text-zinc-900 antialiased"
      style={{
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
        .ag-anchor-on{background-color:rgba(253,224,71,.62);box-shadow:0 0 0 4px rgba(253,224,71,.26);animation:ag-flash .75s ease-out}
        @keyframes ag-flash{
          0%{background-color:rgba(253,224,71,0);box-shadow:0 0 0 0 rgba(253,224,71,0)}
          45%{background-color:rgba(253,224,71,.95);box-shadow:0 0 0 8px rgba(253,224,71,.42)}
          100%{background-color:rgba(253,224,71,.62);box-shadow:0 0 0 4px rgba(253,224,71,.26)}
        }
        @keyframes ag-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        .ag-in{animation:ag-in .38s cubic-bezier(.22,1,.36,1) both}
        @keyframes ag-dot{0%,80%,100%{opacity:.25;transform:translateY(0)}40%{opacity:1;transform:translateY(-3px)}}
        .ag-dot{animation:ag-dot 1.2s infinite}
        @keyframes ag-spin{to{transform:rotate(360deg)}}
        .ag-spin{animation:ag-spin .8s linear infinite}
        @media (prefers-reduced-motion:reduce){.ag-anchor-on,.ag-in,.ag-spin{animation:none}}
      `}</style>

      <div className="mx-auto flex h-full max-w-[1800px] flex-col p-3 sm:p-4">
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">

          {/* ================= 左：AI 评阅 ================= */}
          <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-zinc-200/70 bg-white/75 shadow-[0_1px_2px_rgba(9,9,11,.04),0_10px_30px_-18px_rgba(9,9,11,.18)] backdrop-blur-xl">

            <header className="flex h-14 shrink-0 items-center gap-3 border-b border-zinc-200/60 bg-white/70 px-4">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-zinc-900">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-[13px] font-medium tracking-tight">彼此_Autograder</h1>
                <p className="truncate text-[11px] text-zinc-500">智能评阅 · 评分点逐项核查</p>
              </div>
              <span className="ml-auto hidden items-center gap-1 rounded-full border border-emerald-200/70 bg-emerald-50 px-2 py-[3px] text-[10.5px] font-medium text-emerald-700 sm:inline-flex">
                <Target className="h-3 w-3" />
                证据可溯源
              </span>
              <button
                onClick={() => {
                  setMessages([])
                  setActiveAnchor(null)
                  setActivePoint(null)
                }}
                className="grid h-7 w-7 place-items-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                title="清空对话"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </header>

            <div ref={chatRef} className="ag-scroll min-h-0 flex-1 overflow-y-auto">
              {messages.length === 0 && !pending ? (
                <div className="flex h-full flex-col items-center justify-center px-6 py-10 text-center">
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-zinc-900">
                    <Sparkles className="h-7 w-7 text-white" />
                  </div>
                  <h2 className="mt-5 text-[15px] font-medium tracking-tight text-zinc-900">你好，我是彼此_Autograder</h2>
                  <p className="mt-1.5 max-w-[300px] text-[12px] leading-relaxed text-zinc-500">
                    上传实验报告后，把评分细则发给我，我会逐评分点核查，并给出可溯源到原文的证据。
                  </p>
                  <div className="mt-6 grid w-full max-w-[320px] gap-2">
                    {CHIPS.slice(0, 3).map((c) => (
                      <button
                        key={c}
                        onClick={() => send(c)}
                        className="group flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-left text-[12px] text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900"
                      >
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
                        <div className="max-w-[88%] rounded-2xl rounded-br-md bg-zinc-900 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-white shadow-[0_1px_2px_rgba(9,9,11,.08)]">
                          {m.text}
                        </div>
                      </div>
                    ) : (
                      <AssistantMessage
                        key={m.id}
                        points={m.points ?? []}
                        activeAnchor={activeAnchor}
                        activePoint={activePoint}
                        onLocate={locate}
                      />
                    )
                  )}

                  {pending && (
                    <div className="ag-in flex gap-2.5">
                      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-zinc-900">
                        <Sparkles className="h-3.5 w-3.5 text-white" />
                      </div>
                      <div className="flex-1 rounded-xl border border-zinc-200/80 bg-white px-3.5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="ag-spin inline-block h-3.5 w-3.5 rounded-full border-2 border-zinc-200 border-t-zinc-500" />
                          <span className="text-[12px] text-zinc-500">{STEPS[step]}…</span>
                        </div>
                        <div className="mt-2.5 space-y-1.5">
                          {[80, 62, 44].map((w, i) => (
                            <div key={i} className="h-2 animate-pulse rounded-full bg-zinc-100" style={{ width: `${w}%`, animationDelay: `${i * 0.12}s` }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-zinc-200/60 bg-white/70 px-4 pb-3 pt-3">
              <div className="ag-scroll -mx-1 mb-2.5 flex gap-2 overflow-x-auto px-1 pb-0.5">
                {CHIPS.map((c) => (
                  <button
                    key={c}
                    onClick={() => send(c)}
                    className="shrink-0 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[11px] text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900"
                  >
                    {c}
                  </button>
                ))}
              </div>

              <div className="flex items-end gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 transition focus-within:border-zinc-300 focus-within:shadow-[0_0_0_4px_rgba(9,9,11,.045)]">
                <button className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700">
                  <Paperclip className="h-4 w-4" />
                </button>
                <textarea
                  ref={taRef}
                  rows={1}
                  value={input}
                  placeholder="发消息，让我评改这份实验报告…"
                  onChange={(e) => {
                    setInput(e.target.value)
                    e.target.style.height = 'auto'
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 132)}px`
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      send(input)
                    }
                  }}
                  className="ag-scroll max-h-[132px] flex-1 resize-none bg-transparent py-1 text-[12.5px] leading-relaxed text-zinc-900 outline-none placeholder:text-zinc-400"
                />
                <button
                  onClick={() => send(input)}
                  disabled={!input.trim() || pending}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-zinc-900 text-white transition hover:bg-zinc-700 disabled:opacity-25 disabled:hover:bg-zinc-900"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mt-2 text-center text-[10.5px] text-zinc-400">
                AI 评阅结果仅供参考，请教师复核后确认
              </p>
            </div>
          </section>

          {/* ================= 右：实验报告 ================= */}
          <section className="relative flex min-h-0 flex-col overflow-hidden rounded-2xl border border-zinc-200/70 bg-white/75 shadow-[0_1px_2px_rgba(9,9,11,.04),0_10px_30px_-18px_rgba(9,9,11,.18)] backdrop-blur-xl">

            <header className="flex h-14 shrink-0 items-center gap-3 border-b border-zinc-200/60 bg-white/70 px-4">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-zinc-200 bg-white">
                <FileText className="h-4 w-4 text-zinc-500" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium tracking-tight">操作系统实验二 · 进程调度算法实现.docx</p>
                <p className="truncate text-[11px] text-zinc-500">6 页 · 4,180 字 · 已切分为 42 个证据块</p>
              </div>
              <div className="ml-auto flex items-center gap-1">
                <div className="mr-1 hidden items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 md:flex">
                  <Search className="h-3.5 w-3.5 text-zinc-400" />
                  <span className="text-[11.5px] text-zinc-400">搜索原文</span>
                </div>
                <button className="grid h-7 w-7 place-items-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700">
                  <Download className="h-3.5 w-3.5" />
                </button>
                <button className="grid h-7 w-7 place-items-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700">
                  <Layers className="h-3.5 w-3.5" />
                </button>
              </div>
            </header>

            <div className="ag-scroll min-h-0 flex-1 overflow-y-auto bg-zinc-100/50">
              <div className="mx-auto my-5 max-w-[760px] px-4">
                <article className="rounded-xl border border-zinc-200/80 bg-white px-10 py-9 shadow-[0_1px_2px_rgba(9,9,11,.05),0_18px_40px_-28px_rgba(9,9,11,.22)] selection:bg-amber-200">
                  <Report activeAnchor={activeAnchor} />
                </article>
                <p className="py-4 text-center text-[10.5px] text-zinc-400">— 报告结束 —</p>
              </div>
            </div>

            {located && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4">
                <div className="ag-in pointer-events-auto mx-auto flex max-w-[520px] items-center gap-2 rounded-xl border border-amber-300/70 bg-amber-50/95 px-3 py-2 shadow-[0_8px_24px_-14px_rgba(180,83,9,.45)] backdrop-blur">
                  <Highlighter className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                  <span className="truncate text-[11.5px] text-amber-900">
                    已定位到 <span className="font-medium">{located.anchorLabel}</span>
                    <span className="mx-1.5 text-amber-400">·</span>
                    <span className="text-amber-700/80">{located.chunk}</span>
                  </span>
                  <button
                    onClick={() => { setActiveAnchor(null); setActivePoint(null) }}
                    className="ml-auto grid h-5 w-5 shrink-0 place-items-center rounded-md text-amber-600/70 transition hover:bg-amber-100 hover:text-amber-800"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* AI message                                                         */
/* ------------------------------------------------------------------ */

function AssistantMessage({
  points, activeAnchor, activePoint, onLocate,
}: {
  points: Point[]
  activeAnchor: string | null
  activePoint: string | null
  onLocate: (p: Point) => void
}) {
  const total = points.reduce((s, p) => s + p.score, 0)
  const full = points.reduce((s, p) => s + p.max, 0)
  const pct = Math.round((total / full) * 100)

  return (
    <div className="ag-in flex gap-2.5">
      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-zinc-900">
        <Sparkles className="h-3.5 w-3.5 text-white" />
      </div>

      <div className="min-w-0 flex-1 space-y-3">
        <p className="text-[12.5px] leading-relaxed text-zinc-700">
          已按《操作系统实验评分细则》完成评阅，共核查 <span className="font-medium text-zinc-900">6</span> 个评分点，
          引用 <span className="font-medium text-zinc-900">12</span> 处原文证据。点击任意评分点的
          <span className="mx-1 inline-flex items-center gap-0.5 rounded-md border border-amber-300/70 bg-amber-50 px-1.5 py-[1px] text-[11px] text-amber-800">
            <Crosshair className="h-2.5 w-2.5" />定位原文
          </span>
          可在右侧自动跳转并高亮。
        </p>

        {/* summary */}
        <div className="rounded-xl border border-zinc-200/80 bg-gradient-to-b from-zinc-50/90 to-white p-3.5">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10.5px] text-zinc-500">总评分</p>
              <div className="mt-0.5 flex items-baseline gap-1.5">
                <span className="text-[30px] font-semibold leading-none tracking-tight tabular-nums">{total}</span>
                <span className="text-[12.5px] text-zinc-400">/ {full}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="rounded-full border border-sky-200/70 bg-sky-50 px-2.5 py-[3px] text-[11px] font-medium text-sky-700">
                良好 · 前 {100 - pct + 15}%
              </span>
              <p className="mt-1.5 text-[10.5px] text-zinc-400">班级均分 78.4</p>
            </div>
          </div>

          <div className="mt-3.5 space-y-2">
            {DIMS.map((d) => (
              <div key={d.label} className="flex items-center gap-2.5">
                <span className="w-[62px] shrink-0 text-[11px] text-zinc-500">{d.label}</span>
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-zinc-100">
                  <div className="h-full rounded-full bg-zinc-800" style={{ width: `${(d.got / d.full) * 100}%` }} />
                </div>
                <span className="w-[40px] shrink-0 text-right text-[11px] tabular-nums text-zinc-500">
                  {d.got}/{d.full}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* points */}
        <div className="space-y-2.5">
          {points.map((p) => {
            const v = VERDICT_STYLE[p.verdict]
            const on = activePoint === p.id
            return (
              <article
                key={p.id}
                className={`group overflow-hidden rounded-xl border bg-white transition ${
                  on ? 'border-amber-300 shadow-[0_0_0_3px_rgba(251,191,36,.16)]' : 'border-zinc-200/80 hover:border-zinc-300'
                }`}
              >
                <div className="flex items-start gap-2.5 px-3.5 pt-3">
                  <span className="mt-[1px] shrink-0 rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-[2px] text-[10.5px] font-medium tabular-nums text-zinc-500">
                    {p.idx}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[12.5px] font-medium leading-snug tracking-tight text-zinc-900">{p.title}</h3>
                    <p className="mt-0.5 text-[10.5px] text-zinc-400">{p.group} · {p.anchorLabel}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[15px] font-semibold leading-none tabular-nums">
                      {p.score}
                      <span className="text-[11px] font-normal text-zinc-400">/{p.max}</span>
                    </div>
                    <span className={`mt-1.5 inline-flex items-center gap-1 rounded-full border px-1.5 py-[1.5px] text-[10px] font-medium ${v.bg} ${v.text}`}>
                      {p.verdict === 'full' ? <Check className="h-2.5 w-2.5" /> : p.verdict === 'partial' ? <Minus className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
                      {v.label}
                    </span>
                  </div>
                </div>

                <div className="px-3.5 pt-2.5">
                  <div className="h-1 overflow-hidden rounded-full bg-zinc-100">
                    <div className={`h-full rounded-full ${v.bar} transition-[width] duration-700`} style={{ width: `${(p.score / p.max) * 100}%` }} />
                  </div>
                </div>

                <div className="mx-3.5 mt-3 rounded-lg border border-amber-200/60 bg-amber-50/50 px-3 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <Quote className="h-3 w-3 text-amber-600/80" />
                    <span className="text-[10.5px] font-medium text-amber-800/90">原文引用</span>
                    <span className="ml-auto font-mono text-[9.5px] text-amber-700/55">{p.chunk}</span>
                  </div>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-zinc-700">{p.quote}</p>
                </div>

                <div className="mx-3.5 mt-2 rounded-lg border border-zinc-200/70 bg-zinc-50/70 px-3 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <Lightbulb className="h-3 w-3 text-zinc-500" />
                    <span className="text-[10.5px] font-medium text-zinc-600">推荐修改</span>
                  </div>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-zinc-700">{p.suggestion}</p>
                </div>

                <div className="flex items-center gap-1.5 px-3.5 py-3">
                  <button
                    onClick={() => onLocate(p)}
                    className={`inline-flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[11.5px] font-medium transition ${
                      on
                        ? 'bg-amber-400 text-zinc-900 shadow-[0_0_0_3px_rgba(251,191,36,.24)]'
                        : 'border border-amber-300/70 bg-amber-50/60 text-amber-900 hover:bg-amber-100'
                    }`}
                  >
                    <Crosshair className="h-3.5 w-3.5" />
                    {on ? '已定位' : '定位原文'}
                  </button>
                  <button className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 text-[11.5px] text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900">
                    <Check className="h-3.5 w-3.5" />
                    采纳
                  </button>
                  <button className="ml-auto grid h-7 w-7 place-items-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </article>
            )
          })}
        </div>

        {/* summary comment */}
        <div className="rounded-xl border border-zinc-200/80 bg-white px-3.5 py-3">
          <div className="flex items-center gap-1.5">
            <ListChecks className="h-3.5 w-3.5 text-zinc-500" />
            <span className="text-[11px] font-medium text-zinc-600">总评语</span>
          </div>
          <p className="mt-1.5 text-[12px] leading-relaxed text-zinc-700">
            报告结构完整、原理表述清晰，数据结构选型有明确理由，规范性无扣分。
            主要失分集中在实现细节与验证充分性：时间片轮转的收尾分支存在逻辑漏洞，
            且测试仅覆盖单一时间片取值，无法支撑性能结论。建议补全边界处理，
            并补充时间片 1 / 2 / 4 / 8 的对照实验数据。
          </p>
          <div className="mt-3 flex items-center gap-1.5 border-t border-zinc-100 pt-2.5">
            <button className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-zinc-900 px-2.5 text-[11.5px] font-medium text-white transition hover:bg-zinc-700">
              <Download className="h-3.5 w-3.5" />
              导出评语
            </button>
            <button className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 text-[11.5px] text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900">
              <Info className="h-3.5 w-3.5" />
              查看评分依据
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* report                                                             */
/* ------------------------------------------------------------------ */

function Report({ activeAnchor }: { activeAnchor: string | null }) {
  const Hl = ({ id, children }: { id: string; children: ReactNode }) => (
    <span id={id} className={`ag-anchor ${activeAnchor === id ? 'ag-anchor-on' : ''}`}>
      {children}
    </span>
  )

  const H2 = ({ n, children }: { n: string; children: ReactNode }) => (
    <h2 className="mb-2.5 mt-8 flex items-center gap-2 text-[14px] font-semibold tracking-tight text-zinc-900">
      <span className="h-3.5 w-[3px] rounded-full bg-zinc-900" />
      {n}　{children}
    </h2>
  )

  return (
    <div className="text-[12.5px] leading-[1.9] text-zinc-700">
      <header className="mb-8 border-b border-zinc-100 pb-6 text-center">
        <p className="text-[11px] tracking-wide text-zinc-400">深圳大学 · 计算机与软件学院</p>
        <h1 className="mt-2 text-[19px] font-semibold tracking-tight text-zinc-900">操作系统实验二</h1>
        <p className="mt-1 text-[13px] text-zinc-600">进程调度算法实现</p>
        <div className="mt-4 flex items-center justify-center gap-3 text-[11px] text-zinc-400">
          <span>软件工程 2023 级</span>
          <span className="h-2.5 w-px bg-zinc-200" />
          <span>2023150164</span>
          <span className="h-2.5 w-px bg-zinc-200" />
          <span>2026 年 9 月 18 日</span>
        </div>
      </header>

      <H2 n="一">实验目的</H2>
      <p className="indent-8">
        <Hl id="q-purpose">
          本实验旨在通过实现时间片轮转（RR）与优先级调度两种算法，理解进程调度中上下文切换的开销来源，并掌握 PCB 的构造方式与就绪队列的组织形式。
        </Hl>
        在此基础上，对比不同调度策略在响应时间与吞吐量之间的取舍。
      </p>

      <H2 n="二">实验原理</H2>
      <p className="font-medium text-zinc-800">2.1　时间片轮转调度</p>
      <p className="mt-1 indent-8">
        系统将所有就绪进程按先来先服务顺序排成队列，每次调度把处理器分配给队首进程，令其执行一个时间片。
        <Hl id="q-rr">时间片用完后，该进程被剥夺处理器并重新排到队尾，形成轮转。</Hl>
        若进程在时间片内完成，则直接释放。
      </p>
      <p className="mt-3 font-medium text-zinc-800">2.2　优先级调度</p>
      <p className="mt-1 indent-8">
        每个进程附带一个优先级数值，调度器始终选择优先级最高的就绪进程运行。本次采用静态优先级，
        优先级在进程创建时确定，运行期间不变。
      </p>

      <H2 n="三">数据结构设计</H2>
      <p className="indent-8">
        <Hl id="q-ds">
          进程控制块采用结构体 PCB 描述，包含 pid、state、remaining、priority 四个字段；就绪队列使用 queue 组织，阻塞队列使用 list 以便随机删除。
        </Hl>
        两个队列分别对应调度器与等待事件两条通路，互不干扰。
      </p>
      <pre className="mt-3 overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 font-mono text-[11.5px] leading-relaxed text-zinc-700">
{`struct PCB {
    int pid;
    int state;      // READY / RUNNING / FINISHED
    int remaining;  // 剩余需要执行的时间
    int priority;
};

std::queue<PCB> ready_queue;
std::list<PCB>  blocked_queue;`}
      </pre>

      <H2 n="四">核心算法实现</H2>
      <p className="indent-8">轮转调度的主循环如下，通过不断取出队首进程、扣减剩余时间再重新入队来实现轮转：</p>
      <pre className="mt-3 overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 font-mono text-[11.5px] leading-relaxed text-zinc-700">
<Hl id="q-impl">{`while (!ready_queue.empty()) {
    PCB p = ready_queue.front();
    ready_queue.pop();

    p.remaining -= time_slice;
    if (p.remaining > 0) ready_queue.push(p);
}`}</Hl>
      </pre>

      <H2 n="五">测试与结果分析</H2>
      <p className="indent-8">
        <Hl id="q-test">
          以 5 个进程、时间片等于 2 的一组数据测试，平均周转时间为 6.8，平均等待时间为 4.2，甘特图如下表所示。
        </Hl>
      </p>
      <table className="mt-3 w-full border-collapse text-[11.5px]">
        <thead>
          <tr className="border-y border-zinc-200 bg-zinc-50 text-zinc-500">
            <th className="px-3 py-2 text-left font-medium">进程</th>
            <th className="px-3 py-2 text-right font-medium">到达时间</th>
            <th className="px-3 py-2 text-right font-medium">服务时间</th>
            <th className="px-3 py-2 text-right font-medium">完成时间</th>
            <th className="px-3 py-2 text-right font-medium">周转时间</th>
          </tr>
        </thead>
        <tbody className="tabular-nums text-zinc-700">
          {[['P1', 0, 4, 6, 6], ['P2', 1, 3, 10, 9], ['P3', 2, 5, 15, 13], ['P4', 3, 2, 12, 9], ['P5', 4, 6, 20, 16]].map((r) => (
            <tr key={r[0] as string} className="border-b border-zinc-100">
              <td className="px-3 py-2 font-medium text-zinc-800">{r[0]}</td>
              <td className="px-3 py-2 text-right">{r[1]}</td>
              <td className="px-3 py-2 text-right">{r[2]}</td>
              <td className="px-3 py-2 text-right">{r[3]}</td>
              <td className="px-3 py-2 text-right">{r[4]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-zinc-400">
        <ChevronRight className="h-3 w-3" />
        表 1　时间片 = 2 时的调度结果
      </div>

      <H2 n="六">性能对比</H2>
      <p className="indent-8">
        <Hl id="q-perf">
          相比先来先服务，轮转调度的平均等待时间缩短约 23%，但上下文切换次数增加了一倍。
        </Hl>
        这说明轮转调度更适合交互式场景，而对切换开销敏感的批处理场景未必占优。
      </p>

      <H2 n="七">实验结论</H2>
      <p className="indent-8">
        <Hl id="q-conclusion">
          通过本次实验，我理解了调度算法的设计需要在响应时间与切换开销之间做权衡，时间片长度是关键参数。
        </Hl>
        后续可以尝试多级反馈队列，用动态优先级缓解固定时间片带来的公平性问题。
      </p>
    </div>
  )
}
