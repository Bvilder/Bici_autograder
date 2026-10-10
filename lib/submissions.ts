'use client'

import { useSyncExternalStore } from 'react'
import type { GradeResult } from './types'

export type SubmissionStatus = 'pending' | 'reviewed' | 'returned'

export type Submission = {
  id: string
  studentName: string
  assignmentName: string
  fileName: string
  submitTime: string
  status: SubmissionStatus
  reportText: string
  result: GradeResult | null
  feedback: string
}

const DEMO_REPORT = `操作系统实验二：进程调度算法实现
姓名：学生

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

function now() {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

const MOCK_SUBMISSIONS: Submission[] = [
  { id: 'sub1', studentName: '张子昂', assignmentName: '操作系统实验二', fileName: '张子昂-操作系统实验二.docx', submitTime: '10-08 09:12', status: 'pending', reportText: DEMO_REPORT, result: null, feedback: '' },
  { id: 'sub2', studentName: '刘雨桐', assignmentName: '操作系统实验二', fileName: '刘雨桐-操作系统实验二.docx', submitTime: '10-08 09:35', status: 'pending', reportText: DEMO_REPORT, result: null, feedback: '' },
  { id: 'sub3', studentName: '孙铭泽', assignmentName: '操作系统实验二', fileName: '孙铭泽-操作系统实验二.docx', submitTime: '10-08 10:02', status: 'pending', reportText: DEMO_REPORT, result: null, feedback: '' },
  { id: 'sub4', studentName: '李梦琪', assignmentName: '操作系统实验二', fileName: '李梦琪-操作系统实验二.docx', submitTime: '10-08 10:20', status: 'pending', reportText: DEMO_REPORT, result: null, feedback: '' },
]

const STORAGE_KEY = 'autograder:submissions'

// 从 localStorage 恢复（演示刷新不丢）；服务端无 localStorage 则用 mock
function load(): Submission[] {
  try {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length) return parsed as Submission[]
      }
    }
  } catch { /* ignore */ }
  return MOCK_SUBMISSIONS.map((s) => ({ ...s }))
}

function persist() {
  try {
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(submissions))
  } catch { /* ignore */ }
}

let submissions: Submission[] = load()

const listeners = new Set<() => void>()
function emit() { listeners.forEach((l) => l()) }
function getSubmissions() { return submissions }
function subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn) } }

export function useSubmissions(): Submission[] {
  return useSyncExternalStore(subscribe, getSubmissions)
}

// 学生提交（存在则更新为待批阅，不存在则新增）
export function submitReport(studentName: string, assignmentName: string, fileName: string, reportText: string) {
  const exist = submissions.find((s) => s.studentName === studentName)
  if (exist) {
    submissions = submissions.map((s) =>
      s.id === exist.id
        ? { ...s, assignmentName, fileName, reportText, status: 'pending' as SubmissionStatus, submitTime: now(), result: null, feedback: '' }
        : s,
    )
  } else {
    submissions = [{ id: `sub-${Date.now()}`, studentName, assignmentName, fileName, submitTime: now(), status: 'pending', reportText, result: null, feedback: '' }, ...submissions]
  }
  persist()
  emit()
}

// 教师一键批阅
export function gradeSubmission(id: string, result: GradeResult) {
  submissions = submissions.map((s) => (s.id === id ? { ...s, status: 'reviewed' as SubmissionStatus, result, feedback: '' } : s))
  persist()
  emit()
}

// 教师打回
export function returnSubmission(id: string, feedback: string) {
  submissions = submissions.map((s) => (s.id === id ? { ...s, status: 'returned' as SubmissionStatus, feedback } : s))
  persist()
  emit()
}

// 学生视角：某学生最近一次提交
export function studentSubmissionOf(name: string): Submission | null {
  return submissions.find((s) => s.studentName === name) ?? null
}
