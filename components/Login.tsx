'use client'

import { useEffect, useState } from 'react'
import { Sparkles, User, Lock, Smartphone, Mail, MessageCircle, MessageSquare } from 'lucide-react'

export default function Login({ onLogin }: { onLogin: (name: string) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')
  const [phoneCd, setPhoneCd] = useState(0)
  const [emailCd, setEmailCd] = useState(0)
  const [regName, setRegName] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [verifyMethod, setVerifyMethod] = useState<'phone' | 'email'>('phone')

  useEffect(() => {
    if (phoneCd <= 0) return
    const t = setTimeout(() => setPhoneCd((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [phoneCd])

  useEffect(() => {
    if (emailCd <= 0) return
    const t = setTimeout(() => setEmailCd((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [emailCd])

  function submit() {
    if (account.trim() === '10020260921' && password === '123456') {
      onLogin('江老师')
    } else {
      setMsg('账号或密码错误')
    }
  }

  function oauth(provider: string) {
    setMsg(`「${provider} 登录」为演示占位，暂未接入`)
  }

  function register() {
    setMsg('演示版：注册功能仅作展示，请返回登录')
  }

  function getCode(kind: 'phone' | 'email') {
    if (kind === 'phone') setPhoneCd(60)
    else setEmailCd(60)
    setMsg('验证码已发送（演示）')
  }

  return (
    <div
      className="flex h-[100dvh] w-full items-center justify-center p-4 text-zinc-900 antialiased"
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
      <div className="w-full max-w-[360px] rounded-2xl border border-zinc-200/70 bg-white/85 p-6 shadow-[0_1px_2px_rgba(9,9,11,.04),0_18px_40px_-24px_rgba(9,9,11,.25)] backdrop-blur-xl">
        <div className="mb-6 flex flex-col items-center">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-zinc-900">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <h1 className="mt-3 text-[15px] font-medium tracking-tight">彼此_Autograder</h1>
          <p className="mt-1 text-[11px] text-zinc-500">{mode === 'login' ? '欢迎回来，请登录' : '创建新账号'}</p>
        </div>

        {mode === 'login' ? (
          <>
            <label className="mb-1 block text-[11px] text-zinc-500">账号</label>
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 transition focus-within:border-zinc-400">
              <User className="h-4 w-4 shrink-0 text-zinc-400" />
              <input value={account} onChange={(e) => setAccount(e.target.value)} placeholder="请输入账号" className="min-w-0 flex-1 bg-transparent text-[13px] text-zinc-900 outline-none placeholder:text-zinc-400" />
            </div>

            <label className="mb-1 block text-[11px] text-zinc-500">密码</label>
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 transition focus-within:border-zinc-400">
              <Lock className="h-4 w-4 shrink-0 text-zinc-400" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit() }} placeholder="请输入密码" className="min-w-0 flex-1 bg-transparent text-[13px] text-zinc-900 outline-none placeholder:text-zinc-400" />
            </div>

            <button onClick={submit} className="h-9 w-full rounded-lg bg-zinc-900 text-[13px] font-medium text-white transition hover:bg-zinc-700">登录</button>

            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-zinc-200" />
              <span className="text-[11px] text-zinc-400">或使用以下方式</span>
              <div className="h-px flex-1 bg-zinc-200" />
            </div>

            <div className="flex gap-2">
              <button onClick={() => oauth('QQ')} className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white text-[12px] font-medium transition hover:bg-zinc-50" style={{ color: '#12B7F5' }}>
                <MessageCircle className="h-4 w-4" />QQ 登录
              </button>
              <button onClick={() => oauth('微信')} className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white text-[12px] font-medium transition hover:bg-zinc-50" style={{ color: '#07C160' }}>
                <MessageSquare className="h-4 w-4" />微信 登录
              </button>
            </div>

            <p className="mt-4 text-center text-[11px] text-zinc-500">没有账号？<button onClick={() => { setMode('register'); setMsg('') }} className="font-medium text-zinc-900 hover:underline">去注册</button></p>
          </>
        ) : (
          <>
            <label className="mb-1 block text-[11px] text-zinc-500">账户名</label>
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 transition focus-within:border-zinc-400">
              <User className="h-4 w-4 shrink-0 text-zinc-400" />
              <input value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="请输入账户名" className="min-w-0 flex-1 bg-transparent text-[13px] text-zinc-900 outline-none placeholder:text-zinc-400" />
            </div>

            <label className="mb-1 block text-[11px] text-zinc-500">密码</label>
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 transition focus-within:border-zinc-400">
              <Lock className="h-4 w-4 shrink-0 text-zinc-400" />
              <input type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} placeholder="请设置密码" className="min-w-0 flex-1 bg-transparent text-[13px] text-zinc-900 outline-none placeholder:text-zinc-400" />
            </div>

            <label className="mb-1 block text-[11px] text-zinc-500">验证方式</label>
            <div className="mb-3 flex gap-1 rounded-lg bg-zinc-100 p-1">
              <button
                onClick={() => setVerifyMethod('phone')}
                className={`flex-1 rounded-md py-1.5 text-[12px] font-medium transition ${verifyMethod === 'phone' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
              >
                手机号验证
              </button>
              <button
                onClick={() => setVerifyMethod('email')}
                className={`flex-1 rounded-md py-1.5 text-[12px] font-medium transition ${verifyMethod === 'email' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
              >
                邮箱验证
              </button>
            </div>

            {verifyMethod === 'phone' ? (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 transition focus-within:border-zinc-400">
                <Smartphone className="h-4 w-4 shrink-0 text-zinc-400" />
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="请输入手机号" className="min-w-0 flex-1 bg-transparent text-[13px] text-zinc-900 outline-none placeholder:text-zinc-400" />
                <button onClick={() => getCode('phone')} disabled={phoneCd > 0} className="shrink-0 rounded-md px-2 py-1 text-[11px] font-medium text-zinc-600 transition hover:text-zinc-900 disabled:text-zinc-400">
                  {phoneCd > 0 ? `${phoneCd}s 后重发` : '获取验证码'}
                </button>
              </div>
            ) : (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 transition focus-within:border-zinc-400">
                <Mail className="h-4 w-4 shrink-0 text-zinc-400" />
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="请输入邮箱" className="min-w-0 flex-1 bg-transparent text-[13px] text-zinc-900 outline-none placeholder:text-zinc-400" />
                <button onClick={() => getCode('email')} disabled={emailCd > 0} className="shrink-0 rounded-md px-2 py-1 text-[11px] font-medium text-zinc-600 transition hover:text-zinc-900 disabled:text-zinc-400">
                  {emailCd > 0 ? `${emailCd}s 后重发` : '获取验证码'}
                </button>
              </div>
            )}

            <button onClick={register} className="h-9 w-full rounded-lg bg-zinc-900 text-[13px] font-medium text-white transition hover:bg-zinc-700">注册</button>
            <p className="mt-4 text-center text-[11px] text-zinc-500">已有账号？<button onClick={() => { setMode('login'); setMsg('') }} className="font-medium text-zinc-900 hover:underline">去登录</button></p>
          </>
        )}

        {msg && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-center text-[11px] text-rose-600">{msg}</p>}
        {mode === 'login' && (
          <p className="mt-4 rounded-lg bg-zinc-50 px-3 py-2 text-center text-[11px] text-zinc-400">演示账号 10020260921 · 密码 123456</p>
        )}
      </div>
    </div>
  )
}
