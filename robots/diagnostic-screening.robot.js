import { test, expect } from '@playwright/test'
import { createPupil, login } from './lib/app.js'
import { teacherLogin, openTab } from './lib/teacher.js'
import { readFileSync } from 'node:fs'
const manifest = JSON.parse(readFileSync(new URL('../src/domains/arithmetic/diagnosticTasks.v1.json', import.meta.url), 'utf8'))

test('Screening matrix shows server answers, evidence-backed hover and a touch-accessible overlay', async ({ page, request, browser }, testInfo) => {
  const tag = Math.random().toString(36).slice(2, 8)
  const classId = `matrix-${tag}`
  const pupils = []
  for (const name of ['Matrix Correct', 'Matrix Pattern', 'Matrix Waiting']) pupils.push(await createPupil(request, { name, classId }))
  const teacher = await (await request.post('/__robot/teacher', { data: { id: `matrix-admin-${tag}`, classIds: [classId], role: 'super_admin' } })).json()
  await teacherLogin(page, teacher)
  const task = manifest.tasks.find(t => t.analysisCaseId === 'S2')
  const assignment = await page.evaluate(async data => {
    const response = await fetch('/api/teacher-diagnostic-assignments', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-teacher-token': sessionStorage.getItem('mathapp_teacher_api_token') }, body: JSON.stringify(data) })
    if (!response.ok) throw new Error(JSON.stringify(await response.json()))
    return (await response.json()).assignment
  }, { classId, audience: 'class', taskIds: [task.taskId] })
  for (const [index, pupil] of pupils.slice(0, 2).entries()) {
    const context = await browser.newContext()
    const student = await context.newPage()
    await login(student, pupil)
    await student.getByRole('button', { name: task.promptSv, exact: true }).click()
    const result = index ? '376' : '224'
    if (index) {
      const rows = [{ 5: '4', 6: '0', 7: '2' }, { 4: '−', 5: '1', 6: '7', 7: '8' }, { 4: '─', 5: '─', 6: '─', 7: '─' }, { 5: '3', 6: '7', 7: '6' }]
      for (const [row, cells] of rows.entries()) for (const [column, digit] of Object.entries(cells)) await student.locator(`input[data-cell="${row}:${column}"]`).fill(digit)
    }
    await student.getByRole('textbox', { name: 'Mitt svar', exact: true }).fill(result)
    await student.getByRole('button', { name: 'Lämna in svaret', exact: true }).click()
    await expect(student.getByRole('button', { name: 'Till min översikt', exact: true })).toBeEnabled()
    await context.close()
  }
  await page.reload()
  await openTab(page, 'Screening')
  const panel = page.getByRole('heading', { name: 'Screening till elev eller klass' }).locator('xpath=..')
  await panel.getByRole('combobox', { name: 'Klass', exact: true }).selectOption(classId)
  await panel.getByRole('button', { name: 'Grupp', exact: true }).click()
  const review = panel.getByRole('region', { name: 'Klassgenomgång', exact: true })
  await review.getByRole('combobox', { name: 'Uppdrag att gå igenom', exact: true }).selectOption(assignment.assignmentId)
  await panel.getByRole('button', { name: 'Dela ut', exact: true }).click()
  await panel.getByRole('button', { name: 'Grupp', exact: true }).click()
  await expect(review.getByRole('combobox', { name: 'Uppdrag att gå igenom', exact: true })).toHaveValue(assignment.assignmentId)
  const correct = review.getByRole('button', { name: /Matrix Correct,.*svar 224/ })
  const pattern = review.getByRole('button', { name: /Matrix Pattern,.*svar 376/ })
  await expect(correct).toHaveText('224')
  await expect(pattern).toHaveText('376M')
  expect(await correct.evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgb(220, 252, 231)')
  expect(await pattern.evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgb(255, 237, 213)')
  await expect(review.getByRole('button', { name: /Matrix Waiting,.*svar —/ })).toBeDisabled()
  await pattern.hover()
  const tooltip = page.getByRole('tooltip')
  await expect(tooltip).toContainText('Elevens svar376Rätt svar224')
  await expect(tooltip).toContainText('Mönstret bevisar inte metoden')
  await page.screenshot({ path: testInfo.outputPath('screening-matrix-hover.png'), fullPage: true })
  await pattern.press('Escape')
  await expect(tooltip).toHaveCount(0)
  await pattern.tap()
  const overlay = page.getByRole('dialog', { name: 'Elevgenomgång' })
  await expect(overlay).toBeVisible()
  await expect(overlay.getByText(/Resultatet 376 är förenligt/)).toBeVisible()
  const support = overlay.getByRole('region', { name: 'Lärarstöd utifrån underlaget' })
  await expect(support).toContainText('hur du hanterade nollan')
  await expect(support).toContainText('ingen säker felorsak')
  await overlay.getByRole('button', { name: 'Föregående elev', exact: true }).click()
  await expect(overlay.getByText(/Slutsvar: 224/)).toBeVisible()
  await expect(overlay.getByRole('region', { name: 'Lärarstöd utifrån underlaget' })).toHaveCount(0)
  await overlay.getByRole('button', { name: 'Stäng genomgång', exact: true }).click()
  await expect(overlay).not.toBeVisible()
  await expect(pattern).toBeFocused()
  await page.screenshot({ path: testInfo.outputPath('screening-matrix.png'), fullPage: true })
})
