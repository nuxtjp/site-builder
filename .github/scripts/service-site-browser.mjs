import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'

const base = process.argv[2]
const browser = await chromium.launch({ headless: true })
try {
  for (const width of [390, 900, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    for (const prefix of ['', '/en']) {
      await page.goto(base + prefix + '/', { waitUntil: 'networkidle' })
      await page.locator('.service-site').waitFor()
      assert.equal(await page.locator('h1').textContent(), 'Owned home')
      assert.ok((await page.locator('.site-document').textContent()).includes('The document body comes from the reviewed MDC source.'))
      const color = await page.locator('.service-site').evaluate(element => getComputedStyle(element).color)
      assert.equal(color, 'rgb(24, 37, 54)')
      assert.equal(await page.locator('.site-button').evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(8, 127, 91)')
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false)
      assert.equal(await page.locator('.site-header nav').evaluate(element => getComputedStyle(element).columnGap), '20px')
      if (width <= 1000) {
        const menu = page.getByRole('button', { name: prefix ? 'Menu' : 'メニュー' })
        await menu.click()
        assert.equal(await menu.getAttribute('aria-expanded'), 'true')
        await menu.press('Escape')
        assert.equal(await menu.getAttribute('aria-expanded'), 'false')
      }
      await page.locator('.site-button').click()
      await page.waitForURL(base + prefix + '/docs')
      assert.equal(await page.locator('h1').textContent(), 'Owned docs')
      const alternate = await page.locator('link[rel=alternate][type="text/markdown"]').getAttribute('href')
      const markdown = await page.request.get(base + new URL(alternate).pathname)
      assert.equal(markdown.status(), 200)
      assert.match(markdown.headers()['content-type'], /^text\/markdown\b/)
      assert.ok((await markdown.text()).includes('The document body comes from the reviewed MDC source.'))
    }
    assert.deepEqual(errors, [])
    await page.close()
  }
} finally { await browser.close() }
