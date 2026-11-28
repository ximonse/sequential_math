import { test, expect } from '@playwright/test'
import { createPupil, login, readServerProfile, readState } from './lib/app.js'
import { createTeacher, openSubTab, openTab, selectOnlyClass, teacherLogin } from './lib/teacher.js'

test.use({ actionTimeout: 30_000 })

async function answer(page, correct) {
  const choices = page.getByRole('group', { name: 'Svarsalternativ' }).getByRole('button')
  await expect(choices.first()).toBeVisible()
  const { problem } = await readState(page)
  const task = problem.choiceTask
  const ids = correct ? task.correctOptionIds : [task.options.find(option => !task.correctOptionIds.includes(option.id)).id]
  const submit = page.getByRole('button', { name: 'Svara', exact: true })
  await expect(submit).toBeDisabled()
  for (const id of ids) await choices.nth(task.options.findIndex(option => option.id === id)).tap()
  await expect(submit).toBeEnabled()
  expect((await readState(page)).phase).toBe('answering')
  await expect(submit).toHaveCSS('min-height', '56px')
  await expect(submit).toHaveCSS('font-size', '20px')
  expect(await submit.evaluate(button => Math.abs(button.getBoundingClientRect().right - button.parentElement.getBoundingClientRect().right) < 1)).toBe(true)
  await submit.tap()
  if (!correct) {
    const wrongOption = choices.nth(task.options.findIndex(option => option.id === ids[0]))
    await expect(wrongOption).toHaveAttribute('data-answer-feedback', 'incorrect')
  }
  await expect(page.getByText(correct ? 'Rätt!' : /^Rätt svar är /)).toBeVisible()
  for (const id of task.correctOptionIds) {
    const rightOption = choices.nth(task.options.findIndex(option => option.id === id))
    await expect(rightOption).toHaveAttribute('data-answer-feedback', 'correct')
    await expect(rightOption).toHaveCSS('background-color', 'rgb(220, 252, 231)')
  }
  return problem
}

const nextQuestion = page => page.getByRole('button', { name: 'Nästa fråga', exact: true }).tap()

test('geometry uses touch choices, timed advancement, resumable assignments and class statistics', async ({ page, browser, request }, testInfo) => {
  const tag = Math.random().toString(36).slice(2, 8)
  const klass = { classId: `geometry-${tag}`, className: `Geometri ${tag}` }
  const pupil = await createPupil(request, { ...klass, name: `Geometri ${tag}`, operations: ['addition'] })
  await page.addInitScript(() => {
    window.__geometrySpeech = []
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: { cancel() {}, speak({ text, lang }) { if (text.trim()) window.__geometrySpeech.push({ text, lang }) } }
    })
    window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text } }
  })
  await login(page, pupil)
  await page.getByText('Välj annan träning', { exact: true }).tap()
  await expect(page.getByRole('region', { name: 'Geometri', exact: true }).getByRole('button')).toHaveCount(3)
  await page.getByRole('button', { name: 'Linjer och sträckor', exact: true }).tap()
  for (let index = 0; index < 4; index += 1) {
    expect((await answer(page, true)).level).toBe(1)
    await nextQuestion(page)
  }
  await expect(page.getByText('Geometri · nivå 2', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => window.__geometrySpeech)).toEqual([])
  const nameOption = page.getByRole('group', { name: 'Svarsalternativ' }).getByRole('button').first()
  const nameText = await nameOption.getAttribute('aria-label')
  await nameOption.press('Alt+l')
  await expect.poll(() => page.evaluate(() => window.__geometrySpeech.at(-1))).toEqual({ text: nameText, lang: 'sv-SE' })
  await expect(nameOption).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByRole('group', { name: 'Svarsalternativ' })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('geometry-pupil.png') })
  const completed = page.getByText('Nivå 2 klarad!', { exact: false })
  await expect(completed).toHaveCount(0)
  for (let index = 0; index < 4; index += 1) {
    expect((await answer(page, true)).level).toBe(2)
    if (index < 3) {
      await expect(completed).toHaveCount(0)
      await nextQuestion(page)
    }
  }
  await expect(completed).toBeVisible()
  await expect(page.locator('h3')).toHaveCSS('font-size', '20px')
  await page.screenshot({ path: testInfo.outputPath('geometry-level-completed.png') })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator('h3')).toHaveCSS('font-size', '18px')
  await expect(completed).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('geometry-level-completed-phone.png') })
  await page.setViewportSize({ width: 1024, height: 768 })
  await page.reload()
  await expect(completed).toBeVisible()

  await page.getByRole('button', { name: 'Startsida', exact: true }).tap()
  await page.getByText('Välj annan träning', { exact: true }).tap()
  await page.getByRole('button', { name: 'Kroppar (3D)', exact: true }).tap()
  await expect(page.getByText('Geometri · nivå 1', { exact: true })).toBeVisible()
  expect((await readState(page)).problem.skill).toBe('geometry_solids')
  await page.getByRole('button', { name: 'Startsida', exact: true }).tap()
  await page.getByText('Välj annan träning', { exact: true }).tap()
  await page.getByRole('button', { name: 'Plana figurer', exact: true }).tap()
  await expect(page.getByRole('heading', { name: 'Markera alla månghörningar.' })).toBeVisible()
  const options = page.getByRole('group', { name: 'Svarsalternativ' }).getByRole('button')
  await options.first().tap()
  await expect(options.first()).toHaveAttribute('aria-pressed', 'true')
  await options.first().tap()
  await expect(options.first()).toHaveAttribute('aria-pressed', 'false')
  expect((await answer(page, true)).choiceTask.responseMode).toBe('multiple')
  await page.screenshot({ path: testInfo.outputPath('geometry-multiple.png') })

  const teacher = await createTeacher(request, { classIds: [klass.classId] })
  const teacherContext = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] })
  const teacherPage = await teacherContext.newPage()
  await teacherLogin(teacherPage, teacher)
  await selectOnlyClass(teacherPage, klass.className)
  await openTab(teacherPage, 'Uppdrag & tickets')
  const creator = teacherPage.getByRole('region', { name: 'Geometri', exact: true })
  await expect(creator.getByLabel('Uppläsning')).toHaveValue('manual')
  await creator.getByLabel('Uppläsning').selectOption('off')
  await creator.getByRole('checkbox', { name: 'Linjer och sträckor', exact: true }).check()
  await creator.getByRole('button', { name: 'Skapa geometriuppdrag', exact: true }).click()
  const row = teacherPage.locator('div.rounded.border', { hasText: 'asg_' }).filter({ hasText: 'Geometri – Linjer och sträckor' }).first()
  await row.getByRole('button', { name: 'Kopiera länk', exact: true }).click()
  const link = new URL(await teacherPage.evaluate(() => navigator.clipboard.readText()))

  await page.goto(`${link.pathname}${link.search}`)
  await expect(page.getByText(/Uppdrag: Geometri/)).toBeVisible()
  await expect(page.getByText('Håll på texten för att lyssna.')).toHaveCount(0)
  await expect(page.locator('[data-practice-speech]')).toHaveCount(0)
  const wrong = await answer(page, false)
  expect(wrong.skill).toBe('geometry_lines')
  await page.screenshot({ path: testInfo.outputPath('geometry-correction.png') })
  const readAssignmentAnswers = async () => (await readServerProfile(request, pupil.studentId))?.recentProblems
    ?.filter(result => result.domain === 'geometry' && result.trainingContext?.assignmentId) ?? []
  await expect.poll(async () => (await readAssignmentAnswers()).length).toBe(1)
  await page.reload()
  for (let index = 0; index < 3; index += 1) {
    expect((await answer(page, true)).skill).toBe('geometry_lines')
    await nextQuestion(page)
  }
  await expect(page.getByText(/Geometri – Linjer och sträckor är klart!/)).toBeVisible()
  await expect.poll(async () => (await readAssignmentAnswers()).length).toBe(4)
  const results = await readAssignmentAnswers()
  expect(results.filter(result => !result.correct)).toHaveLength(1)
  expect(results.every(result => result.evidenceClass === 'practice_only')).toBe(true)

  await teacherPage.reload()
  await selectOnlyClass(teacherPage, klass.className)
  await openTab(teacherPage, 'Statistik & stöd')
  await openSubTab(teacherPage, 'Behöver stöd & Resultat')
  const table = teacherPage.getByRole('region', { name: 'Geometriresultat' }).getByRole('table')
  await expect(table).toBeVisible()
  await expect(table.getByRole('row').nth(1).getByRole('cell').first()).toHaveText('1')
  await teacherPage.screenshot({ path: testInfo.outputPath('geometry-teacher.png') })
  await teacherContext.close()
})
