'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { Search, Minus, Plus } from 'lucide-react'
import type { Chunk } from '@/lib/types'

const HEADING_RE = /^(#{1,6}\s+|\d+(\.\d+)*[\s、.．]+|[一二三四五六七八九十]+[、.．]+|第[一二三四五六七八九十\d]+[章节部分][\s:：]+|[\u4e00-\u9fa5]{2,15}[:：]\s*)/
const CODE_RE = /(^|[^\w])(while|for|if|else|int|struct|void|return|std::|#include)\b|[{};]|^\s{2,}/

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded-[2px] bg-yellow-200/80">{text.slice(idx, idx + query.length)}</mark>
      <Highlight text={text.slice(idx + query.length)} query={query} />
    </>
  )
}

function renderBlocks(text: string, query: string): ReactNode[] {
  const out: ReactNode[] = []
  let code: string[] = []
  let para: string[] = []

  const flushCode = () => {
    if (code.length) {
      out.push(<pre key={`c${out.length}`} className="mt-2 overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 font-mono text-[0.92em] leading-relaxed text-zinc-700">{code.join('\n')}</pre>)
      code = []
    }
  }
  const flushPara = () => {
    if (para.length) {
      out.push(<p key={`p${out.length}`} className="mt-2 text-zinc-800"><Highlight text={para.join(' ')} query={query} /></p>)
      para = []
    }
  }

  for (const line of text.split('\n')) {
    const t = line.trim()
    if (!t) { flushCode(); flushPara(); continue }
    if (HEADING_RE.test(t)) {
      flushCode(); flushPara()
      out.push(
        <h4 key={`h${out.length}`} className="mt-6 flex items-center gap-2 text-[1.05em] font-semibold tracking-tight text-zinc-900 first:mt-0">
          <span className="h-3.5 w-[3px] shrink-0 rounded-full bg-zinc-900" />
          {t}
        </h4>,
      )
    } else if (CODE_RE.test(line)) {
      flushPara(); code.push(line)
    } else {
      flushCode(); para.push(t)
    }
  }
  flushCode(); flushPara()
  return out
}

export default function ReportViewer({ chunks, activeAnchor, weakAnchor }: {
  chunks: Chunk[]
  activeAnchor: string | null
  weakAnchor: string | null
}) {
  const [query, setQuery] = useState('')
  const [scale, setScale] = useState(1)

  const filtered = useMemo(
    () => (query ? chunks.filter((c) => c.text.toLowerCase().includes(query.toLowerCase())) : chunks),
    [chunks, query],
  )

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-zinc-200/60 bg-white/80 px-4 py-2 backdrop-blur">
        <div className="flex min-w-0 max-w-xs flex-1 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 transition focus-within:border-zinc-300">
          <Search className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索原文…"
            className="min-w-0 flex-1 bg-transparent text-[11.5px] text-zinc-800 outline-none placeholder:text-zinc-400"
          />
        </div>
        <span className="shrink-0 text-[11px] tabular-nums text-zinc-400">
          {query ? `${filtered.length}/${chunks.length} 块` : `${chunks.length} 个证据块`}
        </span>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <button
            onClick={() => setScale((s) => Math.max(0.85, +(s - 0.1).toFixed(2)))}
            className="grid h-7 w-7 place-items-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="w-9 text-center text-[11px] tabular-nums text-zinc-400">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale((s) => Math.min(1.4, +(s + 0.1).toFixed(2)))}
            className="grid h-7 w-7 place-items-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="ag-scroll min-h-0 flex-1 overflow-y-auto bg-zinc-100/50">
        <div className="mx-auto my-5 max-w-[760px] px-4">
          <article
            className="rounded-xl border border-zinc-200/80 bg-white px-10 py-9 shadow-[0_1px_2px_rgba(9,9,11,.05),0_18px_40px_-28px_rgba(9,9,11,.22)] selection:bg-amber-200"
            style={{ fontSize: `${13 * scale}px`, lineHeight: 1.9 }}
          >
            {filtered.length === 0 ? (
              <p className="py-10 text-center text-[12px] text-zinc-400">没有匹配「{query}」的内容</p>
            ) : (
              filtered.map((c) => (
                <div
                  key={c.id}
                  id={c.id}
                  className={`ag-anchor mb-5 rounded-md px-2 py-1 -mx-2 ${activeAnchor === c.id ? 'ag-anchor-on' : ''} ${weakAnchor === c.id ? 'ag-anchor-weak-on' : ''}`}
                >
                  {renderBlocks(c.text, query)}
                </div>
              ))
            )}
          </article>
          <p className="py-4 text-center text-[10.5px] text-zinc-400">— 报告结束 —</p>
        </div>
      </div>
    </div>
  )
}
