import { test, expect } from '@playwright/test'
import { createPupil, login } from './lib/app.js'
import { teacherLogin } from './lib/teacher.js'
import { collectionSelect, openResults, reviewOf } from './lib/screening.js'

const prompt = 'Lisa har 248 kulor och ger bort några till sin bror. Sedan köper hon 35 nya kulor och har då 199 kulor. '
  + 'Hur många kulor gav Lisa bort till sin bror? Förklara hur du tänker, steg för steg, och visa gärna med en bild eller en uträkning '
  + 'så att någon annan kan förstå hur du kom fram till ditt svar.'
const answer = Array.from({ length: 12 }, (_, index) => `Rad ${index + 1}: först tar jag 248 minus det hon gav bort och sedan lägger jag till 35.`).join(' ')

test('Long written questions and long answers are fully visible to pupil and teacher', async ({ page, request, browser }, testInfo) => {
  const tag = Math.random().toString(36).slice(2, 8)
  const classId = `long-text-${tag}`
  const pupil = await createPupil(request, { name: 'Long Text', classId })
  const teacher = await (await request.post('/__robot/teacher', { data: {
    id: `long-text-admin-${tag}`, classIds: [classId], role: 'super_admin'
  } })).json()
  await teacherLogin(page, teacher)
  await page.evaluate(async data => {
    const response = await fetch('/api/teacher-diagnostic-assignments', {
      method: 'POST', headers: { 'Content-Type': 'application/json',
        'x-teacher-token': sessionStorage.getItem('mathapp_teacher_api_token') }, body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error(`Could not assign collection: ${response.status} ${await response.text()}`)
  }, { classId, studentIds: [pupil.studentId], titleSv: 'Skrivfråga – lång', taskIds: [],
    customTasks: [{ promptSv: prompt, gridEnabled: true, drawingEnabled: false }] })

  const context = await browser.newContext({ viewport: { width: 820, height: 1180 }, hasTouch: true })
  const student = await context.newPage()
  await login(student, pupil)
  await student.getByRole('button', { name: 'Skrivfråga – lång', exact: true }).click()
  const question = student.locator('.notebook-question')
  await expect(question).toHaveText(prompt)
  const clipped = element => element.scrollHeight > element.clientHeight + 2 || element.scrollWidth > element.clientWidth + 2
  expect(await question.evaluate(clipped)).toBe(false)
  const field = student.locator('#diagnostic-answer')
  await field.fill(answer)
  await expect(field).toHaveValue(answer)
  expect(await field.evaluate(clipped)).toBe(false)
  await student.screenshot({ path: testInfo.outputPath('long-text-pupil-ipad.png'), fullPage: true })
  await expect(student.getByText('Alla skickade ändringar är sparade på servern.')).toBeVisible()
  await student.reload()
  await expect(field).toHaveValue(answer)
  expect(await field.evaluate(clipped)).toBe(false)
  await context.close()

  const results = await openResults(page, { className: classId })
  await collectionSelect(results).selectOption({ index: 1 })
  const review = reviewOf(results)
  const cell = review.locator('tbody button').first()
  await expect(cell).toContainText('…')
  await cell.hover()
  await expect(page.getByRole('tooltip')).toContainText(answer)
  await page.screenshot({ path: testInfo.outputPath('long-text-teacher-matrix.png'), fullPage: true })
})
