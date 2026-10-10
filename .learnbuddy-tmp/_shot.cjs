const { chromium } = require('C:/Users/76435/LearnBuddy/2026-09-18-20-41-54/.learnbuddy/tmp/ag-test/node_modules/playwright-core')

;(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
  const page = await browser.newPage({ viewport: { width: 900, height: 1273 } })
  await page.goto('file:///C:/Users/76435/Desktop/Bici_autograder/autograder-ai/.learnbuddy-tmp/overview.html', { waitUntil: 'networkidle' })
  const dir = 'C:/Users/76435/Desktop/Bici_autograder/autograder-ai/.learnbuddy-tmp/'
  for (let i = 0; i < 3; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), i * 1273)
    await page.waitForTimeout(200)
    await page.screenshot({ path: `${dir}page${i + 1}.png` })
  }
  console.log('SHOT_DONE')
  await browser.close()
})().catch((e) => { console.error('FAIL:', e && e.message); process.exit(1) })
