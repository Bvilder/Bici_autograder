'use client'

import { useRef, useState } from 'react'
import { UploadCloud, FileText, X } from 'lucide-react'

export default function UploadDropzone({ onFile, busy }: { onFile: (file: File) => void; busy: boolean }) {
  const [drag, setDrag] = useState(false)
  const [picked, setPicked] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handle(file: File | undefined | null) {
    if (!file) return
    setPicked(file.name)
    onFile(file)
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files?.[0]) }}
      onClick={() => !busy && inputRef.current?.click()}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
        drag ? 'border-zinc-900 bg-zinc-900/5' : 'border-zinc-300 bg-white hover:border-zinc-400 hover:bg-zinc-50'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".docx,.pdf,.txt,.md"
        className="hidden"
        onChange={(e) => handle(e.target.files?.[0])}
      />
      {picked ? (
        <>
          <FileText className="h-8 w-8 text-zinc-400" />
          <p className="mt-3 max-w-[240px] truncate text-[12.5px] font-medium text-zinc-700">{picked}</p>
          <p className="mt-1 text-[11px] text-zinc-400">正在解析与评阅…</p>
        </>
      ) : (
        <>
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-zinc-900">
            <UploadCloud className="h-6 w-6 text-white" />
          </div>
          <p className="mt-4 text-[13px] font-medium text-zinc-800">拖拽实验报告到这里，或点击选择文件</p>
          <p className="mt-1 text-[11px] text-zinc-400">支持 .docx / .pdf / .txt / .md，单个文件 ≤ 10MB</p>
        </>
      )}
      {picked && (
        <button
          onClick={(e) => { e.stopPropagation(); setPicked(null) }}
          className="mt-3 inline-flex items-center gap-1 rounded-full border border-zinc-200 px-2.5 py-1 text-[11px] text-zinc-500 transition hover:bg-zinc-100"
        >
          <X className="h-3 w-3" />
          重新选择
        </button>
      )}
    </div>
  )
}
