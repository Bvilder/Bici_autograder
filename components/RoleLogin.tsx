'use client'

import { Sparkles, Users, GraduationCap } from 'lucide-react'

export default function RoleLogin({ onSelect }: { onSelect: (role: 'teacher' | 'student') => void }) {
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
      <div className="flex h-full flex-col items-center justify-center px-6">
        <div className="flex items-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-zinc-900 shadow-[0_10px_30px_-12px_rgba(9,9,11,.5)]">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="text-[17px] font-semibold tracking-tight">彼此_Autograder</span>
        </div>

        <h1 className="mt-8 text-[24px] font-medium tracking-tight text-zinc-900">欢迎使用</h1>
        <p className="mt-2 text-[13px] text-zinc-500">可解释的 AI 助教 · 选择一个身份开始体验</p>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <button
            onClick={() => onSelect('teacher')}
            className="group w-[260px] rounded-2xl border border-zinc-200/80 bg-white/80 p-6 text-left shadow-[0_1px_2px_rgba(9,9,11,.04),0_14px_34px_-22px_rgba(9,9,11,.28)] backdrop-blur transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-[0_1px_2px_rgba(9,9,11,.05),0_20px_44px_-22px_rgba(9,9,11,.32)]"
          >
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-zinc-900/95 transition group-hover:scale-105">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div className="mt-4 text-[15px] font-medium tracking-tight">我是教师</div>
            <div className="mt-1 text-[12px] leading-relaxed text-zinc-500">批阅报告 · 成绩看板 · 待批阅管理</div>
          </button>

          <button
            onClick={() => onSelect('student')}
            className="group w-[260px] rounded-2xl border border-zinc-200/80 bg-white/80 p-6 text-left shadow-[0_1px_2px_rgba(9,9,11,.04),0_14px_34px_-22px_rgba(9,9,11,.28)] backdrop-blur transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-[0_1px_2px_rgba(9,9,11,.05),0_20px_44px_-22px_rgba(9,9,11,.32)]"
          >
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-zinc-900/95 transition group-hover:scale-105">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <div className="mt-4 text-[15px] font-medium tracking-tight">我是学生</div>
            <div className="mt-1 text-[12px] leading-relaxed text-zinc-500">AI 预自查 · 提交作业 · 查看反馈</div>
          </button>
        </div>

        <div className="mt-8 flex items-center gap-3 text-[12px] text-zinc-400">
          <button onClick={() => onSelect('teacher')} className="transition hover:text-zinc-700">一键体验教师端</button>
          <span className="text-zinc-300">·</span>
          <button onClick={() => onSelect('student')} className="transition hover:text-zinc-700">一键体验学生端</button>
        </div>
      </div>
    </div>
  )
}
