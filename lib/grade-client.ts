import type { GradeResult } from './types'

// 复用 /api/grade（真实混元），读取 SSE 流并返回最终结果
export async function gradeReport(text: string, name: string, timeoutMs = 60000, onStep?: (label: string) => void): Promise<GradeResult | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    const res = await fetch('/api/grade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportText: text, fileName: name }),
      signal: controller.signal,
    })

    let result: GradeResult | null = null
    const ct = res.headers.get('content-type') || ''
    if (ct.includes('text/event-stream') && res.body) {
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const parts = buf.split('\n\n')
        buf = parts.pop() ?? ''
        for (const p of parts) {
          const line = p.trim()
          if (!line.startsWith('data:')) continue
          let ev: { type?: string; label?: string; result?: GradeResult }
          try { ev = JSON.parse(line.slice(5).trim()) } catch { continue }
          if (ev.type === 'step' && ev.label) onStep?.(ev.label)
          else if (ev.type === 'result') result = ev.result ?? null
        }
      }
    } else {
      const data = await res.json()
      if (data.ok) result = data as GradeResult
    }
    clearTimeout(timer)
    return result
  } catch {
    return null
  }
}
