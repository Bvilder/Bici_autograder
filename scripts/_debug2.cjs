const { chromium } = require('C:/Users/76435/LearnBuddy/2026-09-18-20-41-54/.learnbuddy/tmp/ag-test/node_modules/playwright-core')

;(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  page.on('response', (r) => { if (r.status() >= 400) console.log(`[HTTP ${r.status()}]`, r.url().slice(0, 160)) })
  page.on('pageerror', (e) => console.log('[pageerror]', e.message.slice(0, 200)))

  await page.goto('http://127.0.0.1:3001/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  // 强制刷新一次，避开 HMR 缓存
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)

  await page.locator('button', { hasText: '一键体验学生端' }).first().click()
  await page.waitForTimeout(1200)
  const after = (await page.textContent('body') || '').replace(/\s+/g, ' ')
  console.log('点击后 含「加入班级」:', after.includes('加入班级'), '| 含「退出登录」:', after.includes('退出登录'), '| 含「一键体验」:', after.includes('一键体验'))
  await page.screenshot({ path: 'scripts/_debug2.png' })
  await browser.close()
})().catch((e) => { console.error('FAIL:', e && e.message); process.exit(1) })
