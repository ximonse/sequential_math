import { test, expect } from '@playwright/test'
import { createPupil, login } from './lib/app.js'
import { createTeacher, teacherLogin } from './lib/teacher.js'
import { openResults } from './lib/screening.js'

// Short division on the normal grid (Simon 2026-11-02): printed numbers, small digits
// on the lines between them, the answer on the line right of "=". R2: all of it stays.
test('A pupil writes a remainder on the line and the answer after "=" in short division; the teacher sees both', async ({ page, request, browser }, testInfo) => {
  const tag = Math.random().toString(36).slice(2, 8)
  const classId = `shortdiv-${tag}`
  const pupil = await createPupil(request, { name: 'Division Pupil', classId })
  const teacher = await createTeacher(request, { classIds: [classId], role: 'super_admin' })
  await teacherLogin(page, teacher)
  await page.evaluate(async data => {
    const response = await fetch('/api/teacher-diagnostic-assignments', { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-teacher-token': sessionStorage.getItem('mathapp_teacher_api_token') },
      body: JSON.stringify(data) })
    if (!response.ok) throw new Error(`Could not create screening: ${response.status}`)
  }, { classId, studentIds: [pupil.studentId], titleSv: 'Kort division', taskIds: ['div-short-001'] })

  const context = await browser.newContext({ viewport: { width: 820, height: 1180 }, hasTouch: true })
  const student = await context.newPage()
  await login(student, pupil)
  await student.getByRole('button', { name: 'Kort division', exact: true }).click()
  const layer = student.locator('[data-short-division="78/3"]')
  await expect(layer).toBeVisible()
  // The printed numbers are not pupil cells and the rest of the grid stays free.
  await expect(student.locator('.diagnostic-cell')).toHaveCount(96)
  await expect(student.locator('input[data-cell="1:1"]')).toBeDisabled()
  await expect(student.locator('input[data-cell="4:1"]')).toBeEnabled()
  await student.screenshot({ path: testInfo.outputPath('1-open.png') })

  const gap = student.locator('[data-gap="1:2"]')
  const key = digit => student.getByRole('button', { name: `Skriv ${digit}`, exact: true })
  const answerLine = student.locator('[data-short-division-answer]')
  const answer = student.getByRole('textbox', { name: 'Mitt svar', exact: true })
  // Tapping high up right of "=" reaches the answer line, with a blinking caret.
  await answerLine.tap({ position: { x: 20, y: 8 } })
  await expect(student.locator('.short-division__answer--active .notebook-caret')).toHaveCount(1)
  await key(2).tap()
  // Tapping the crossing makes the next digit small; it can have two digits.
  await gap.tap()
  await expect(gap).toHaveAttribute('aria-pressed', 'true')
  await key(1).tap()
  await expect(student.locator('[data-line-note="1:2"]')).toHaveText('1')
  // Back on the answer line, digits are ordinary again.
  await answerLine.tap()
  await key(6).tap()
  await expect(answerLine).toHaveText('26')
  // The answer line is the pupil's working, not the answer (Simon 2026-11-02).
  await expect(answer).toHaveValue('')
  await answer.tap()
  await key(2).tap()
  await key(6).tap()
  await expect(answer).toHaveValue('26')
  await student.screenshot({ path: testInfo.outputPath('2-written.png') })

  // A free cell outside the template still works as before.
  await student.locator('input[data-cell="4:2"]').tap()
  await key(4).tap()
  await expect(student.locator('input[data-cell="4:2"]')).toHaveAttribute('aria-label', /stor siffra 4/)

  await expect(student.getByText('Alla skickade ändringar är sparade på servern.')).toBeVisible()
  await student.reload()
  await expect(student.locator('[data-line-note="1:2"]')).toHaveText('1')
  await expect(answerLine).toHaveText('26')
  await expect(answer).toHaveValue('26')
  await student.getByRole('button', { name: 'Lämna in svaren', exact: true }).click()
  await expect(student).toHaveURL(new RegExp(`/student/${pupil.studentId}$`))

  const panel = await openResults(page, { className: classId })
  await panel.getByText('Sparade försök för en elev', { exact: true }).click()
  await panel.getByRole('combobox', { name: 'Elev', exact: true }).selectOption({ index: 1 })
  await panel.getByRole('button', { name: 'Visa underlag', exact: true }).click()
  const teacherLayer = panel.locator('[data-short-division="78/3"]')
  await expect(teacherLayer).toBeVisible()
  await expect(teacherLayer.locator('.short-division__note')).toHaveText('1')
  await teacherLayer.locator('xpath=..').screenshot({ path: testInfo.outputPath('3-teacher.png') })
  await context.close()
})

test('With "Skriv på linjerna" a pupil writes a small digit on any vertical line in any task', async ({ page, request, browser }, testInfo) => {
  const tag = Math.random().toString(36).slice(2, 8)
  const classId = `linenotes-${tag}`
  const pupil = await createPupil(request, { name: 'Line Pupil', classId })
  const teacher = await createTeacher(request, { classIds: [classId], role: 'super_admin' })
  await teacherLogin(page, teacher)
  await page.evaluate(async data => {
    const response = await fetch('/api/teacher-diagnostic-assignments', { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-teacher-token': sessionStorage.getItem('mathapp_teacher_api_token') },
      body: JSON.stringify(data) })
    if (!response.ok) throw new Error(`Could not create screening: ${response.status}`)
  }, { classId, studentIds: [pupil.studentId], titleSv: 'Linjer', taskIds: ['add-carry-001'] })

  const context = await browser.newContext({ viewport: { width: 820, height: 1180 }, hasTouch: true })
  const student = await context.newPage()
  await login(student, pupil)
  await student.getByRole('button', { name: 'Linjer', exact: true }).click()
  await expect(student.locator('[data-gap]')).toHaveCount(0)
  const toggle = student.getByRole('button', { name: 'Skriv på linjerna', exact: true })
  await toggle.tap()
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await expect(student.locator('[data-gap]')).toHaveCount(8 * 11)
  await student.locator('[data-gap="3:4"]').tap()
  await student.getByRole('button', { name: 'Skriv 1', exact: true }).tap()
  await student.getByRole('button', { name: 'Skriv 0', exact: true }).tap()
  await expect(student.locator('[data-line-note="3:4"]')).toHaveText('10')
  await student.screenshot({ path: testInfo.outputPath('4-line-mode.png') })
  await toggle.tap()
  await expect(student.locator('[data-gap]')).toHaveCount(0)
  // Ordinary cells work again when the mode is off.
  await student.locator('input[data-cell="3:5"]').tap()
  await student.getByRole('button', { name: 'Skriv 7', exact: true }).tap()
  await expect(student.locator('input[data-cell="3:5"]')).toHaveAttribute('aria-label', /stor siffra 7/)
  await expect(student.getByText('Alla skickade ändringar är sparade på servern.')).toBeVisible()
  // A comma typed between digits lands on the crossing below them (0,75).
  await student.locator('input[data-cell="5:1"]').tap()
  for (const character of ['0', ',', '7', '5']) await student.getByRole('button', { name: `Skriv ${character}`, exact: true }).tap()
  await expect(student.locator('[data-line-note="5:2:bottom"]')).toHaveText(',')
  await expect(student.locator('input[data-cell="5:2"]')).toHaveAttribute('aria-label', /stor siffra 7/)
  // The eraser switches itself off after one use.
  await student.getByRole('button', { name: 'Suddverktyg', exact: true }).tap()
  await student.locator('input[data-cell="5:3"]').tap()
  await expect(student.getByRole('button', { name: 'Suddverktyg', exact: true })).toHaveAttribute('aria-pressed', 'false')
  await expect(student.locator('input[data-cell="5:3"]')).toHaveAttribute('aria-label', /tom/)
  await student.screenshot({ path: testInfo.outputPath('5-comma.png') })
  await student.reload()
  await expect(student.locator('[data-line-note="3:4"]')).toHaveText('10')
  await expect(student.locator('[data-line-note="5:2:bottom"]')).toHaveText(',')
  await student.getByRole('button', { name: 'Lämna in svaren', exact: true }).click()
  await student.getByRole('button', { name: 'Lämna in svaren', exact: true }).waitFor({ state: 'detached' }).catch(() => {})

  const panel = await openResults(page, { className: classId })
  await panel.getByText('Sparade försök för en elev', { exact: true }).click()
  await panel.getByRole('combobox', { name: 'Elev', exact: true }).selectOption({ index: 1 })
  await panel.getByRole('button', { name: 'Visa underlag', exact: true }).click()
  await expect(panel.locator('[data-line-note="3:4"]')).toHaveText('10')
  await context.close()
})
