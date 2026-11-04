import { test, expect } from '@playwright/test'
import { createPupil, login } from './lib/app.js'
import { createTeacher, teacherLogin } from './lib/teacher.js'
import { openResults } from './lib/screening.js'

async function screening(page, request, { name, title, taskIds }) {
  const tag = Math.random().toString(36).slice(2, 8)
  const classId = `shortdiv-${tag}`
  const pupil = await createPupil(request, { name, classId })
  const teacher = await createTeacher(request, { classIds: [classId], role: 'super_admin' })
  await teacherLogin(page, teacher)
  await page.evaluate(async data => {
    const response = await fetch('/api/teacher-diagnostic-assignments', { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-teacher-token': sessionStorage.getItem('mathapp_teacher_api_token') },
      body: JSON.stringify(data) })
    if (!response.ok) throw new Error(`Could not create screening: ${response.status}`)
  }, { classId, studentIds: [pupil.studentId], titleSv: title, taskIds })
  return { pupil, classId }
}

async function teacherDetail(page, classId) {
  const panel = await openResults(page, { className: classId })
  await panel.getByText('Sparade försök för en elev', { exact: true }).click()
  await panel.getByRole('combobox', { name: 'Elev', exact: true }).selectOption({ index: 1 })
  await panel.getByRole('button', { name: 'Visa underlag', exact: true }).click()
  return panel
}

// Short division (Simon 2026-11-02/03): printed in the middle a little above the
// centre; remainders are written by tapping the row above the numerator, each cell
// split in half towards its crossing; the answer line is the pupil's working.
test('A pupil writes remainders above the printed division and the answer after "="; the teacher sees both', async ({ page, request, browser }, testInfo) => {
  const { pupil, classId } = await screening(page, request, { name: 'Division Pupil', title: 'Delning', taskIds: ['div-short-001'] })
  const context = await browser.newContext({ viewport: { width: 820, height: 1180 }, hasTouch: true })
  const student = await context.newPage()
  await login(student, pupil)
  await student.getByRole('button', { name: 'Delning', exact: true }).click()
  await expect(student.locator('[data-short-division="78/3"]')).toBeAttached()
  // 78 / 3 sits on rows 3–4 from column 3; the rest of the grid stays free.
  await expect(student.locator('.diagnostic-cell')).toHaveCount(96)
  await expect(student.locator('input[data-cell="2:2"]')).toBeDisabled()
  await expect(student.locator('input[data-cell="5:1"]')).toBeEnabled()
  await student.screenshot({ path: testInfo.outputPath('1-open.png') })

  const key = digit => student.getByRole('button', { name: `Skriv ${digit}`, exact: true })
  const answerLine = student.locator('[data-short-division-answer="printed"]')
  const answer = student.getByRole('textbox', { name: 'Mitt svar', exact: true })
  await answerLine.tap({ position: { x: 20, y: 8 } })
  await expect(student.locator('.short-division__answer--active .notebook-caret')).toHaveCount(1)
  await key(2).tap()
  // Right half above 7 and left half above 8 both mean the crossing between them.
  const between = student.locator('[data-gap="2:3"]')
  await expect(between).toHaveCount(2)
  await between.first().tap()
  await key(1).tap()
  await expect(student.locator('[data-line-note="2:3"]')).toHaveText('1')
  // Right half above the last digit: the crossing to its right, two digits allowed.
  await student.locator('[data-gap="2:4"]').first().tap()
  await key(2).tap()
  await key(0).tap()
  await expect(student.locator('[data-line-note="2:4"]')).toHaveText('20')
  await answerLine.tap()
  await key(6).tap()
  await expect(answerLine).toHaveText('26')
  await expect(answer).toHaveValue('')
  await answer.tap()
  await key(2).tap()
  await key(6).tap()
  await expect(answer).toHaveValue('26')
  await student.screenshot({ path: testInfo.outputPath('2-written.png') })

  // The same division placed by the pupil has the printed template's geometry.
  await student.getByRole('button', { name: 'Kort division', exact: true }).tap()
  await student.locator('input[data-cell="5:2"]').tap()
  await key(7).tap()
  await key(8).tap()
  await student.locator('input[data-cell="6:2"]').tap()
  await key(3).tap()
  const printedBar = student.locator('[data-short-division="78/3"] .short-division__bar')
  const ownBar = student.locator('[data-short-division^="own:"] .short-division__bar')
  const printedBox = await printedBar.boundingBox()
  const ownBox = await ownBar.boundingBox()
  expect(ownBox.width, 'The same numerator needs the same fraction bar').toBeCloseTo(printedBox.width, 1)
  expect(ownBox.height).toBeCloseTo(printedBox.height, 1)
  await student.screenshot({ path: testInfo.outputPath('matching-bars-portrait.png') })
  await student.setViewportSize({ width: 1180, height: 820 })
  await student.screenshot({ path: testInfo.outputPath('matching-bars-landscape.png') })

  await expect(student.getByText('Alla skickade ändringar är sparade på servern.')).toBeVisible()
  await student.reload()
  await expect(student.locator('[data-line-note="2:3"]')).toHaveText('1')
  await expect(answerLine).toHaveText('26')
  await expect(answer).toHaveValue('26')
  await student.getByRole('button', { name: 'Lämna in svaren', exact: true }).click()
  await expect(student).toHaveURL(new RegExp(`/student/${pupil.studentId}$`))

  const panel = await teacherDetail(page, classId)
  await expect(panel.locator('[data-short-division="78/3"]')).toBeAttached()
  await expect(panel.locator('[data-line-note="2:3"]')).toHaveText('1')
  await panel.locator('.diagnostic-grid').last().screenshot({ path: testInfo.outputPath('3-teacher.png') })
  await context.close()
})

test('The division button places an own short division in the chosen cell; commas sit on the crossing', async ({ page, request, browser }, testInfo) => {
  const { pupil, classId } = await screening(page, request, { name: 'Line Pupil', title: 'Linjer', taskIds: ['add-carry-001'] })
  const context = await browser.newContext({ viewport: { width: 820, height: 1180 }, hasTouch: true })
  const student = await context.newPage()
  await login(student, pupil)
  await student.getByRole('button', { name: 'Linjer', exact: true }).click()
  const key = character => student.getByRole('button', { name: `Skriv ${character}`, exact: true })
  const cell = (row, column) => student.locator(`input[data-cell="${row}:${column}"]`)
  // Without a division there are no remainder areas.
  await expect(student.locator('[data-gap]')).toHaveCount(0)
  // Button first, then the cell.
  await student.getByRole('button', { name: 'Kort division', exact: true }).tap()
  await cell(3, 1).tap()
  const own = student.locator('[data-short-division^="own:"]')
  await expect(own).toHaveCount(1)
  for (const digit of ['1', '7', '6']) await key(digit).tap()
  await cell(4, 1).tap()
  await key(4).tap()
  // The divisor is shown centred under the three-column bar.
  await expect(student.locator('.diagnostic-cell').nth(4 * 12 + 1)).toHaveClass(/diagnostic-cell--shifted/)
  // Remainder: right half of the cell above 1 is the crossing between 1 and 7.
  await student.locator('[data-gap="3:2"][data-target-half="right"]').tap()
  await key(1).tap()
  await expect(student.locator('[data-line-note="3:2"]')).toHaveText('1')
  await student.locator('[data-short-division-answer]').tap()
  await key(4).tap()
  await key(4).tap()
  await expect(student.locator('[data-short-division-answer]')).toHaveText('44')
  // A fourth numerator digit makes the bar longer.
  await cell(3, 4).tap()
  await key(2).tap()
  await expect(student.locator('.short-division__bar')).toHaveCSS('width', /.+/)
  await student.screenshot({ path: testInfo.outputPath('4-own-division.png') })

  // A comma typed between digits lands on the crossing below them (0,75).
  await cell(6, 1).tap()
  for (const character of ['0', ',', '7', '5']) await key(character).tap()
  await expect(student.locator('[data-line-note="6:2:bottom"]')).toHaveText(',')
  await expect(cell(6, 2)).toHaveAttribute('aria-label', /stor siffra 7/)
  // The eraser switches itself off after one use.
  await student.getByRole('button', { name: 'Suddverktyg', exact: true }).tap()
  await cell(6, 3).tap()
  await expect(student.getByRole('button', { name: 'Suddverktyg', exact: true })).toHaveAttribute('aria-pressed', 'false')
  await expect(cell(6, 3)).toHaveAttribute('aria-label', /tom/)
  await expect(student.getByText('Alla skickade ändringar är sparade på servern.')).toBeVisible()
  await student.reload()
  await expect(student.locator('[data-line-note="3:2"]')).toHaveText('1')
  await expect(student.locator('[data-short-division-answer]')).toHaveText('44')
  // "Mitt svar" is empty on purpose; the pupil confirms handing in anyway.
  student.once('dialog', dialog => dialog.accept())
  await student.getByRole('button', { name: 'Lämna in svaren', exact: true }).click()
  await expect(student).toHaveURL(new RegExp(`/student/${pupil.studentId}$`))

  const panel = await teacherDetail(page, classId)
  await expect(panel.locator('[data-short-division^="own:"]')).toBeAttached()
  await expect(panel.locator('[data-line-note="3:2"]')).toHaveText('1')
  await panel.locator('.diagnostic-grid').last().screenshot({ path: testInfo.outputPath('5-teacher-own.png') })
  await context.close()
})
