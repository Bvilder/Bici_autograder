const { chromium } = require('C:/Users/76435/LearnBuddy/2026-09-18-20-41-54/.learnbuddy/tmp/ag-test/node_modules/playwright-core')

;(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
  const page = await browser.newPage()
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text().slice(0, 200)}`) })
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message.slice(0, 300)}`))

  await page.goto('http://127.0.0.1:3001/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(3000)

  const info = await page.evaluate(() => {
    const btn = document.querySelectorAll('button')[1]
    if (!btn) return { err: 'no button' }
    const keys = Object.keys(btn)
    const reactFiber = keys.find((k) => k.startsWith('__reactFiber'))
    const reactProps = keys.find((k) => k.startsWith('__reactProps'))
    const hasOnClick = reactProps ? typeof btn[reactProps].onClick === 'function' : false
    return {
      reactFiber: !!reactFiber,
      reactProps: !!reactProps,
      hasOnClick,
      text: (btn.textContent || '').slice(0, 20),
    }
  })
  console.log('React 挂载情况:', JSON.stringify(info))
  console.log('页面 console/warning:', errors.length ? errors.slice(0, 5).join(' || ') : '(无)')
  await browser.close()
})().catch((e) => { console.error('FAIL:', e && e.message); process.exit(1) })
