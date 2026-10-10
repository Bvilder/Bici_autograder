const { chromium } = require('C:/Users/76435/LearnBuddy/2026-09-18-20-41-54/.learnbuddy/tmp/ag-test/node_modules/playwright-core')

;(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto('http://localhost:3001/', { waitUntil: 'networkidle' })

  // 1. 点「我是学生」
  await page.getByText('我是学生', { exact: true }).click()
  await page.getByText('加入班级', { exact: true }).waitFor({ timeout: 10000 })
  console.log('已进入学生端空状态')

  // 2. 加入班级
  await page.getByRole('button', { name: '加入班级' }).click()
  await page.getByPlaceholder('如 CS101').fill('CS101')
  await page.getByRole('button', { name: '确认加入' }).click()
  await page.waitForTimeout(500)

  // 3. 导入长报告
  await page.setInputFiles('input[type=file]', 'C:/Users/76435/Desktop/Bici_autograder/autograder-ai/scripts/_long_report.txt')
  // 等解析完成、出现「AI 预自查」按钮
  await page.getByRole('button', { name: /AI 预自查/ }).waitFor({ timeout: 15000 })
  console.log('报告导入成功')

  // 4. 点预自查（真实 AI，约 20s）
  await page.getByRole('button', { name: /AI 预自查/ }).click()
  await page.getByText('定位原文').first().waitFor({ timeout: 90000 })
  console.log('预自查完成')

  // 5. 检查滚动
  const info = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('.ag-scroll'))
    return els.map((el) => ({ sh: el.scrollHeight, ch: el.clientHeight, scrollable: el.scrollHeight > el.clientHeight }))
  })
  console.log('滚动容器信息:', JSON.stringify(info))

  const scrollable = info.find((i) => i.scrollable)
  if (!scrollable) {
    console.log('RESULT: 无任何可滚动容器 —— 滚动仍有问题')
    await browser.close()
    process.exit(1)
  }

  // 实际滚动测试：找到 scrollable 的 .ag-scroll，往下滚
  const before = await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('.ag-scroll')).find((e) => e.scrollHeight > e.clientHeight)
    const before = el.scrollTop
    el.scrollTop = 600
    return { before, after: el.scrollTop }
  })
  console.log('滚动测试 before/after:', JSON.stringify(before))

  if (before.after > before.before) {
    console.log('RESULT: 滚动正常，问题已解决')
  } else {
    console.log('RESULT: 滚动无效，仍有问题')
  }

  await browser.close()
})().catch((e) => {
  console.error('FAIL:', e && e.message)
  process.exit(1)
})
