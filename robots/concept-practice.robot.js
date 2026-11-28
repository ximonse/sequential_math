import { test, expect } from '@playwright/test'
import { conceptDecks } from '../src/lib/conceptPractice.js'
import { createPupil, login, readServerProfile } from './lib/app.js'
import { createTeacher, openTab, selectOnlyClass, teacherLogin } from './lib/teacher.js'

async function touchHold(page, locator, duringHold) {
  await locator.scrollIntoViewIfNeeded()
  const { x, y, width, height } = await locator.boundingBox()
  const cdp = await page.context().newCDPSession(page)
  try {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x + width / 2, y: y + height / 2 }] })
    await duringHold()
  } finally {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await cdp.detach()
  }
}

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
      value: { cancel() {}, speak({ text, lang }) { if (text.trim()) window.__conceptSpeech.push({ text, lang }) } }
    })
    window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text } }
  })
  let releaseSync
  let heldOpens = 0
  const holdSync = new Promise(resolve => { releaseSync = resolve })
  await page.route('**/api/me/events', async route => {
    if (route.request().postDataJSON()?.entries?.some(entry => entry.type === 'concept_activity' && entry.payload.kind === 'open_cards')) {
      heldOpens++
      await holdSync
    }
    await route.continue()
  })
  try {
    const teacherPage = await teacherContext.newPage()
    await teacherLogin(teacherPage, teacher)
    await selectOnlyClass(teacherPage, klass.className)
    await openTab(teacherPage, 'Uppdrag & tickets')
    const conceptCreator = teacherPage.getByRole('region', { name: 'Begrepp', exact: true })
    const createConcept = conceptCreator.getByRole('button', { name: 'Skapa uppdrag: Räknesättens språk' })
    await expect(createConcept).toBeInViewport()
    await teacherPage.screenshot({ path: testInfo.outputPath('concept-dispatch-entry.png') })
    await expect(conceptCreator.getByLabel('Uppläsning')).toHaveValue('manual')
    await conceptCreator.getByLabel('Uppläsning').selectOption('automatic')
    await createConcept.click()
    const row = teacherPage.locator('[data-assignment-row]').filter({ hasText: 'Begrepp · Räknesättens språk' })
    await expect(row).toBeFocused()
    await expect(row.getByRole('button', { name: 'Aktivera', exact: true })).toBeInViewport()
    await row.getByRole('button', { name: 'Aktivera', exact: true }).click()
    await expect(row.getByText('Aktiv i ' + klass.className, { exact: true })).toBeVisible()
    await row.getByRole('button', { name: 'Kopiera länk' }).click()
    const link = new URL(await teacherPage.evaluate(() => navigator.clipboard.readText()))
    await login(page, pupil)
    await expect(page.getByRole('region', { name: 'Mina uppdrag' })).toContainText('Begrepp · Räknesättens språk')
    await page.goto(`${link.pathname}${link.search}`)
    await expect(page.getByRole('heading', { name: 'Räknesättens språk', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Stäng av automatisk uppläsning' })).toBeVisible()
    await expect(page.getByText('Kort 1 av 12 · 0 vända')).toBeVisible()
    await expect(page.getByText('Tryck för att vända', { exact: true })).toBeVisible()
    await expect(page.getByText(/Här övar du på begreppen/)).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath('concept-front.png') })
    await expect.poll(() => heldOpens).toBeGreaterThan(0)
    await expect.poll(() => page.evaluate(() => window.__conceptSpeech.at(-1))).toEqual({ text: 'Addition', lang: 'sv-SE' })
    await page.getByRole('button', { name: 'Vänd kortet' }).tap()
    await expect(page.getByText('Kort 1 av 12 · 1 vända')).toBeVisible()
    const flip = page.getByRole('button', { name: 'Vänd kortet' })
    await expect(flip).toHaveAttribute('aria-pressed', 'true')
    await expect(flip.locator('.concept-flashcard__sides')).toHaveCSS('transition-duration', '0.5s')
    await expect(flip.locator('.concept-flashcard__sides')).toHaveCSS('transform', 'matrix3d(-1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1)')
    await expect.poll(() => page.evaluate(() => window.__conceptSpeech.at(-1))).toEqual({ text: 'Räknesättet där tal läggs ihop.', lang: 'sv-SE' })
    await page.screenshot({ path: testInfo.outputPath('concept-cards.png') })
    await page.getByRole('button', { name: 'Nästa kort', exact: true }).tap()
    await expect(page.getByText('Kort 2 av 12 · 1 vända')).toBeVisible()
    await expect(flip).toHaveAttribute('aria-pressed', 'false')
    await page.getByRole('button', { name: 'Föregående', exact: true }).tap()
    await expect(page.getByText('Kort 1 av 12 · 1 vända')).toBeVisible()
    releaseSync()
    await expect.poll(async () => (await readServerProfile(request, pupil.studentId))?.conceptPractice?.[0]?.cards?.addition).toEqual(expect.any(Number))
    await page.getByRole('button', { name: 'Stäng av automatisk uppläsning' }).tap()
    await page.reload()
    await expect(page.getByRole('button', { name: 'Slå på automatisk uppläsning' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Vänd kortet' })).toHaveAttribute('aria-pressed', 'false')
    await page.getByRole('button', { name: 'Vänd kortet' }).press('Enter')
    await expect(page.getByText('Kort 1 av 12 · 1 vända')).toBeVisible()
    expect(await page.evaluate(() => window.__conceptSpeech)).toEqual([])
    const spoken = () => page.evaluate(() => window.__conceptSpeech.at(-1))
    await touchHold(page, flip, async () => {
      await expect.poll(spoken).toEqual({ text: 'Räknesättet där tal läggs ihop.', lang: 'sv-SE' })
    })
    await expect(flip).toHaveAttribute('aria-pressed', 'true')
    await flip.tap()
    await touchHold(page, flip, async () => {
      await expect.poll(spoken).toEqual({ text: 'Addition', lang: 'sv-SE' })
    })
    await expect(flip).toHaveAttribute('aria-pressed', 'false')
    await page.getByRole('button', { name: 'Slå på automatisk uppläsning' }).tap()
    await page.getByRole('button', { name: 'Öva begreppen', exact: true }).tap()
    const prompt = page.getByRole('heading', { name: 'Till vilket räknesätt hör varje uttryck?' })
    await expect.poll(spoken).toEqual({ text: await prompt.textContent(), lang: 'sv-SE' })
    const field = page.getByRole('button', { name: 'Addition', exact: true })
    await touchHold(page, field, async () => {
      await expect.poll(spoken).toEqual({ text: 'Addition', lang: 'sv-SE' })
    })
    const draggable = page.getByRole('button', { name: '18 ÷ 3', exact: true })
    await touchHold(page, draggable, async () => {
      await expect.poll(spoken).toEqual({ text: '18 ÷ 3', lang: 'sv-SE' })
    })
    await expect(draggable).toHaveAttribute('aria-pressed', 'false')
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

    await page.getByRole('button', { name: 'Startsida', exact: true }).tap()
    await page.getByText('Välj annan träning', { exact: true }).tap()
    await page.getByRole('region', { name: 'Begrepp', exact: true }).getByRole('button', { name: 'Linje, stråle, sträcka och diagonal', exact: true }).tap()
    await expect(page.getByRole('button', { name: /automatisk uppläsning/ })).toHaveCount(0)
    await expect(page.getByText('Håll på texten för att lyssna.')).toBeVisible()
    await touchHold(page, flip, async () => {
      await expect.poll(spoken).toEqual({ text: 'Linje', lang: 'sv-SE' })
    })
    await expect(flip).toHaveAttribute('aria-pressed', 'false')
    await flip.tap()
    await expect(page.getByRole('button', { name: 'Vänd kortet' })).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { name: 'Öva begreppen', exact: true }).tap()
    const imageOption = page.getByRole('group', { name: 'Svarsalternativ' }).getByRole('button').first()
    await expect(imageOption).toBeVisible()
    const imagePrompt = page.getByRole('heading', { name: /Vilken bild visar/ })
    const imagePromptText = await imagePrompt.textContent()
    await touchHold(page, imagePrompt, async () => {
      await expect.poll(spoken).toEqual({ text: imagePromptText, lang: 'sv-SE' })
    })
    await touchHold(page, imageOption, async () => {
      await expect.poll(spoken).toEqual({ text: 'Bild 1', lang: 'sv-SE' })
    })
    await expect(imageOption).toHaveAttribute('aria-pressed', 'false')
    await page.getByRole('button', { name: 'Begreppskort', exact: true }).tap()
    await expect(page.getByRole('button', { name: 'Vänd kortet' })).toHaveAttribute('aria-pressed', 'false')
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(page.getByText('Tryck för att vända', { exact: true })).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath('concept-front-phone.png') })
    await expect.poll(async () => (await serverProfile())?.conceptPractice?.find(run => run.deckId === 'geometry-lines')?.cards?.line)
      .toEqual(expect.any(Number))

    await page.getByRole('button', { name: 'Startsida', exact: true }).tap()
    await page.reload()
    await page.getByText('Se mina framsteg', { exact: true }).tap()
    const progress = page.getByRole('region', { name: 'Begrepp', exact: true })
    await expect(progress).toContainText('1 av 12 kort vända · 5 av 5 övningar besvarade · 4 rätt på första försöket')
    await expect(progress).toContainText('1 av 4 kort vända · 0 av 8 övningar besvarade')
    await progress.screenshot({ path: testInfo.outputPath('concept-progress-phone.png') })
    await progress.getByRole('button', { name: 'Öva Linje, stråle, sträcka och diagonal', exact: true }).tap()
    await expect(page).toHaveURL(url => url.pathname.endsWith('/concepts/geometry-lines'))
    await expect(page.getByRole('heading', { name: 'Linje, stråle, sträcka och diagonal' })).toBeVisible()
  } finally {
    releaseSync()
    await teacherContext.close()
  }
})
