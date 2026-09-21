'use client'

import { motion } from 'framer-motion'
import { Users, TrendingUp, ChevronRight, Award } from 'lucide-react'
import type { Student } from '@/lib/types'

const GRADE_COLORS: Record<string, string> = {
  优秀: '#1D9E75',
  良好: '#378ADD',
  中等: '#BA7517',
  及格: '#D85A30',
  不及格: '#E24B4A',
}

export default function ClassDashboard({ students, onOpen }: {
  students: Student[]
  onOpen: (s: Student) => void
}) {
  const avg = Math.round(students.reduce((s, x) => s + x.score, 0) / students.length)
  const max = Math.max(...students.map((s) => s.score))
  const min = Math.min(...students.map((s) => s.score))

  const bands = ['优秀', '良好', '中等', '及格', '不及格']
  const distribution = bands.map((b) => ({
    band: b,
    count: students.filter((s) => s.grade === b).length,
  }))

  return (
    <div className="ag-scroll min-h-0 flex-1 overflow-y-auto p-5">
      <div className="mx-auto max-w-[960px]">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-zinc-900">
            <Users className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-[15px] font-medium tracking-tight text-zinc-900">全班成绩看板</h2>
            <p className="text-[11px] text-zinc-500">操作系统实验二 · 共 {students.length} 人</p>
          </div>
          <div className="ml-auto flex items-center gap-4 text-right">
            <div><p className="text-[10px] text-zinc-400">平均分</p><p className="text-[15px] font-semibold tabular-nums">{avg|| 0}</p></div>
            <div><p className="text-[10px] text-zinc-400">最高</p><p className="text-[15px] font-semibold tabular-nums text-emerald-600">{max|| 0}</p></div>
            <div><p className="text-[10px] text-zinc-400">最低</p><p className="text-[15px] font-semibold tabular-nums text-rose-500">{min|| 0}</p></div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {distribution.map((d, i) => (
            <motion.div
              key={d.band}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-zinc-200/80 bg-white p-3"
            >
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: GRADE_COLORS[d.band] }} />
                <span className="text-[11px] text-zinc-500">{d.band}</span>
              </div>
              <p className="mt-1 text-[20px] font-semibold tabular-nums leading-none">{d.count}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200/80 bg-white">
          <div className="flex items-center gap-1.5 border-b border-zinc-100 px-4 py-2.5">
            <TrendingUp className="h-3.5 w-3.5 text-zinc-500" />
            <span className="text-[11.5px] font-medium text-zinc-700">学生名单</span>
          </div>
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-zinc-100 text-left text-[11px] text-zinc-400">
                <th className="px-4 py-2 font-medium">姓名</th>
                <th className="px-4 py-2 font-medium">总分</th>
                <th className="px-4 py-2 font-medium">等级</th>
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
                  transition={{ delay: i * 0.03 }}
                  onClick={() => onOpen(s)}
                  className="cursor-pointer border-b border-zinc-50 transition last:border-0 hover:bg-zinc-50"
                >
                  <td className="px-4 py-2.5 font-medium text-zinc-800">{s.name}</td>
                  <td className="px-4 py-2.5 tabular-nums font-semibold">{s.score}</td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-[2px] text-[10.5px] font-medium" style={{ background: `${GRADE_COLORS[s.grade]}18`, color: GRADE_COLORS[s.grade] }}>
                      <Award className="h-3 w-3" />
                      {s.grade}
                    </span>
                  </td>
                  <td className="hidden px-4 py-2.5 text-zinc-500 sm:table-cell">{s.weaknesses}</td>
                  <td className="px-4 py-2.5 text-right text-zinc-300"><ChevronRight className="ml-auto h-4 w-4" /></td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
