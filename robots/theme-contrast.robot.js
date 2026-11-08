// Every pupil-facing text must be readable in every theme (Simon 2026-11-07).
// Standard: WCAG 2.1 AA, 4.5:1 for normal text and 3:1 for large text, measured
// against the background the text actually sits on. Gradients count as their
// average colour, and transparency and opacity are composited over the page.
import { test, expect } from '@playwright/test'
import { answerText, createPupil, fillAnswer, login, next, readState, submit, openThemeControls } from './lib/app.js'
import { THEMES } from '../src/lib/theme.js'

async function audit(page, view) {
  return page.evaluate(view => {
    // The browser converts any colour syntax (oklch, color-mix, hex) to RGBA on a canvas.
    const context = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
    const parse = value => {
      if (!value || value === 'none') return null
      context.clearRect(0, 0, 1, 1)
      context.fillStyle = 'rgba(0, 0, 0, 0)'
      context.fillStyle = value
      context.fillRect(0, 0, 1, 1)
      const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data
      return [r, g, b, a / 255]
    }
    const over = (top, base) => { const a = top[3]; return [0, 1, 2].map(i => top[i] * a + base[i] * (1 - a)).concat(1) }
    const luminance = c => { const [r, g, b] = c.slice(0, 3).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
    const ratio = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
    const layer = element => {
      const style = getComputedStyle(element)
      const stops = [...style.backgroundImage.matchAll(/(?:rgba?|oklch|oklab|lab|lch|hsla?|color)\([^()]*\)/gu)].map(m => parse(m[0])).filter(Boolean)
      if (stops.length) {
        // Average in premultiplied space, so transparent stops do not darken the colour.
        const alpha = stops.reduce((sum, c) => sum + c[3], 0)
        if (!alpha) return null
        return [0, 1, 2].map(i => stops.reduce((sum, c) => sum + c[i] * c[3], 0) / alpha).concat(alpha / stops.length)
      }
      return parse(style.backgroundColor)
    }
    const pageBase = parse(getComputedStyle(document.body).getPropertyValue('--bg-mid').trim()) || [255, 255, 255, 1]
    const problems = []
    for (const element of document.body.querySelectorAll('*')) {
      if (!element.getClientRects().length || ['SCRIPT', 'STYLE', 'OPTION'].includes(element.tagName)) continue
      const own = [...element.childNodes].filter(node => node.nodeType === 3).map(node => node.textContent.trim()).join(' ').trim()
      const text = own || (['INPUT', 'SELECT'].includes(element.tagName) ? element.value || element.options?.[element.selectedIndex]?.text : '')
      if (!text) continue
      const style = getComputedStyle(element)
      if (style.visibility === 'hidden' || element.closest('[aria-hidden="true"]')) continue
      // Svara/Nästa keep white text by Simon's decision (2026-11-08).
      if (element.closest('[data-contrast-exempt]')) continue
      const chain = []
      let opacity = 1
      for (let node = element; node && node !== document.documentElement; node = node.parentElement) { chain.unshift(node); opacity *= Number(getComputedStyle(node).opacity) }
      let background = pageBase
      for (const node of chain) { const bg = layer(node); if (bg && bg[3] > 0) background = over(bg, background) }
      const color = parse(style.color)
      const shown = over([color[0], color[1], color[2], color[3] * opacity], background)
      const size = parseFloat(style.fontSize), bold = Number(style.fontWeight) >= 700
      const needed = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5
      const value = ratio(shown, background)
      if (value < needed) problems.push(`${view}: "${text.slice(0, 50)}" ${value.toFixed(2)}:1 (behöver ${needed}:1)`)
    }
    return problems
  }, view)
}

async function answerUntil(page, done, limit = 40) {
  for (let index = 0; index < limit && !(await done()); index += 1) {
    await expect.poll(async () => (await readState(page)).phase).toBe('answering')
    await fillAnswer(page, answerText((await readState(page)).problem))
    await submit(page)
    if (await done()) break
    await next(page)
  }
}

test('Pupil views keep every text readable in every theme', async ({ page, request }, info) => {
  test.setTimeout(240000)
  const pupil = await createPupil(request, { operations: ['addition'] })
  await login(page, pupil)
  const problems = []
  let level = 1
  for (const theme of THEMES) {
    await page.goto(`/student/${pupil.studentId}`)
    await openThemeControls(page)
    await page.getByRole('combobox', { name: 'Välj tema' }).selectOption(theme.id)
    await page.getByText('Se mina framsteg').click()
    await page.waitForTimeout(300)
    problems.push(...await audit(page, `${theme.label} · startsida och Framsteg`))
    await page.screenshot({ path: info.outputPath(`${theme.id}-startsida.png`), fullPage: true })

    // A new level is mastered under each theme to show the congratulation page.
    await page.goto(`/student/${pupil.studentId}/practice?mode=addition&level=${level}`)
    problems.push(...await audit(page, `${theme.label} · träning`))
    const congratulation = page.getByText(/^Du har klarat nivå/u)
    await answerUntil(page, () => congratulation.isVisible())
    problems.push(...await audit(page, `${theme.label} · Grattis efter nivå`))
    await page.screenshot({ path: info.outputPath(`${theme.id}-grattis.png`), fullPage: true })
    await page.goto(`/student/${pupil.studentId}/practice?mode=addition&level=${level}`)
    await expect(page.getByText(`Du har redan klarat nivå ${level}. Här tränar du bara den nivån.`)).toBeVisible()
    problems.push(...await audit(page, `${theme.label} · infotext om klarad nivå`))
    level += 1

    await page.goto(`/student/${pupil.studentId}`)
    const tables = page.locator('section', { hasText: 'Tabellträning' })
    await tables.getByRole('button', { name: '7', exact: true }).click()
    await tables.getByRole('button', { name: 'Kör', exact: true }).click()
    await page.waitForURL(/\/practice/)
    const finished = page.getByRole('button', { name: 'Fortsätt', exact: true })
    await answerUntil(page, () => finished.isVisible(), 30)
    problems.push(...await audit(page, `${theme.label} · tabell klar`))
    await page.screenshot({ path: info.outputPath(`${theme.id}-tabell-klar.png`), fullPage: true })
  }
  await info.attach('kontrastfel', { body: problems.join('\n') || 'Inga', contentType: 'text/plain' })
  expect(problems).toEqual([])
})
