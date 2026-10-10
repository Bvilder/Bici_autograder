// 端到端测试：POST 一份报告到本地 dev 服务，读 SSE 并打印关键字段
const reportText = `操作系统实验二：进程调度算法实现
姓名：测试同学

一、实验目的
本实验旨在通过实现时间片轮转与优先级调度两种算法，理解进程调度中上下文切换的开销来源，并掌握 PCB 的构造方式与就绪队列的组织形式。

二、实验原理
系统将所有就绪进程按先来先服务顺序排成队列，每次调度把处理器分配给队首进程，令其执行一个时间片。时间片用完后，该进程被剥夺处理器并重新排到队尾，形成轮转。

三、数据结构设计
进程控制块采用结构体 PCB 描述，包含 pid、state、remaining、priority 四个字段；就绪队列使用 queue 组织，阻塞队列使用 list 以便随机删除。

四、核心算法实现
while (!ready_queue.empty()) { PCB p = ready_queue.front(); ready_queue.pop(); p.remaining -= time_slice; if (p.remaining > 0) ready_queue.push(p); }

五、测试与结果分析
以 5 个进程、时间片等于 2 的一组数据测试，平均周转时间为 6.8，平均等待时间为 4.2。

六、性能对比
相比先来先服务，轮转调度的平均等待时间缩短约 23%，但上下文切换次数增加了一倍。

七、实验结论
通过本次实验，我理解了调度算法的设计需要在响应时间与切换开销之间做权衡。`

const port = process.argv[2] || '3001'
const url = `http://127.0.0.1:${port}/api/grade`
const t0 = Date.now()
console.log(`POST ${url} ...`)

const res = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ reportText, fileName: '测试报告.docx' }),
})

const reader = res.body.getReader()
const dec = new TextDecoder()
let buf = ''
const steps = []
let final = null
while (true) {
  const { done, value } = await reader.read()
  if (done) break
  buf += dec.decode(value, { stream: true })
  for (const part of buf.split('\n\n')) {
    const line = part.trim()
    if (!line.startsWith('data:')) continue
    let ev
    try { ev = JSON.parse(line.slice(5).trim()) } catch { continue }
    if (ev.type === 'step') steps.push(ev.label)
    if (ev.type === 'result') final = ev
  }
  buf = buf.includes('\n\n') ? buf.slice(buf.lastIndexOf('\n\n') + 2) : buf
}

const ms = Date.now() - t0
console.log(`耗时 ${(ms / 1000).toFixed(1)} 秒`)
console.log('步骤:', steps.join(' → ') || '(无)')
if (!final) { console.log('未收到 result'); process.exit(1) }
const r = final.result
console.log('mode:', r.mode, '| fallback:', final.fallback, '| reason:', final.reason || '-')
console.log('总分:', r.totalScore + '/' + r.maxScore, '| 评级:', r.rating, '| AI率:', r.aiRate)
console.log('总评语:', (r.summary?.comment || '').slice(0, 120))
console.log('第一个评分点:', r.points?.[0]?.title, r.points?.[0]?.score + '/' + r.points?.[0]?.maxScore, '| 证据:', r.points?.[0]?.evidence?.[0]?.chunkId)
