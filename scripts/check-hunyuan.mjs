// 混元 API 连通性自检：验证 key / 模型 / Function Calling 是否可用
// 用法：node scripts/check-hunyuan.mjs
// 依赖 .env.local（复制 .env.example 并填入真实值）
import { readFileSync } from 'node:fs'

function loadEnv(path = '.env.local') {
  const out = {}
  try {
    const txt = readFileSync(path, 'utf8')
    for (const line of txt.split(/\r?\n/)) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const i = t.indexOf('=')
      if (i <= 0) continue
      const k = t.slice(0, i).trim()
      let v = t.slice(i + 1).trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
      out[k] = v
    }
  } catch {}
  return out
}

const env = { ...process.env, ...loadEnv('.env.local') }
const apiKey = env.HUNYUAN_API_KEY || env.OPENAI_API_KEY || env.LLM_API_KEY || ''
const baseURL = env.HUNYUAN_BASE_URL || env.OPENAI_BASE_URL || env.LLM_BASE_URL || 'https://api.hunyuan.cloud.tencent.com/v1'
const model = env.HUNYUAN_MODEL || 'hy4-preview'

if (!apiKey) {
  console.log('X 未找到 HUNYUAN_API_KEY。请先在 .env.local 里填入你的混元 key（可复制 .env.example 改名）。')
  process.exit(1)
}

const url = baseURL.replace(/\/+$/, '') + '/chat/completions'
console.log(`-> 调用 ${url}`)
console.log(`-> 模型 ${model}`)
console.log(`-> key 前 6 位 ${apiKey.slice(0, 6)}****`)

try {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: '你是一个评分助手，按指令调用工具。' },
        { role: 'user', content: '请先获取评分细则。' },
      ],
      tools: [
        { type: 'function', function: { name: 'get_rubric', description: '获取评分细则', parameters: { type: 'object', properties: {} } } },
      ],
      tool_choice: 'auto',
      stream: false,
    }),
  })

  const text = await res.text()
  if (!res.ok) {
    console.log(`\nX 请求失败 HTTP ${res.status}：`)
    console.log(text.slice(0, 1200))
    process.exit(1)
  }

  const data = JSON.parse(text)
  const msg = data.choices?.[0]?.message
  console.log('\nOK 调用成功！')
  if (msg?.tool_calls?.length) {
    console.log('   -> 模型主动发起了工具调用（Function Calling 正常）：' + msg.tool_calls.map((t) => t.function?.name).join(', '))
  } else {
    console.log('   -> 模型返回内容：' + (msg?.content || '').slice(0, 200))
  }
} catch (e) {
  console.log('\nX 网络或解析错误：' + (e?.message || e))
  process.exit(1)
}
