// R3: a computer's numpad always answers (Simon 2026-11-07). Talbild takes 1-9
// directly and 10 as "1" then "0"; ordinary practice accepts digits even when the
// pupil clicked outside the answer field first.
import { test, expect } from '@playwright/test'
import { answerText, createPupil, login, readState } from './lib/app.js'
import { createTeacher, openTab, selectOnlyClass, teacherLogin } from './lib/teacher.js'

const numpad = text => [...text].map(character => ({ ',': 'NumpadDecimal', '.': 'NumpadDecimal', '-': 'NumpadSubtract', '+': 'NumpadAdd' }[character] || `Numpad${character}`))

test('Talbild answers from the numpad, including 10', async ({ browser, request }) => {
  test.setTimeout(120000)
  const tag = Math.random().toString(36).slice(2, 6)
  const klass = { id: `klass-k-${tag}`, name: `Tangent ${tag}` }
  const pupil = await createPupil(request, { name: `Tangent ${tag}`, classId: klass.id, className: klass.name })
  const teacher = await createTeacher(request, { classIds: [klass.id] })
  const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] })
  const staff = await context.newPage()
  await teacherLogin(staff, teacher)
  await selectOnlyClass(staff, klass.name)
  await openTab(staff, 'Uppdrag & tickets')
  await staff.getByRole('button', { name: 'Talbild', exact: true }).click()
  await staff.getByPlaceholder(/Talbild vecka 1/).fill('Tangent Talbild')
  await staff.locator('div.fixed').getByRole('spinbutton').fill('12')
  await staff.getByRole('button', { name: 'Skapa övning', exact: true }).click()
  await staff.waitForTimeout(500)
  await staff.locator('div.rounded.border', { hasText: 'asg_' }).first().getByRole('button', { name: 'Kopiera länk', exact: true }).click()
  const link = new URL(await staff.evaluate(() => navigator.clipboard.readText()))
  await context.close()

  const page = await browser.newPage()
  await page.goto(`${link.pathname}${link.search}`)
  await page.getByPlaceholder(/Gul Fyr Katt/).fill(pupil.loginCode)
  await page.locator('#pilotPin').fill(pupil.pin)
  await page.getByRole('button', { name: 'Logga in', exact: true }).click()
  await page.waitForURL(/\/student\//)
  const progress = () => page.getByText(/^Rätt: \d+ \/ \d+/u).innerText()
  for (let answered = 1; answered <= 6; answered++) {
    await expect(page.getByRole('button', { name: '10', exact: true })).toBeVisible()
    const value = await page.evaluate(() => document.querySelectorAll('div.relative.bg-white.shadow-lg .bg-red-600').length)
    for (const key of numpad(String(value))) await page.keyboard.press(key)
    await expect.poll(progress).toContain(`Rätt: ${answered} / ${answered}`)
    await page.waitForTimeout(400)
  }
})

test('Practice takes numpad digits even after a click outside the answer field', async ({ page, request }) => {
  const pupil = await createPupil(request, { operations: ['addition'] })
  await login(page, pupil)
  await page.goto(`/student/${pupil.studentId}/practice?mode=addition`)
  for (let answered = 0; answered < 3; answered++) {
    await expect.poll(async () => (await readState(page)).phase).toBe('answering')
    await page.mouse.click(5, 300)
    for (const key of numpad(answerText((await readState(page)).problem))) await page.keyboard.press(key)
    await page.keyboard.press('NumpadEnter')
    await expect.poll(async () => (await readState(page)).feedback?.correct).toBe(true)
    await page.keyboard.press('NumpadEnter')
  }
})
