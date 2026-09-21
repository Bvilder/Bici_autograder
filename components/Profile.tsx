'use client'

import { useState } from 'react'
import { Save, User } from 'lucide-react'

export default function Profile({ user, onUpdate }: { user: { name: string; signature: string }; onUpdate: (patch: { name?: string; signature?: string }) => void }) {
  const [name, setName] = useState(user.name)
  const [signature, setSignature] = useState(user.signature)
  const [saved, setSaved] = useState(false)

  function save() {
    onUpdate({ name: name.trim() || '江老师', signature: signature.trim() })
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div className="ag-scroll min-h-0 flex-1 overflow-y-auto p-6">
      <div className="mx-auto w-full max-w-[520px]">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-zinc-900"><User className="h-4 w-4 text-white" /></div>
          <div>
            <h2 className="text-[15px] font-medium tracking-tight text-zinc-900">个人主页</h2>
            <p className="text-[11px] text-zinc-500">管理你的头像、名称与个性签名</p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-zinc-200/80 bg-white p-6">
          <div className="flex flex-col items-center">
            <div className="grid h-20 w-20 place-items-center rounded-full bg-zinc-900 text-[30px] font-medium text-white">{name.trim() ? name.trim()[0] : '江'}</div>
            <p className="mt-3 text-[13px] font-medium text-zinc-900">{name.trim() || '江老师'}</p>
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-[11px] text-zinc-500">名称</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="请输入名称" className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-[13px] text-zinc-900 outline-none transition focus:border-zinc-400" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-zinc-500">个性签名</label>
              <input value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="写点什么介绍一下自己…" className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-[13px] text-zinc-900 outline-none transition focus:border-zinc-400" />
            </div>
          </div>

          <div className="mt-6 flex items-center gap-2">
            <button onClick={save} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-zinc-900 px-5 text-[13px] font-medium text-white transition hover:bg-zinc-700"><Save className="h-4 w-4" />保存</button>
            {saved && <span className="text-[11px] text-emerald-600">已保存</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
