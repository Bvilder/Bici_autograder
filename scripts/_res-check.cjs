const { chromium } = require('C:/Users/76435/LearnBuddy/2026-09-18-20-41-54/.learnbuddy/tmp/ag-test/node_modules/playwright-core')

;(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
  const page = await browser.newPage()
  const failed = []
  page.on('requestfailed', (r) => failed.push(`[reqfail] ${r.url().slice(0, 120)} ${r.failure()?.errorText}`))
  page.on('response', (r) => { if (r.status() >= 400) failed.push(`[HTTP ${r.status()}] ${r.url().slice(0, 120)}`) })

  await page.goto('http://127.0.0.1:3001/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(3000)

  const info = await page.evaluate(() => ({
    hasNext: typeof window.next !== 'undefined',
    scripts: Array.from(document.querySelectorAll('script[src]')).map((s) => s.src.split('/').pop().slice(0, 60)),
    bodyChildren: document.body.children.length,
  }))
  console.log('window.next:', info.hasNext, '| body children:', info.bodyChildren)
  console.log('scripts:', JSON.stringify(info.scripts, null, 0))
  console.log('失败请求:', failed.length ? failed.slice(0, 8).join(' || ') : '(无)')
  await browser.close()
})().catch((e) => { console.error('FAIL:', e && e.message); process.exit(1) })
