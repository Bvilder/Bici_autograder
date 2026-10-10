'use client'

import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Users, TrendingUp, ChevronRight, Award, UploadCloud, BookOpen, Gauge, ScanLine, FileText, Plus, X, FlaskConical,
  ClipboardList, Loader2, CheckCircle2, Undo2, Eye, Sparkles,
} from 'lucide-react'
import type { KnowledgeError, Student, WorkbenchData, GradeResult } from '@/lib/types'
import { useSubmissions, gradeSubmission, returnSubmission, type Submission } from '@/lib/submissions'
import { gradeReport } from '@/lib/grade-client'
import { buildChunks } from '@/lib/grading-utils'
import ReportViewer from './ReportViewer'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet'

const RATING_COLOR: Record<string, string> = { 优秀: '#1D9E75', 良好: '#378ADD', 及格: '#D85A30' }

// 根据统计 + 薄弱知识点生成一段「AI 智能总结」
function buildSummary(stats: WorkbenchData['stats'], knowledgeErrors: KnowledgeError[]): string {
  const weak = knowledgeErrors.slice(0, 3).map((k) => `「${k.topic}」`).join('、')
  let s = `本次实验共 ${stats.total} 名同学提交，平均分 ${stats.avg}，及格率 ${stats.passRate}%，最高分 ${stats.max}、最低分 ${stats.min}。`
  s += weak ? `班级错误率最集中的知识点是 ${weak}，建议下节课重点讲解。` : '班级整体掌握情况良好，无明显薄弱点。'
  if (stats.highAiCount > 0) s += `另有 ${stats.highAiCount} 名同学 AI 生成率偏高，建议关注。`
  return s
}

function KpiCard({ label, value, icon, accent }: { label: string; value: string | number; icon: React.ReactNode; accent: string }) {
  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white p-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-zinc-500">{label}</span>
        <span className="grid h-6 w-6 place-items-center rounded-lg" style={{ background: accent + '1a', color: accent }}>{icon}</span>
      </div>
      <p className="mt-1 text-[22px] font-semibold leading-none tabular-nums">{value}</p>
    </div>
  )
}

export default function Workbench({ data, onOpenStudent, onBatchFiles, onOpenResult, batchResults, busy }: {
  data: WorkbenchData | null
  onOpenStudent: (s: Student) => void
  onBatchFiles: (files: File[]) => void
  onOpenResult: (r: GradeResult) => void
  batchResults: GradeResult[]
  busy: boolean
}) {
  const [tab, setTab] = useState<'dashboard' | 'pending'>('dashboard')
  const [experiments, setExperiments] = useState<string[]>(['操作系统实验二'])
  const [activeExp, setActiveExp] = useState('操作系统实验二')
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [drag, setDrag] = useState(false)
  const [gradingId, setGradingId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [viewing, setViewing] = useState<Submission | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const submissions = useSubmissions()
  const pendingCount = submissions.filter((s) => s.status === 'pending').length

  if (!data) {
    return <div className="flex min-h-0 flex-1 items-center justify-center text-[12px] text-zinc-400">正在加载工作台…</div>
  }

  const { stats, students, knowledgeErrors } = data
  const isMain = activeExp === '操作系统实验二'

  function handleFiles(list: FileList | null) {
    if (!list || list.length === 0) return
    onBatchFiles(Array.from(list))
  }

  function confirmAdd() {
    const name = newName.trim()
    if (!name || experiments.includes(name)) { setAdding(false); setNewName(''); return }
    setExperiments((e) => [...e, name])
    setActiveExp(name)
    setAdding(false)
    setNewName('')
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2600)
  }

  async function gradeOne(s: Submission) {
    if (gradingId) return
    setGradingId(s.id)
    const result = await gradeReport(s.reportText, `${s.assignmentName}-${s.studentName}.docx`)
    if (result) {
      gradeSubmission(s.id, result)
      showToast(`已批阅「${s.studentName}」：${result.totalScore} 分`)
    } else {
      showToast(`「${s.studentName}」批阅失败，请稍后重试`)
    }
    setGradingId(null)
  }

  function returnOne(s: Submission) {
    returnSubmission(s.id, '请补充实验原理阐述与边界处理逻辑，并完善测试对照实验')
    showToast('已打回整改通知')
  }

  const statusBadge = (s: Submission) => {
    if (s.status === 'reviewed') {
      return <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/70 bg-emerald-50 px-2 py-[2px] text-[10.5px] font-medium text-emerald-700"><CheckCircle2 className="h-3 w-3" />已批阅 {s.result?.totalScore ?? '--'} 分</span>
    }
    if (s.status === 'returned') {
      return <span className="inline-flex items-center gap-1 rounded-full border border-rose-200/70 bg-rose-50 px-2 py-[2px] text-[10.5px] font-medium text-rose-600">已打回</span>
    }
    return <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/70 bg-amber-50 px-2 py-[2px] text-[10.5px] font-medium text-amber-700">待批阅</span>
  }

  const list = [...submissions.filter((s) => s.status === 'pending'), ...submissions.filter((s) => s.status !== 'pending')]

  return (
    <div className="ag-scroll min-h-0 flex-1 overflow-y-auto p-5">
      <div className="mx-auto max-w-[1080px] space-y-4">
        {/* 标题 */}
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-zinc-900"><Users className="h-4 w-4 text-white" /></div>
          <div>
            <h2 className="text-[15px] font-medium tracking-tight text-zinc-900">教师工作台</h2>
            <p className="text-[11px] text-zinc-500">按实验分区的报告管理 · 全自动评分</p>
          </div>
          <div className="ml-auto">
            <button
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-zinc-900 px-3 text-[11.5px] font-medium text-white transition hover:bg-zinc-700 disabled:opacity-40"
            >
              <UploadCloud className="h-3.5 w-3.5" />
              批量上传报告
            </button>
          </div>
        </div>

        {/* 标签页切换 */}
        <div className="flex w-fit items-center gap-1 rounded-xl border border-zinc-200 bg-white p-1">
          <button
            onClick={() => setTab('dashboard')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11.5px] font-medium transition ${tab === 'dashboard' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900'}`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            班级看板
          </button>
          <button
            onClick={() => setTab('pending')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11.5px] font-medium transition ${tab === 'pending' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900'}`}
          >
            <ClipboardList className="h-3.5 w-3.5" />
            待批阅
            {pendingCount > 0 && (
              <span className={`grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] tabular-nums ${tab === 'pending' ? 'bg-white/20 text-white' : 'bg-zinc-900 text-white'}`}>{pendingCount}</span>
            )}
          </button>
        </div>

        {tab === 'pending' ? (
          /* 待批阅表格 */
          <section className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white">
            <div className="flex items-center gap-1.5 border-b border-zinc-100 px-4 py-2.5">
              <ClipboardList className="h-3.5 w-3.5 text-zinc-500" />
              <span className="text-[11.5px] font-medium text-zinc-700">待批阅作业</span>
              <span className="ml-auto text-[11px] text-zinc-400">{pendingCount} 份待处理</span>
            </div>
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-[11px] text-zinc-400">
                  <th className="px-4 py-2 font-medium">学生姓名</th>
                  <th className="px-4 py-2 font-medium">作业名称</th>
                  <th className="hidden px-4 py-2 font-medium sm:table-cell">提交时间</th>
                  <th className="px-4 py-2 font-medium">状态</th>
                  <th className="px-4 py-2 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {list.map((s, i) => (
                  <motion.tr key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="border-b border-zinc-50 last:border-0">
                    <td className="px-4 py-2.5">
                      <button onClick={() => setViewing(s)} className="font-medium text-zinc-800 underline-offset-2 transition hover:text-zinc-900 hover:underline">
                        {s.studentName}
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-zinc-600">{s.fileName}</td>
                    <td className="hidden px-4 py-2.5 text-zinc-500 sm:table-cell">{s.submitTime}</td>
                    <td className="px-4 py-2.5">{statusBadge(s)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1.5">
                        {s.status === 'pending' ? (
                          <>
                            <button
                              onClick={() => gradeOne(s)}
                              disabled={gradingId !== null}
                              className="inline-flex h-7 items-center gap-1 rounded-lg bg-zinc-900 px-2.5 text-[11px] font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50"
                            >
                              {gradingId === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                              {gradingId === s.id ? '批阅中…' : '一键批阅'}
                            </button>
                            <button
                              onClick={() => returnOne(s)}
                              disabled={gradingId !== null}
                              className="inline-flex h-7 items-center gap-1 rounded-lg border border-zinc-200 px-2.5 text-[11px] font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50"
                            >
                              <Undo2 className="h-3 w-3" />
                              打回重交
                            </button>
                          </>
                        ) : s.status === 'reviewed' ? (
                          <button
                            onClick={() => s.result && onOpenResult(s.result)}
                            className="inline-flex h-7 items-center gap-1 rounded-lg border border-zinc-200 px-2.5 text-[11px] font-medium text-zinc-600 transition hover:bg-zinc-50"
                          >
                            <Eye className="h-3 w-3" />
                            查看
                          </button>
                        ) : (
                          <span className="text-[11px] text-zinc-400">等待学生修改</span>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
                {list.length === 0 && (
                  <tr><td colSpan={5} className="py-10 text-center text-[12px] text-zinc-400">暂无提交作业</td></tr>
                )}
              </tbody>
            </table>
          </section>
        ) : (
          <>
            {/* 实验分区 + 新增实验 */}
            <div className="flex flex-wrap items-center gap-2">
              {experiments.map((exp) => (
                <button
                  key={exp}
                  onClick={() => setActiveExp(exp)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11.5px] font-medium transition ${
                    activeExp === exp ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900'
                  }`}
                >
                  <FlaskConical className="h-3.5 w-3.5" />
                  {exp}
                </button>
              ))}
              {adding ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-2 py-1">
                  <input
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') confirmAdd(); if (e.key === 'Escape') { setAdding(false); setNewName('') } }}
                    placeholder="实验名称"
                    className="w-32 bg-transparent text-[11.5px] text-zinc-800 outline-none placeholder:text-zinc-400"
                  />
                  <button onClick={confirmAdd} className="grid h-5 w-5 place-items-center rounded bg-zinc-900 text-white"><Plus className="h-3 w-3" /></button>
                  <button onClick={() => { setAdding(false); setNewName('') }} className="grid h-5 w-5 place-items-center rounded text-zinc-400 hover:bg-zinc-100"><X className="h-3 w-3" /></button>
                </span>
              ) : (
                <button
                  onClick={() => setAdding(true)}
                  className="inline-flex items-center gap-1 rounded-lg border border-dashed border-zinc-300 px-3 py-1.5 text-[11.5px] text-zinc-500 transition hover:border-zinc-400 hover:text-zinc-900"
                >
                  <Plus className="h-3.5 w-3.5" />
                  新增实验
                </button>
              )}
            </div>

            {!isMain ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white py-16 text-center">
                <FlaskConical className="h-10 w-10 text-zinc-300" />
                <p className="mt-3 text-[13px] font-medium text-zinc-600">「{activeExp}」暂无报告</p>
                <p className="mt-1 text-[11px] text-zinc-400">拖拽该实验的报告到这里，即可开始自动评阅</p>
                <button
                  onClick={() => inputRef.current?.click()}
                  className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-lg bg-zinc-900 px-3 text-[11.5px] font-medium text-white transition hover:bg-zinc-700"
                >
                  <UploadCloud className="h-3.5 w-3.5" />
                  上传报告
                </button>
              </div>
            ) : (
              <>
                {/* 统计概览卡片 */}
                <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
                  <KpiCard label="学生总数" value={stats.total} icon={<Users className="h-3.5 w-3.5" />} accent="#18181b" />
                  <KpiCard label="平均分" value={stats.avg} icon={<Gauge className="h-3.5 w-3.5" />} accent="#378ADD" />
                  <KpiCard label="及格率" value={`${stats.passRate}%`} icon={<TrendingUp className="h-3.5 w-3.5" />} accent="#1D9E75" />
                  <KpiCard label="最高分" value={stats.max} icon={<Award className="h-3.5 w-3.5" />} accent="#1D9E75" />
                  <KpiCard label="最低分" value={stats.min} icon={<ScanLine className="h-3.5 w-3.5" />} accent="#D85A30" />
                  <KpiCard label="AI 率偏高" value={`${stats.highAiCount} 人`} icon={<BookOpen className="h-3.5 w-3.5" />} accent="#BA7517" />
                </div>

                {/* AI 智能总结 */}
                <section className="flex items-start gap-2.5 rounded-xl border border-zinc-200/80 bg-gradient-to-r from-zinc-50 to-white px-4 py-3">
                  <span className="mt-[2px] grid h-5 w-5 shrink-0 place-items-center rounded-md bg-zinc-900">
                    <Sparkles className="h-3 w-3 text-white" />
                  </span>
                  <div className="min-w-0">
                    <span className="text-[10.5px] font-medium text-zinc-400">AI 智能总结</span>
                    <p className="mt-0.5 text-[12.5px] leading-relaxed text-zinc-700">{buildSummary(stats, knowledgeErrors)}</p>
                  </div>
                </section>

                {/* 全班成绩看板 */}
                <section className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white">
                  <div className="flex items-center gap-1.5 border-b border-zinc-100 px-4 py-2.5">
                    <TrendingUp className="h-3.5 w-3.5 text-zinc-500" />
                    <span className="text-[11.5px] font-medium text-zinc-700">全班成绩看板</span>
                  </div>
                  <table className="w-full border-collapse text-[12px]">
                    <thead>
                      <tr className="border-b border-zinc-100 text-left text-[11px] text-zinc-400">
                        <th className="px-4 py-2 font-medium">姓名</th>
                        <th className="px-4 py-2 font-medium">评级</th>
                        <th className="px-4 py-2 font-medium">总分</th>
                        <th className="hidden px-4 py-2 font-medium sm:table-cell">主要扣分点</th>
                        <th className="px-4 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s, i) => (
                        <motion.tr
                          key={s.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.02 }}
                          onClick={() => onOpenStudent(s)}
                          className="cursor-pointer border-b border-zinc-50 transition last:border-0 hover:bg-zinc-50"
                        >
                          <td className="px-4 py-2.5 font-medium text-zinc-800">{s.name}</td>
                          <td className="px-4 py-2.5">
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-[2px] text-[10.5px] font-medium" style={{ background: (RATING_COLOR[s.rating] || '#888') + '1a', color: RATING_COLOR[s.rating] }}>
                              <Award className="h-3 w-3" />{s.rating}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 tabular-nums font-semibold">{s.score}</td>
                          <td className="hidden px-4 py-2.5 text-zinc-500 sm:table-cell">{s.weaknesses}</td>
                          <td className="px-4 py-2.5 text-right text-zinc-300"><ChevronRight className="ml-auto h-4 w-4" /></td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </section>

                {/* 薄弱知识点 TOP 榜 */}
                <section className="rounded-xl border border-zinc-200/80 bg-white p-4">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-zinc-500" />
                    <span className="text-[12px] font-medium text-zinc-700">班级错误率集中的知识点</span>
                  </div>
                  <div className="mt-3 space-y-2.5">
                    {knowledgeErrors.map((k, i) => (
                      <div key={k.topic} className="flex items-center gap-3">
                        <span className="w-4 shrink-0 text-right text-[11px] font-medium tabular-nums text-zinc-400">{i + 1}</span>
                        <span className="w-36 shrink-0 truncate text-[11.5px] text-zinc-700">{k.topic}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: k.errorRate >= 60 ? '#D85A30' : k.errorRate >= 40 ? '#BA7517' : '#1D9E75' }}
                            initial={{ width: 0 }}
                            animate={{ width: `${k.errorRate}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                          />
                        </div>
                        <span className="w-10 shrink-0 text-right text-[11px] font-medium tabular-nums text-zinc-500">{k.errorRate}%</span>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}

            {/* 批量上传 */}
            <section
              onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files) }}
              onClick={() => !busy && inputRef.current?.click()}
              className={`cursor-pointer rounded-2xl border-2 border-dashed px-6 py-8 text-center transition ${drag ? 'border-zinc-900 bg-zinc-900/5' : 'border-zinc-300 bg-white hover:border-zinc-400 hover:bg-zinc-50'}`}
            >
              <input ref={inputRef} type="file" multiple accept=".docx,.pdf,.txt,.md" className="hidden" onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }} />
              <UploadCloud className="mx-auto h-7 w-7 text-zinc-400" />
              <p className="mt-2 text-[12.5px] font-medium text-zinc-700">拖入多份报告批量评阅，或点击选择</p>
              <p className="mt-1 text-[11px] text-zinc-400">支持 .docx / .pdf / .txt / .md，一次可多选</p>
            </section>

            {/* 最近批量批阅结果 */}
            {batchResults.length > 0 && (
              <section className="rounded-xl border border-zinc-200/80 bg-white p-4">
                <div className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-zinc-500" />
                  <span className="text-[12px] font-medium text-zinc-700">最近批量批阅 · {batchResults.length} 份</span>
                </div>
                <div className="mt-2 space-y-1.5">
                  {batchResults.map((r, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg border border-zinc-100 px-3 py-2 transition hover:bg-zinc-50">
                      <span className="w-4 text-right text-[11px] tabular-nums text-zinc-400">{i + 1}</span>
                      <FileText className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                      <span className="min-w-0 flex-1 truncate text-[11.5px] text-zinc-700">{r.fileName ?? '未命名'}</span>
                      <span className="text-[11.5px] font-semibold tabular-nums">{r.totalScore}<span className="text-zinc-400">/{r.maxScore}</span></span>
                      <span className="text-[10.5px] tabular-nums text-zinc-500">AI {r.aiRate ?? '--'}%</span>
                      <button onClick={() => onOpenResult(r)} className="rounded-lg border border-zinc-200 px-2 py-1 text-[10.5px] text-zinc-600 transition hover:bg-zinc-100">查看</button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed left-1/2 top-5 z-50 -translate-x-1/2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-[12.5px] font-medium text-zinc-800 shadow-lg">
          {toast}
        </div>
      )}

      {/* 查看学生报告详情 */}
      <Sheet open={!!viewing} onOpenChange={(o) => { if (!o) setViewing(null) }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{viewing ? `${viewing.studentName} · ${viewing.assignmentName}` : ''}</SheetTitle>
            <SheetDescription>
              {viewing?.fileName} · 提交于 {viewing?.submitTime}
              {viewing?.status === 'reviewed' && viewing.result ? ` · 已批阅 ${viewing.result.totalScore} 分` : ''}
              {viewing?.status === 'returned' ? ' · 已打回' : ''}
              {viewing?.status === 'pending' ? ' · 待批阅' : ''}
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-hidden">
            {viewing && <ReportViewer chunks={buildChunks(viewing.reportText)} activeAnchor={null} weakAnchor={null} />}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
