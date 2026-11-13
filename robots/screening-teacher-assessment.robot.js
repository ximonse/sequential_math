import { test, expect } from '@playwright/test'
import { createPupil, login } from './lib/app.js'
import { teacherLogin, sendScreening } from './lib/teacher.js'
import { openDispatch, openResults, reviewOf, chooseCollection, collectionRows, handInAnywayOnce } from './lib/screening.js'

// R3/R4: the teacher's answer and misconception are counted in the results table,
// marked L/F, while the pupil's own answer stays as it was and nothing reaches the pupil.
test('Teacher types a forgotten answer and notes a misconception beside the pupil original', async ({ page, request, browser }) => {
  const tag = Math.random().toString(36).slice(2, 8)
  const classId = `assess-${tag}`
  const className = `Bedömning ${tag}`
  const pupil = await createPupil(request, { name: 'Assess Pupil', classId, className })
  const teacher = await (await request.post('/__robot/teacher', { data: { id: `assess-admin-${tag}`, classIds: [classId], role: 'super_admin' } })).json()
  await teacherLogin(page, teacher)
  await openDispatch(page)
  await sendScreening(page, { className })
  const context = await browser.newContext()
  const student = await context.newPage()
  await login(student, pupil)
  await student.getByRole('button', { name: 'Screening', exact: true }).click()
  await student.locator('input[data-cell="0:0"]').press('6')
  await expect(student.getByText('Alla skickade ändringar är sparade på servern.')).toBeVisible()
  handInAnywayOnce(student)
  await student.getByRole('button', { name: 'Lämna in svaren', exact: true }).click()
  await expect(student).toHaveURL(new RegExp(`/student/${pupil.studentId}$`))

  const results = await openResults(page, { className })
  await chooseCollection(results, await collectionRows(results).first().getAttribute('data-collection-id'))
  const review = reviewOf(results)
  await review.getByRole('button', { name: /Assess Pupil, Räkna ut 268/ }).click()
  const form = review.getByRole('form', { name: 'Lärarens genomgång', exact: true })
  await form.getByRole('textbox', { name: 'Svar som eleven glömt skriva i svarsrutan' }).fill('699')
  await expect(form.getByText('Bedöms som rätt mot facit.')).toBeVisible()
  await form.getByRole('textbox', { name: 'Annan felförståelse (fritext)' }).fill('Skriver svaret bara i häftet.')
  await form.getByRole('button', { name: 'Spara genomgång', exact: true }).click()
  await expect(form.getByText('Genomgången är sparad på servern.')).toBeVisible()
  await review.getByRole('button', { name: 'Stäng genomgång', exact: true }).click()
  const cell = review.getByRole('button', { name: /Assess Pupil, Räkna ut 268/ })
  await expect(cell).toHaveAccessibleName(/Rätt svar enligt läraren, .*Lärarbedömt, Felförståelse/)
  await expect(cell).toHaveText(/699\s*L\s*F/)

  // The pupil's own answer field is still empty and the teacher's marks stay private.
  await cell.click()
  await expect(review.getByText(/Slutsvar: inte skrivet/)).toBeVisible()
  await student.reload()
  await expect(student.getByText('Skriver svaret bara i häftet.')).toHaveCount(0)
  await context.close()
})
