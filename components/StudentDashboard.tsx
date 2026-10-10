'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, LogOut, Plus, BookOpen, ScanSearch, Send, CheckCircle2, X, FileText, Loader2, AlertTriangle, RefreshCw, Copy, Check, Quote,
} from 'lucide-react'
import ReportViewer from './ReportViewer'
import UploadDropzone from './UploadDropzone'
import { gradeReport } from '@/lib/grade-client'
import { useSubmissions, submitReport, studentSubmissionOf } from '@/lib/submissions'
import type { Chunk } from '@/lib/types'

type Severity = 'severe' | 'suggest' | 'optimize'

type Suggestion = {
  pointId: string
  title: string
  severity: Severity
  problem: string
  suggestion: string
  chunkId: string | null
  quote: string
  location: string
}

const SEVERITY_META: Record<Severity, { dot: string; badge: string; label: string }> = {
  severe: { dot: 'bg-rose-500', badge: 'border-rose-200/70 bg-rose-50 text-rose-700', label: '严重' },
  suggest: { dot: 'bg-amber-500', badge: 'border-amber-200/70 bg-amber-50 text-amber-700', label: '建议' },
  optimize: { dot: 'bg-emerald-500', badge: 'border-emerald-200/70 bg-emerald-50 text-emerald-700', label: '优化' },
}

// 把 quote 定位到「第 N 段第 M 句」
function locateEvidence(chunks: Chunk[], chunkId: string | null, quote: string): string {
  if (!chunkId) return ''
  const chunk = chunks.find((c) => c.id === chunkId)
  if (!chunk) return ''
  const sentences = chunk.text.split(/(?<=[。！？!?；;])/).map((s) => s.trim()).filter(Boolean)
  const q = quote.replace(/\s+/g, '')
  if (q) {
    const idx = sentences.findIndex((s) => s.replace(/\s+/g, '').includes(q) || q.includes(s.replace(/\s+/g, '')))
    if (idx >= 0) return `第 ${chunk.index} 段第 ${idx + 1} 句`
  }
  return `第 ${chunk.index} 段`
}

export default function StudentDashboard({ onLogout }: { onLogout: () => void }) {
  const [joined, setJoined] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [invite, setInvite] = useState('')
  const [joinError, setJoinError] = useState('')

  const [reportText, setReportText] = useState('')
  const [fileName, setFileName] = useState('')
  const [parsing, setParsing] = useState(false)
  const [chunks, setChunks] = useState<Chunk[]>([])
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [checking, setChecking] = useState(false)
  const [checked, setChecked] = useState(false)
  const [activeAnchor, setActiveAnchor] = useState<string | null>(null)
  const [showSubmit, setShowSubmit] = useState(false)
  const [adoptedId, setAdoptedId] = useState<string | null>(null)
  const [liveStep, setLiveStep] = useState<string | null>(null)
  const [checkError, setCheckError] = useState('')

  const submissions = useSubmissions()
  const mine = studentSubmissionOf('江水平平仄')

  function confirmJoin() {
    if (invite.trim().toUpperCase() === 'CS101') {
      setJoined(true)
      setShowJoin(false)
      setJoinError('')
      setInvite('')
    } else {
      setJoinError('邀请码不正确，请确认后重试')
    }
  }

  async function parseFile(file: File) {
    if (parsing || checking) return
    setParsing(true)
    setFileName(file.name)
    setChecked(false)
    setSuggestions([])
    setChunks([])
    setActiveAnchor(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/parse', { method: 'POST', body: form })
      const data = await res.json()
      if (data.ok && data.text) setReportText(data.text)
    } catch {
      /* 解析失败静默，保持可重试 */
    } finally {
      setParsing(false)
    }
  }

  async function runCheck() {
    if (!reportText.trim() || checking || parsing) return
    setChecking(true)
    setChecked(false)
    setSuggestions([])
    setActiveAnchor(null)
    setCheckError('')
    setLiveStep('正在连接 AI 评分引擎…')
    const result = await gradeReport(reportText, fileName || '自查报告.docx', 60000, (label) => setLiveStep(label))
    if (result) {
      setChunks(result.chunks)
      const severityOrder: Record<Severity, number> = { severe: 0, suggest: 1, optimize: 2 }
      const list: Suggestion[] = result.points
        .map((p) => {
          const severity: Severity = p.verdict === 'missing' ? 'severe' : p.verdict === 'partial' ? 'suggest' : 'optimize'
          const quote = p.evidence[0]?.quote ?? ''
          const chunkId = p.anchor ?? p.evidence[0]?.chunkId ?? null
          return {
            pointId: p.pointId,
            title: p.title,
            severity,
            problem: p.verdict === 'full' ? '' : (p.missing || p.reason),
            suggestion: p.suggestion,
            chunkId,
            quote,
            location: locateEvidence(result.chunks, chunkId, quote),
          }
        })
        .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
      setSuggestions(list)
      setChecked(true)
    } else {
      setCheckError('AI 响应超时或失败，请稍后重试')
    }
    setLiveStep(null)
    setChecking(false)
  }

  function adopt(s: Suggestion) {
    const text = `【${s.title}】${s.suggestion}`
    navigator.clipboard?.writeText(text).catch(() => {})
    setAdoptedId(s.pointId)
    setTimeout(() => setAdoptedId(null), 1800)
  }

  function confirmSubmit() {
    submitReport('江水平平仄', '操作系统实验二', fileName || '自查报告.docx', reportText)
    setShowSubmit(false)
  }

  function resubmit() {
    setReportText('')
    setFileName('')
    setChunks([])
    setSuggestions([])
    setChecked(false)
    setActiveAnchor(null)
  }

  const locate = (chunkId: string | null) => {
    if (!chunkId) return
    setActiveAnchor(null)
    requestAnimationFrame(() => setActiveAnchor(chunkId))
    document.getElementById(chunkId)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <div
      className="flex h-[100dvh] w-full flex-col overflow-hidden text-zinc-900 antialiased"
      style={{
        fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif",
        backgroundImage: 'linear-gradient(180deg, #ffffff 0%, #fafafa 42%, #f3f3f5 100%)',
      }}
    >
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-zinc-200/70 bg-white/80 px-4 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-zinc-900">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-[13px] font-medium tracking-tight">彼此_Autograder</span>
          <span className="ml-1 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-[2px] text-[10.5px] font-medium text-zinc-500">学生端</span>
        </div>
        <button
          onClick={onLogout}
          className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[11.5px] font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
        >
          <LogOut className="h-3.5 w-3.5" />
          退出登录
        </button>
      </header>

      {!joined ? (
        <div className="flex h-[calc(100dvh-3rem)] flex-col items-center justify-center px-6">
          <div className="grid h-16 w-16 place-items-center rounded-2xl border border-zinc-200 bg-white shadow-[0_18px_40px_-24px_rgba(9,9,11,.3)]">
            <BookOpen className="h-8 w-8 text-zinc-400" />
          </div>
          <h2 className="mt-5 text-[16px] font-medium tracking-tight">加入你的班级</h2>
          <p className="mt-1.5 max-w-[280px] text-center text-[12.5px] leading-relaxed text-zinc-500">输入老师提供的邀请码，即可开始 AI 预自查与作业提交</p>
          <button
            onClick={() => setShowJoin(true)}
            className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-zinc-900 px-5 text-[13px] font-medium text-white shadow-[0_10px_26px_-12px_rgba(9,9,11,.5)] transition hover:bg-zinc-700"
          >
            <Plus className="h-4 w-4" />
            加入班级
          </button>
        </div>
      ) : (
        <main className="flex min-h-0 flex-1 flex-col gap-4 p-4">
          {/* 班级卡片 */}
          <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-zinc-200/80 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(9,9,11,.04)]">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-zinc-900">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-[13.5px] font-medium tracking-tight">操作系统实验二</div>
              <div className="truncate text-[11.5px] text-zinc-500">授课教师：江老师</div>
            </div>
            {mine?.status === 'reviewed' ? (
              <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200/70 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                <CheckCircle2 className="h-3 w-3" />
                已批阅 {mine.result?.totalScore ?? '--'} 分
              </span>
            ) : mine?.status === 'returned' ? (
              <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-300/70 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">
                <AlertTriangle className="h-3 w-3" />
                已打回
              </span>
            ) : mine?.status === 'pending' ? (
              <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-500">
                已提交，待批阅
              </span>
            ) : null}
          </div>

          {/* 打回反馈横幅 */}
          {mine?.status === 'returned' && (
            <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-amber-300/70 bg-amber-50/80 px-4 py-3">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-medium text-amber-800">作业被老师打回，请按整改意见修改后重新提交</div>
                {mine.feedback && <div className="mt-0.5 text-[12px] text-amber-700">{mine.feedback}</div>}
              </div>
              <button onClick={resubmit} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-zinc-900 px-3 text-[11.5px] font-medium text-white transition hover:bg-zinc-700">
                <RefreshCw className="h-3.5 w-3.5" />
                重新修改
              </button>
            </div>
          )}

          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2 lg:grid-rows-[minmax(0,1fr)]">
            {/* 左：报告原文 */}
            <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-zinc-200/70 bg-white/80">
              <header className="flex h-11 shrink-0 items-center gap-2 border-b border-zinc-200/60 px-4">
                <FileText className="h-3.5 w-3.5 text-zinc-400" />
                <span className="text-[12.5px] font-medium">报告原文</span>
                {checked && <span className="ml-auto text-[11px] tabular-nums text-zinc-400">{chunks.length} 个证据块</span>}
              </header>
              {!reportText ? (
                <div className="min-h-0 flex-1 p-4">
                  <UploadDropzone onFile={parseFile} busy={parsing || checking} />
                </div>
              ) : !checked ? (
                <div className="flex min-h-0 flex-1 flex-col p-4">
                  <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                    <FileText className="h-4 w-4 shrink-0 text-zinc-400" />
                    <span className="min-w-0 flex-1 truncate text-[12px] text-zinc-700">{fileName || '已导入报告'}</span>
                    <button onClick={resubmit} className="shrink-0 text-[11px] text-zinc-400 transition hover:text-zinc-700">重新选择</button>
                  </div>

                  {checking ? (
                    <div className="mt-3 flex flex-col items-center justify-center gap-2 rounded-xl border border-zinc-200/70 bg-zinc-50/60 px-4 py-6">
                      <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
                      <p className="text-[12.5px] font-medium text-zinc-700">{liveStep || 'AI 自查中…'}</p>
                      <p className="text-[11px] text-zinc-400">正在调用真实大模型逐点评核，约需 20 秒</p>
                    </div>
                  ) : (
                    <button
                      onClick={runCheck}
                      disabled={checking || parsing}
                      className="mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-zinc-900 text-[13px] font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ScanSearch className="h-4 w-4" />
                      AI 预自查
                    </button>
                  )}

                  {checkError && (
                    <div className="mt-3 flex items-center gap-2 rounded-lg border border-rose-200/70 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      {checkError}
                    </div>
                  )}
                </div>
              ) : (
                <div className="min-h-0 flex-1">
                  <ReportViewer chunks={chunks} activeAnchor={activeAnchor} weakAnchor={null} />
                </div>
              )}
            </section>

            {/* 右：修改建议清单 */}
            <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-zinc-200/70 bg-white/80">
              <header className="flex h-11 shrink-0 items-center gap-2 border-b border-zinc-200/60 px-4">
                <ScanSearch className="h-3.5 w-3.5 text-zinc-400" />
                <span className="text-[12.5px] font-medium">修改建议清单</span>
                {checked && <span className="ml-auto text-[11px] text-zinc-400">{suggestions.length} 条建议</span>}
              </header>

              <div className="ag-scroll min-h-0 flex-1 overflow-y-auto p-4">
                {!checked ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-zinc-100">
                      <ScanSearch className="h-6 w-6 text-zinc-300" />
                    </div>
                    <p className="mt-4 text-[12.5px] text-zinc-400">导入报告并点击「AI 预自查」<br />我会给出可定位到原文的修改建议</p>
                  </div>
                ) : suggestions.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                    <p className="mt-4 text-[13px] font-medium">未发现明显问题</p>
                    <p className="mt-1 text-[12px] text-zinc-400">报告完成度不错，可以提交给老师了</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <AnimatePresence initial={false}>
                      {suggestions.map((s, i) => (
                        <motion.div
                          key={s.pointId}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.35, delay: i * 0.08, ease: 'easeOut' }}
                          className="rounded-xl border border-zinc-200/80 bg-white p-4"
                        >
                          <div className="flex items-start gap-2">
                            <span className="mt-[2px] shrink-0 rounded-md bg-zinc-100 px-1.5 py-[2px] text-[10.5px] font-medium tabular-nums text-zinc-500">{i + 1}</span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <h3 className="text-[12.5px] font-medium leading-snug text-zinc-900">{s.title}</h3>
                                <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-[1px] text-[10px] font-medium ${SEVERITY_META[s.severity].badge}`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${SEVERITY_META[s.severity].dot}`} />
                                  {SEVERITY_META[s.severity].label}
                                </span>
                              </div>
                              {s.problem && <p className="mt-1 text-[11.5px] leading-relaxed text-rose-600/90">{s.problem}</p>}
                              <p className="mt-1.5 text-[12.5px] leading-relaxed text-zinc-700">{s.suggestion}</p>
                            </div>
                          </div>
                          <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-zinc-100 pt-2">
                            <div className="flex min-w-0 items-center gap-2">
                              {s.location && (
                                <span className="inline-flex min-w-0 items-center gap-1 truncate rounded-md bg-zinc-100 px-1.5 py-1 text-[10.5px] text-zinc-500">
                                  <Quote className="h-3 w-3 shrink-0 text-zinc-400" />
                                  评分依据 · {s.location}
                                </span>
                              )}
                              {s.chunkId && (
                                <button
                                  onClick={() => locate(s.chunkId)}
                                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[11px] font-medium text-zinc-600 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
                                >
                                  <ScanSearch className="h-3 w-3" />
                                  定位原文
                                </button>
                              )}
                            </div>
                            <button
                              onClick={() => adopt(s)}
                              className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition ${adoptedId === s.pointId ? 'bg-emerald-500 text-white' : 'bg-zinc-900 text-white hover:bg-zinc-700'}`}
                            >
                              {adoptedId === s.pointId ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                              {adoptedId === s.pointId ? '已复制' : '一键采纳'}
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {checked && mine?.status !== 'pending' && mine?.status !== 'reviewed' && (
                <div className="shrink-0 border-t border-zinc-200/60 p-4">
                  <button
                    onClick={() => setShowSubmit(true)}
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 text-[13px] font-medium text-white transition hover:bg-zinc-700"
                  >
                    <Send className="h-4 w-4" />
                    提交给教师批阅
                  </button>
                </div>
              )}
            </section>
          </div>
        </main>
      )}

      {/* 加入班级弹窗 */}
      <AnimatePresence>
        {showJoin && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 grid place-items-center bg-zinc-900/30 p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.96, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 8 }} className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-[14px] font-medium">加入班级</h3>
                <button onClick={() => setShowJoin(false)} className="grid h-7 w-7 place-items-center rounded-lg text-zinc-400 transition hover:bg-zinc-100"><X className="h-4 w-4" /></button>
              </div>
              <p className="mt-1 text-[12px] text-zinc-500">输入老师提供的邀请码</p>
              <input
                value={invite}
                onChange={(e) => { setInvite(e.target.value); setJoinError('') }}
                onKeyDown={(e) => e.key === 'Enter' && confirmJoin()}
                autoFocus
                placeholder="如 CS101"
                className="mt-4 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-[13px] outline-none transition focus:border-zinc-400"
              />
              {joinError && <p className="mt-2 text-[12px] text-rose-600">{joinError}</p>}
              <button
                onClick={confirmJoin}
                disabled={!invite.trim()}
                className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-xl bg-zinc-900 text-[13px] font-medium text-white transition hover:bg-zinc-700 disabled:opacity-40"
              >
                确认加入
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 提交确认弹窗 */}
      <AnimatePresence>
        {showSubmit && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 grid place-items-center bg-zinc-900/30 p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.96, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 8 }} className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-zinc-900">
                <Send className="h-5 w-5 text-white" />
              </div>
              <h3 className="mt-4 text-[14px] font-medium">提交给教师批阅？</h3>
              <p className="mt-1 text-[12px] leading-relaxed text-zinc-500">提交后老师将在工作台看到你的作业并进行批阅。</p>
              <div className="mt-5 flex gap-2">
                <button onClick={() => setShowSubmit(false)} className="h-10 flex-1 rounded-xl border border-zinc-200 text-[13px] font-medium text-zinc-600 transition hover:bg-zinc-50">再改改</button>
                <button onClick={confirmSubmit} className="h-10 flex-1 rounded-xl bg-zinc-900 text-[13px] font-medium text-white transition hover:bg-zinc-700">
                  确认提交
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
