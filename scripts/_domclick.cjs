const { chromium } = require('C:/Users/76435/LearnBuddy/2026-09-18-20-41-54/.learnbuddy/tmp/ag-test/node_modules/playwright-core')

;(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
  const page = await browser.newPage()
  await page.goto('http://127.0.0.1:3001/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(6000)

  const keys = await page.evaluate(() => {
    const btn = document.querySelectorAll('button')[1]
    return { allKeys: Object.keys(btn).filter((k) => k.startsWith('__')).join(','), n: document.querySelectorAll('button').length }
  })
  console.log('button[1] 的 react keys:', JSON.stringify(keys))

  // DOM 原生 click（React 17+ 事件委托在 root 上，应能触发）
  await page.evaluate(() => { const b = document.querySelectorAll('button')[1]; b.click() })
  await page.waitForTimeout(2000)
  const after = (await page.textContent('body') || '').replace(/\s+/g, ' ')
  console.log('DOM click 后 含「加入班级」:', after.includes('加入班级'), '| 含「一键体验」:', after.includes('一键体验'))
  await browser.close()
})().catch((e) => { console.error('FAIL:', e && e.message); process.exit(1) })
