import { readFileSync } from 'node:fs'
const env = {}
for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const i = t.indexOf('=')
  if (i > 0) env[t.slice(0, i).trim()] = t.slice(i + 1).trim()
}
const key = env.HUNYUAN_API_KEY
const url = env.LLM_BASE_URL.replace(/\/+$/, '') + '/chat/completions'
const model = env.LLM_MODEL

const SYSTEM = '直接输出一个 JSON 对象 {"points":[],"comment":"评分完成"}，不要任何多余文字、不要 markdown、不要解释。'

console.log('url', url, '| model', model, '| key', (key || '').slice(0, 6) + '...')
try {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
    body: JSON.stringify({ model, messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: '请评分并输出 JSON。' }], stream: false, temperature: 0.2 }),
  })
  const txt = await res.text()
  console.log('HTTP', res.status)
  console.log('BODY:', txt.slice(0, 1500))
} catch (e) {
  console.log('ERR:', e && e.message)
}
