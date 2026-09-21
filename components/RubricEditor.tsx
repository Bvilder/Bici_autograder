'use client'

import { useRef, useState } from 'react'
import { Plus, Trash2, Save, UploadCloud, FileText } from 'lucide-react'
import type { SimpleRubricPoint } from '@/lib/types'
import { parseRubricText } from '@/lib/parse-rubric'

type EditPoint = {
  id: string
  title: string
  maxScore: number
  mustIncludeText: string
  criteriaText: string
}

const splitList = (s: string) => s.split(/[,，、]/).map((t) => t.trim()).filter(Boolean)
const joinList = (arr: string[]) => arr.join('、')

function toEdit(p: SimpleRubricPoint): EditPoint {
  return { id: p.id, title: p.title, maxScore: p.maxScore, mustIncludeText: joinList(p.mustInclude), criteriaText: joinList(p.criteria) }
}

export default function RubricEditor({ initial, onSave }: { initial: SimpleRubricPoint[]; onSave: (r: SimpleRubricPoint[]) => void }) {
  const [points, setPoints] = useState<EditPoint[]>(initial.map(toEdit))
  const [parsing, setParsing] = useState(false)
  const [parseMsg, setParseMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const update = (i: number, patch: Partial<EditPoint>) => setPoints((ps) => ps.map((p, idx) => (idx === i ? { ...p, ...patch } : p)))
  const remove = (i: number) => setPoints((ps) => ps.filter((_, idx) => idx !== i))
  const add = () => setPoints((ps) => [...ps, { id: '', title: '', maxScore: 10, mustIncludeText: '', criteriaText: '' }])

  async function handleFile(file: File | undefined | null) {
    if (!file) return
    setParsing(true)
    setParseMsg('')
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/parse', { method: 'POST', body: form })
      const data = await res.json()
      if (!data.ok || !data.text) {
        setParseMsg(data.error || '解析失败，请手动录入')
        return
      }
      const parsed = parseRubricText(data.text)
      if (parsed.length) {
        setPoints(parsed.map(toEdit))
        setParseMsg(`已识别 ${parsed.length} 个评分点，请核对后保存`)
      } else {
        setParseMsg('未能识别出评分点，请按下方格式手动录入')
      }
    } catch {
      setParseMsg('上传失败，请重试')
    } finally {
      setParsing(false)
    }
  }

  function save() {
    const simple: SimpleRubricPoint[] = points
      .filter((p) => p.title.trim())
      .map((p) => ({
        id: p.id || `p${Date.now()}`,
        title: p.title.trim(),
        maxScore: Math.max(1, Math.round(p.maxScore) || 10),
        mustInclude: splitList(p.mustIncludeText),
        criteria: splitList(p.criteriaText),
      }))
    onSave(simple)
  }

  const total = points.reduce((s, p) => s + Math.max(1, Math.round(p.maxScore) || 10), 0)

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
        <div>
          <h2 className="text-[14px] font-medium text-zinc-900">评分细则管理</h2>
          <p className="mt-0.5 text-[11px] text-zinc-500">逐条录入评分点，智能体按此逐项核查</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={parsing}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-[11.5px] font-medium text-zinc-700 transition hover:border-zinc-300 hover:text-zinc-900 disabled:opacity-50"
          >
            <UploadCloud className="h-3.5 w-3.5" />
            {parsing ? '解析中…' : '上传评分标准'}
          </button>
          <span className="rounded-full bg-zinc-100 px-2 py-[2px] text-[11px] tabular-nums text-zinc-600">满分合计 {total}</span>
        </div>
      </div>

      <input ref={fileRef} type="file" accept=".docx,.pdf,.txt,.md" className="hidden" onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = '' }} />

      {parseMsg && (
        <div className="flex items-center gap-1.5 border-b border-emerald-100 bg-emerald-50/60 px-5 py-2 text-[11px] text-emerald-700">
          <FileText className="h-3.5 w-3.5" />
          {parseMsg}
        </div>
      )}

      <div className="ag-scroll min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {points.map((p, i) => (
          <div key={i} className="rounded-xl border border-zinc-200/80 bg-white p-3.5">
            <div className="flex items-center gap-2">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-zinc-100 text-[11px] font-medium tabular-nums text-zinc-500">{i + 1}</span>
              <input value={p.title} onChange={(e) => update(i, { title: e.target.value })} placeholder="评分点名称，如：实验目的与原理阐述" className="min-w-0 flex-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[12.5px] text-zinc-900 outline-none transition focus:border-zinc-400" />
              <button onClick={() => remove(i)} className="grid h-6 w-6 shrink-0 place-items-center rounded-lg text-zinc-400 transition hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
            <div className="mt-2.5 grid grid-cols-[64px_1fr] items-center gap-x-2 gap-y-2">
              <span className="text-[11px] text-zinc-500">满分</span>
              <input type="number" min={1} value={p.maxScore} onChange={(e) => update(i, { maxScore: Number(e.target.value) })} className="w-20 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[12.5px] text-zinc-900 outline-none transition focus:border-zinc-400" />
              <span className="text-[11px] text-zinc-500">评分要点</span>
              <input value={p.mustIncludeText} onChange={(e) => update(i, { mustIncludeText: e.target.value })} placeholder="用逗号分隔，如：实验目的、实验原理" className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[12.5px] text-zinc-900 outline-none transition focus:border-zinc-400" />
              <span className="text-[11px] text-zinc-500">满分标准</span>
              <input value={p.criteriaText} onChange={(e) => update(i, { criteriaText: e.target.value })} placeholder="用逗号分隔，如：表述完整、原理准确" className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[12.5px] text-zinc-900 outline-none transition focus:border-zinc-400" />
            </div>
          </div>
        ))}
        <button onClick={add} className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-300 py-3 text-[12px] text-zinc-500 transition hover:border-zinc-400 hover:text-zinc-900"><Plus className="h-4 w-4" />添加评分点</button>
      </div>

      <div className="flex items-center gap-2 border-t border-zinc-100 px-5 py-3">
        <p className="text-[11px] text-zinc-400">保存后，新上传的报告将按此细则评分</p>
        <button onClick={save} className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg bg-zinc-900 px-4 text-[12px] font-medium text-white transition hover:bg-zinc-700"><Save className="h-3.5 w-3.5" />保存细则</button>
      </div>
    </div>
  )
}
