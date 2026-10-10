const { chromium } = require('C:/Users/76435/LearnBuddy/2026-09-18-20-41-54/.learnbuddy/tmp/ag-test/node_modules/playwright-core')

;(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  page.on('console', (m) => { if (m.type() === 'error') console.log('[console.error]', m.text().slice(0, 300)) })
  page.on('pageerror', (e) => console.log('[pageerror]', e.message.slice(0, 300)))

  await page.goto('http://127.0.0.1:3001/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)

  const btns = await page.locator('button').allTextContents()
  console.log('页面按钮文本:', JSON.stringify(btns.map((s) => s.replace(/\s+/g, ' ').trim())))

  await page.getByText('我是学生', { exact: true }).click()
  await page.waitForTimeout(1500)

  const after = (await page.textContent('body') || '').replace(/\s+/g, ' ')
  console.log('点击后页面含「加入班级」:', after.includes('加入班级'), '| 含「学生端」:', after.includes('学生端'), '| 含「退出登录」:', after.includes('退出登录'))
  await page.screenshot({ path: 'scripts/_debug.png' })
  console.log('已截图 scripts/_debug.png')

  await browser.close()
})().catch((e) => { console.error('FAIL:', e && e.message); process.exit(1) })
