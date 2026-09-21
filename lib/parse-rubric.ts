import type { SimpleRubricPoint } from './types'

// 从评分标准文档文本里，按规则解析出候选评分点（纯本地，不用大模型）
// 支持格式示例：
//   一、实验目的与原理阐述（10分）
//   要点：实验目的、实验原理
//   标准：表述完整、原理准确
// 也支持「要点：」后换行用 - / 1. 列表写要点
const splitList = (s: string) => s.split(/[、，,;；]/).map((t) => t.trim()).filter(Boolean)

export function parseRubricText(text: string): SimpleRubricPoint[] {
  const points: SimpleRubricPoint[] = []
  let cur: SimpleRubricPoint | null = null

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue

    // 评分点标题：一、xxx（10分） / 1. xxx（10分）
    const hm = line.match(/^([一二三四五六七八九十百\d]+)[、.．\s]+(.+?)[（(](\d+)\s*分?[)）]\s*$/)
    if (hm) {
      cur = { id: '', title: hm[2].trim(), maxScore: parseInt(hm[3], 10) || 10, mustInclude: [], criteria: [] }
      points.push(cur)
      continue
    }

    if (!cur) continue

    const kw = line.match(/^(?:要点|必须包含|要求|考察点)[：:]\s*(.+)$/)
    const cr = line.match(/^(?:标准|满分标准|细则|评分细则)[：:]\s*(.+)$/)

    if (kw) {
      const items = splitList(kw[1])
      if (items.length) cur.mustInclude.push(...items)
    } else if (cr) {
      const items = splitList(cr[1])
      if (items.length) cur.criteria.push(...items)
    } else {
      // 普通要点行：- xxx / 1. xxx / 纯关键词
      const k = line.replace(/^[-•*·]\s*/, '').replace(/^[\d]+[、.．]\s*/, '').replace(/[。；;]$/, '').trim()
      if (k && k.length <= 30 && !cur.mustInclude.includes(k)) cur.mustInclude.push(k)
    }
  }

  return points.filter((p) => p.title)
}
