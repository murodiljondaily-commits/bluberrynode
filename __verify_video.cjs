const { chromium } = require('playwright')

async function run() {
  const SCRATCHPAD = process.env.SCRATCHPAD
  const browser = await chromium.launch({ headless: false, slowMo: 300 })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })

  await page.goto('http://localhost:5173/login')
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: `${SCRATCHPAD}/01_login.png` })

  const email = page.locator('input[type="email"]').first()
  const pass  = page.locator('input[type="password"]').first()
  await email.fill('mikeloo@email.com')
  await pass.fill('password123')
  await pass.press('Enter')
  await page.waitForTimeout(3500)
  await page.screenshot({ path: `${SCRATCHPAD}/02_dashboard.png` })

  await page.goto('http://localhost:5173/lesson/english/1')
  await page.waitForTimeout(2000)
  await page.screenshot({ path: `${SCRATCHPAD}/03_lesson_loading.png` })

  // Wait for AI lesson content (up to 40s)
  try { await page.waitForSelector('button', { timeout: 40000 }) } catch {}
  await page.screenshot({ path: `${SCRATCHPAD}/04_lesson_ready.png` })

  // Step through blocks
  for (let i = 0; i < 20; i++) {
    const iframes = await page.locator('iframe').count()
    if (iframes > 0) {
      await page.waitForTimeout(3000)
      await page.screenshot({ path: `${SCRATCHPAD}/VIDEO_BLOCK.png` })
      console.log('VIDEO_BLOCK_REACHED')
      break
    }
    const errText = await page.locator('text=Video mavjud emas').count()
    if (errText > 0) {
      await page.screenshot({ path: `${SCRATCHPAD}/VIDEO_ERROR.png` })
      console.log('VIDEO_ERROR_SHOWN')
      break
    }
    const labels = ['Darsni boshlash', 'Davom etish', 'Tushundim', "Ko'rdim", 'Keyingisi']
    let clicked = false
    for (const lbl of labels) {
      const btn = page.locator(`button`).filter({ hasText: lbl }).first()
      if (await btn.isVisible().catch(() => false)) {
        await btn.click()
        await page.waitForTimeout(1500)
        clicked = true
        break
      }
    }
    if (!clicked) {
      await page.screenshot({ path: `${SCRATCHPAD}/no_button_${i}.png` })
      break
    }
    await page.screenshot({ path: `${SCRATCHPAD}/step_${i}.png` })
  }

  await page.screenshot({ path: `${SCRATCHPAD}/final.png` })
  await browser.close()
  console.log('DONE')
}

run().catch(e => { console.error(e.message); process.exit(1) })
