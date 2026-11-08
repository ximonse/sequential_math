// R3: a notice must never move the answer buttons (Simon 2026-11-07). Praise in
// Talpar and Talbild and a failing save in ordinary practice appear while the
// question and the number buttons are shown; the buttons stay where they were.
import { test, expect } from '@playwright/test'
import { answerText, createPupil, fillAnswer, login, next, readState, submit } from './lib/app.js'
import { createTeacher, openTab, selectOnlyClass, teacherLogin } from './lib/teacher.js'

const PRAISE = /Starkt jobbat|Snyggt! Fortsätt så|Du är på gång|Riktigt bra kämpat|Wow, vad snabb|Kämpa på/
const keyTop = (page, label) => page.evaluate(label => {
  const button = [...document.querySelectorAll('button')].find(item => item.textContent.trim() === label && item.getClientRects().length)
  return button ? Math.round(button.getBoundingClientRect().top + window.scrollY) : null
}, label)

async function setupClass(request) {
  const tag = Math.random().toString(36).slice(2, 6)
  const klass = { id: `klass-s-${tag}`, name: `Stabil ${tag}` }
  const pupil = await createPupil(request, { name: `Stabil ${tag}`, classId: klass.id, className: klass.name, operations: ['addition', 'number_bonds'] })
  return { klass, pupil, teacher: await createTeacher(request, { classIds: [klass.id] }) }
}

async function teacherLink(browser, teacher, klass, create) {
  const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] })
  const page = await context.newPage()
  await teacherLogin(page, teacher)
  await selectOnlyClass(page, klass.name)
  await openTab(page, 'Uppdrag & tickets')
  await create(page)
  await page.waitForTimeout(500)
  await page.locator('div.rounded.border', { hasText: 'asg_' }).first().getByRole('button', { name: 'Kopiera länk', exact: true }).click()
  await page.waitForTimeout(300)
  const link = await page.evaluate(() => navigator.clipboard.readText())
  await context.close()
  return link
}

async function openAsPupil(browser, link, pupil) {
  const page = await (await browser.newContext({ viewport: { width: 820, height: 1180 } })).newPage()
  const url = new URL(link)
  await page.goto(`${url.pathname}${url.search}`)
  await page.getByPlaceholder(/Gul Fyr Katt/).fill(pupil.loginCode)
  await page.locator('#pilotPin').fill(pupil.pin)
  await page.getByRole('button', { name: 'Logga in', exact: true }).click()
  await page.waitForURL(/\/student\//)
  return page
}

test('Talbild: praise does not move the number buttons', async ({ browser, request }, info) => {
  test.setTimeout(120000)
  const { klass, pupil, teacher } = await setupClass(request)
  const link = await teacherLink(browser, teacher, klass, async page => {
    await page.getByRole('button', { name: 'Talbild', exact: true }).click()
    await page.getByPlaceholder(/Talbild vecka 1/).fill('Stabil Talbild')
    await page.locator('div.fixed').getByRole('spinbutton').fill('14')
    await page.getByRole('button', { name: 'Skapa övning', exact: true }).click()
  })
  const page = await openAsPupil(browser, link, pupil)
  const tops = new Set()
  let praised = false
  for (let answered = 0; answered < 10; answered++) {
    await expect.poll(() => keyTop(page, '1')).not.toBeNull()
    const value = await page.evaluate(() => [...document.querySelectorAll('div.relative.bg-white.shadow-lg .bg-red-600')].length)
    tops.add(await keyTop(page, '1'))
    await page.getByRole('button', { name: String(value), exact: true }).click()
    await page.waitForTimeout(450)
    if (PRAISE.test(await page.locator('body').innerText())) {
      praised = true
      tops.add(await keyTop(page, '1'))
      await page.screenshot({ path: info.outputPath('talbild-beröm.png'), fullPage: true })
    }
  }
  expect(praised).toBe(true)
  expect([...tops].filter(top => top !== null)).toHaveLength(1)
})

test('Talpar: praise does not move the number buttons', async ({ browser, request }) => {
  test.setTimeout(120000)
  const { klass, pupil, teacher } = await setupClass(request)
  const link = await teacherLink(browser, teacher, klass, async page => {
    await page.getByLabel(/Max antal uppgifter för Talpar/).fill('14')
    await page.getByRole('button', { name: 'Talpar', exact: true }).click()
  })
  const page = await openAsPupil(browser, link, pupil)
  const tops = new Set()
  let praised = false
  for (let answered = 0; answered < 10; answered++) {
    await expect.poll(async () => (await readState(page)).phase).toBe('answering')
    tops.add(await keyTop(page, '1'))
    await fillAnswer(page, answerText((await readState(page)).problem))
    await submit(page)
    if (PRAISE.test(await page.locator('body').innerText())) praised = true
    tops.add(await keyTop(page, '1'))
    await next(page)
  }
  expect(praised).toBe(true)
  expect([...tops].filter(top => top !== null)).toHaveLength(1)
})

test('Practice: a failing save notice does not move the number buttons', async ({ page, request }) => {
  const pupil = await createPupil(request, { operations: ['addition'] })
  await login(page, pupil)
  await page.goto(`/student/${pupil.studentId}/practice?mode=addition`)
  const tops = new Set()
  for (let answered = 0; answered < 8; answered++) {
    if (answered === 2) await page.route('**/api/me/events', route => route.fulfill({ status: 503, json: { error: 'Servern svarar inte' } }))
    await expect.poll(async () => (await readState(page)).phase).toBe('answering')
    tops.add(await keyTop(page, '1'))
    await fillAnswer(page, answerText((await readState(page)).problem))
    await submit(page)
    tops.add(await keyTop(page, '1'))
    await next(page)
    // Mastering level 1 shows its own page; the practice continues after it.
    const proceed = page.getByRole('button', { name: 'Fortsätt', exact: true })
    if (await proceed.isVisible()) await proceed.click()
  }
  await expect(page.getByText('Sparat på enheten')).toBeVisible()
  tops.add(await keyTop(page, '1'))
  expect([...tops].filter(top => top !== null)).toHaveLength(1)
})
