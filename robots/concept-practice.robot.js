import { test, expect } from '@playwright/test'
import { conceptDecks } from '../src/lib/conceptPractice.js'
import { createPupil, login, readServerProfile } from './lib/app.js'
import { createTeacher, openTab, selectOnlyClass, teacherLogin } from './lib/teacher.js'

test('record unique card flips and report exercise responses in the teacher assignment', async ({ page, browser, request }, testInfo) => {
  const tag = Math.random().toString(36).slice(2, 8)
  const klass = { classId: `concept-${tag}`, className: `Begrepp ${tag}` }
  const pupil = await createPupil(request, { ...klass, operations: ['addition'] })
  const teacher = await createTeacher(request, { classIds: [klass.classId] })
  const teacherContext = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] })
  await page.addInitScript(() => {
    window.__conceptSpeech = []
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: { cancel() {}, speak({ text, lang }) { window.__conceptSpeech.push({ text, lang }) } }
    })
    window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text } }
  })
  try {
    const teacherPage = await teacherContext.newPage()
    await teacherLogin(teacherPage, teacher)
    await selectOnlyClass(teacherPage, klass.className)
    await openTab(teacherPage, 'Uppdrag & tickets')
    await teacherPage.getByLabel('Automatisk uppläsning som standard').check()
    await teacherPage.getByRole('region', { name: 'Begrepp', exact: true })
      .getByRole('button', { name: 'Räknesättens språk', exact: true }).click()
    const row = teacherPage.locator('[data-assignment-row]').filter({ hasText: 'Begrepp · Räknesättens språk' })
    await row.getByRole('button', { name: 'Kopiera länk' }).click()
    const link = new URL(await teacherPage.evaluate(() => navigator.clipboard.readText()))
    await login(page, pupil)
    await page.goto(`${link.pathname}${link.search}`)
    await expect(page.getByRole('heading', { name: 'Räknesättens språk', exact: true })).toBeVisible()
    await expect(page.getByLabel('Läs upp automatiskt')).toBeChecked()
    await page.getByRole('button', { name: 'Begreppskort', exact: true }).tap()
    await expect(page.getByText('Kort 1 av 12 · 0 vända')).toBeVisible()
    await expect.poll(() => page.evaluate(() => window.__conceptSpeech.at(-1))).toEqual({ text: 'Addition', lang: 'sv-SE' })
    await page.getByRole('button', { name: 'Vänd kortet' }).tap()
    await expect(page.getByText('Kort 1 av 12 · 1 vända')).toBeVisible()
    const flip = page.getByRole('button', { name: 'Vänd kortet' })
    await expect(flip).toHaveAttribute('aria-pressed', 'true')
    await expect(flip.locator('.concept-flashcard__sides')).toHaveCSS('transform', 'matrix3d(-1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1)')
    await expect.poll(() => page.evaluate(() => window.__conceptSpeech.at(-1))).toEqual({ text: 'Räknesättet där tal läggs ihop.', lang: 'sv-SE' })
    await page.screenshot({ path: testInfo.outputPath('concept-cards.png') })
    await flip.tap()
    await expect(flip).toHaveAttribute('aria-pressed', 'false')
    await page.getByLabel('Läs upp automatiskt').uncheck()
    await page.reload()
    await expect(page.getByLabel('Läs upp automatiskt')).not.toBeChecked()
    await page.getByRole('button', { name: 'Begreppskort', exact: true }).tap()
    await page.getByRole('button', { name: 'Vänd kortet' }).tap()
    await expect(page.getByText('Kort 1 av 12 · 1 vända')).toBeVisible()
    expect(await page.evaluate(() => window.__conceptSpeech)).toEqual([])
    await page.getByRole('button', { name: 'Lyssna' }).tap()
    expect(await page.evaluate(() => window.__conceptSpeech.at(-1))).toEqual({ text: 'Räknesättet där tal läggs ihop.', lang: 'sv-SE' })
    await page.getByRole('button', { name: 'Öva begreppen', exact: true }).tap()
    for (const [object, field] of [['18 ÷ 3', 'Addition'], ['8 + 3', 'Addition'], ['5 · 2', 'Multiplikation'], ['13 − 6', 'Subtraktion']]) {
      await page.getByRole('button', { name: object, exact: true }).tap()
      await page.getByRole('button', { name: field, exact: true }).tap()
    }
    await page.screenshot({ path: testInfo.outputPath('concept-sort.png') })
    const submit = page.getByRole('button', { name: 'Svara', exact: true })
    await expect(submit).toHaveCSS('min-height', '56px')
    expect(await submit.evaluate(button => Math.abs(button.getBoundingClientRect().right - button.parentElement.getBoundingClientRect().right) < 1)).toBe(true)
    await submit.tap()
    const wrongCard = page.getByRole('button', { name: '18 ÷ 3', exact: true })
    await expect(wrongCard).toHaveCSS('background-color', 'rgb(254, 226, 226)')
    const corrected = page.getByRole('group', { name: 'Division', exact: true }).getByRole('button', { name: '18 ÷ 3', exact: true })
    await expect(corrected).toHaveCSS('background-color', 'rgb(220, 252, 231)')
    await expect(page.getByText('18 ÷ 3 hör till')).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath('concept-sort-correction.png') })
    const serverProfile = () => readServerProfile(request, pupil.studentId)
    await expect.poll(async () => (await serverProfile())?.conceptPractice?.[0]?.answers.operations?.correct).toBe(false)
    const saved = await serverProfile()
    expect(saved.conceptPractice[0].cards).toEqual({ addition: expect.any(Number) })
    expect(saved.problemLog).toHaveLength(0)

    await teacherPage.reload()
    await selectOnlyClass(teacherPage, klass.className)
    await openTab(teacherPage, 'Uppdrag & tickets')
    await row.getByText('Begreppskort och övningssvar (1)').click()
    await expect(row.getByText(/1 av 12 kort vända/)).toBeVisible()
    await expect(row.getByText('0 av 1 rätt · 1 av 5 besvarade')).toBeVisible()
    await expect(row.getByText('18 ÷ 3 placerades under Addition. Facit Division.')).toBeVisible()
    await row.screenshot({ path: testInfo.outputPath('concept-teacher.png') })

    await page.getByRole('button', { name: 'Fortsätt', exact: true }).tap()
    const operations = conceptDecks.operations
    for (const exercise of operations.exercises.slice(1)) {
      for (const object of exercise.objects) {
        const field = operations.cards.find(card => card.id === object.field)
        const label = object.text.replace(/\[([^\]]+)\]/g, '$1 (markerat)')
        await page.getByRole('button', { name: label, exact: true }).tap()
        await page.getByRole('button', { name: field.title, exact: true }).tap()
      }
      await page.getByRole('button', { name: 'Svara', exact: true }).tap()
      await expect(page.getByText('Rätt!', { exact: true })).toBeVisible()
      if (exercise.id === 'terms') await expect(page.getByRole('button', { name: 'Svara', exact: true })).toBeVisible({ timeout: 5000 })
      else await page.getByRole('button', { name: 'Fortsätt', exact: true }).tap()
    }
    await expect(page.getByText('4 av 5 uppgifter rätt på första försöket.')).toBeVisible()
    const activityId = saved.conceptPractice[0].assignmentId
    await expect.poll(async () => Boolean((await serverProfile())?.assignmentProgress?.[`assignment:${activityId}`]?.completedAt)).toBe(true)

    await page.getByRole('link', { name: /Till startsidan/ }).tap()
    await page.getByRole('region', { name: 'Begrepp', exact: true }).getByRole('button', { name: 'Linje, stråle, sträcka och diagonal', exact: true }).tap()
    await page.getByRole('button', { name: 'Begreppskort', exact: true }).tap()
    await page.getByRole('button', { name: 'Vänd kortet' }).tap()
    await expect(page.getByRole('button', { name: 'Vänd kortet' })).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { name: 'Öva begreppen', exact: true }).tap()
    await expect(page.getByRole('group', { name: 'Svarsalternativ' }).getByRole('button').first()).toBeVisible()
  } finally {
    await teacherContext.close()
  }
})
