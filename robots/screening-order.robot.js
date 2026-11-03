import { test, expect } from '@playwright/test'
import { createPupil, login } from './lib/app.js'
import { createTeacher, teacherLogin, sendScreening } from './lib/teacher.js'
import { openDispatch, openQuestionBank } from './lib/screening.js'

// Simon 2026-11-03: the teacher chooses the question order and can edit text questions.
test('A teacher reorders questions and edits a text question; the pupil meets them in that order', async ({ page, request, browser }, info) => {
  const tag = Math.random().toString(36).slice(2, 7)
  const classId = `order-${tag}`
  const pupil = await createPupil(request, { name: 'Order Pupil', classId, className: `Ordning ${tag}` })
  const teacher = await createTeacher(request, { classIds: [classId], role: 'super_admin' })
  await teacherLogin(page, teacher)
  const panel = await openDispatch(page, { withDefaultTask: false })
  await panel.getByRole('textbox', { name: 'Samlingens namn' }).fill(`Ordning ${tag}`)
  await panel.getByRole('textbox', { name: 'Egen fråga', exact: true }).fill('Räkna ut 5 + 3.')
  await panel.getByRole('textbox', { name: 'Facit', exact: true }).fill('8')
  await panel.getByRole('button', { name: 'Lägg till självrättande fråga', exact: true }).click()
  await panel.getByText(/^Frågor med textsvar som du bedömer/).click()
  await panel.getByRole('textbox', { name: 'Frågetext', exact: true }).fill('Förklar hur du tänkte.')
  await panel.getByRole('button', { name: 'Lägg till textfråga', exact: true }).click()
  // Edit the text question.
  await panel.getByRole('button', { name: 'Redigera textfråga 1', exact: true }).click()
  await expect(panel.getByRole('textbox', { name: 'Frågetext', exact: true })).toHaveValue('Förklar hur du tänkte.')
  await panel.getByRole('textbox', { name: 'Frågetext', exact: true }).fill('Förklara hur du tänkte.')
  await panel.getByRole('button', { name: 'Spara ändrad textfråga', exact: true }).click()
  await expect(panel.getByText('Förklara hur du tänkte.', { exact: true }).first()).toBeVisible()
  await openQuestionBank(panel, 'Division')
  await panel.getByRole('checkbox', { name: 'Räkna ut 78 / 3.', exact: true }).check()
  // Own questions come first; move the bank question to the top.
  await panel.getByText(/^Ändra ordning/).click()
  const order = panel.getByRole('list', { name: 'Frågornas ordning' })
  await expect(order.locator('li')).toHaveCount(3)
  await expect(order.locator('li').nth(2)).toContainText('78 / 3')
  await panel.getByRole('button', { name: 'Flytta fråga 3 upp', exact: true }).click()
  await panel.getByRole('button', { name: 'Flytta fråga 2 upp', exact: true }).click()
  await expect(order.locator('li').first()).toContainText('78 / 3')
  await page.screenshot({ path: info.outputPath('order.png'), fullPage: true })
  await sendScreening(page, { className: `Ordning ${tag}` })
  await expect(panel.getByText('Eleven har fått screeningen.', { exact: true })).toBeVisible()

  const context = await browser.newContext({ viewport: { width: 820, height: 1180 }, hasTouch: true })
  const student = await context.newPage()
  await login(student, pupil)
  await student.getByRole('button', { name: `Ordning ${tag}`, exact: true }).click()
  const question = student.locator('.notebook-question')
  await expect(question).toContainText('78 / 3')
  await student.getByRole('button', { name: 'Nästa fråga', exact: true }).click()
  await expect(question).toContainText('5 + 3')
  await student.getByRole('button', { name: 'Nästa fråga', exact: true }).click()
  await expect(question).toContainText('Förklara hur du tänkte.')
  await context.close()
})
