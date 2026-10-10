const { chromium } = require('C:/Users/76435/LearnBuddy/2026-09-18-20-41-54/.learnbuddy/tmp/ag-test/node_modules/playwright-core')

;(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
  const page = await browser.newPage({ viewport: { width: 900, height: 1273 } })
  await page.goto('file:///C:/Users/76435/Desktop/Bici_autograder/autograder-ai/.learnbuddy-tmp/overview.html', { waitUntil: 'networkidle' })
  await page.pdf({
    path: 'C:/Users/76435/Desktop/Bici_autograder/autograder-ai/彼此_Autograder_项目全景.pdf',
    format: 'A4',
    printBackground: true,
    margin: { top: '0', bottom: '0', left: '0', right: '0' },
  })
  console.log('PDF_DONE')
  await browser.close()
})().catch((e) => { console.error('FAIL:', e && e.message); process.exit(1) })
