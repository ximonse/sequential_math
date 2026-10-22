// The pupil works through assigned exercises oldest first: "Starta nästa" on the
// home page, "Nästa uppdrag" on each completion screen, and ✓ on finished ones.
import { test, expect } from '@playwright/test'
import { createPupil, login, next } from './lib/app.js'
import { createFindings } from './lib/findings.js'
import { answerTasks } from './lib/session.js'
import { createTeacher, openTab, teacherLogin } from './lib/teacher.js'

function toBase64Url(text) {
  return Buffer.from(text, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}
const payload = assignment => toBase64Url(JSON.stringify({ v: 1, createdAt: 1, ...assignment }))

test('Assigned exercises run oldest first, offer the next one when done and show ✓ afterwards', async ({ browser, page, request }, testInfo) => {
  const findings = createFindings(testInfo)
  const tag = Math.random().toString(36).slice(2, 6)
  const classId = `klass-k-${tag}`
  const pupil = await createPupil(request, { name: `Kö ${tag}`, classId, className: `Kö ${tag}`, operations: ['addition', 'multiplication'] })
  const teacher = await createTeacher(request, { classIds: [classId] })
  await teacherLogin(page, teacher)
  for (const assignment of [
    { id: `asg_a_${tag}`, kind: 'standard', title: 'Robot A', problemTypes: ['addition'], minLevel: 1, maxLevel: 1, targetCount: 3 },
    { id: `asg_b_${tag}`, kind: 'standard', title: 'Robot B', problemTypes: ['addition'], minLevel: 1, maxLevel: 1, targetCount: 2 },
    { id: `asg_f_${tag}`, kind: 'focus', focusMode: 'choose' }
  ]) {
    await page.evaluate(async body => {
      const response = await fetch('/api/teacher-class-assignment', { method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-teacher-token': sessionStorage.getItem('mathapp_teacher_api_token') },
        body: JSON.stringify(body) })
      if (!response.ok) throw new Error(`Could not activate: ${response.status}`)
    }, { targetType: 'class', targetId: classId, action: 'activate', assignmentPayload: payload(assignment) })
    await page.waitForTimeout(5)
  }

  const context = await browser.newContext()
  const student = await context.newPage()
  await login(student, pupil)
  const module = student.getByRole('region', { name: 'Mina uppdrag' })
  await expect(module).toContainText('3 att göra')
  await module.getByRole('button', { name: 'Starta nästa: Robot A', exact: true }).click()
  await student.waitForURL(/\/practice/)
  await answerTasks(student, findings, { count: 3, choice: {} })
  await next(student)
  const levelUp = student.getByRole('button', { name: 'Fortsätt', exact: true })
  if (await levelUp.isVisible().catch(() => false)) await levelUp.click()
  await student.getByRole('button', { name: 'Nästa uppdrag: Robot B', exact: true }).click()
  await answerTasks(student, findings, { count: 2, choice: {} })
  await next(student)
  // Mastering level 1 on the way shows its own celebration before the assignment ends.
  const celebration = student.getByRole('button', { name: 'Fortsätt', exact: true })
  if (await celebration.isVisible().catch(() => false)) await celebration.click()
  await student.getByRole('button', { name: 'Nästa uppdrag: Fokusövning: KONTROLL', exact: true }).click()
  // The assigned exercise skips the choice screen and starts KONTROLL's practice signals.
  await expect(student.getByRole('dialog', { name: 'Fokuspunkten', exact: true })).toBeVisible()
  await student.getByRole('button', { name: 'Avsluta', exact: true }).click()
  await student.getByRole('button', { name: 'Tillbaka', exact: true }).last().click()

  await expect(module).toContainText('1 att göra · 2 klara')
  await expect(module.getByRole('button', { name: 'Starta nästa: Fokusövning: KONTROLL', exact: true })).toBeVisible()
  await module.getByRole('button', { name: /^Visa mina uppdrag/ }).click()
  await expect(module.getByRole('button', { name: 'Gör igen: Robot A', exact: true })).toBeVisible()
  await expect(module.getByRole('button', { name: 'Gör igen: Robot B', exact: true })).toBeVisible()
  await student.screenshot({ path: testInfo.outputPath('pupil-assignments.png'), fullPage: true })
  await openTab(page, 'Uppdrag & tickets')
  await page.screenshot({ path: testInfo.outputPath('teacher-presets.png'), fullPage: true })
  await student.reload()
  await expect(module).toContainText('1 att göra · 2 klara')
  await context.close()
  await findings.attach()
  expect.soft(findings.items.map(f => `${f.rule}: ${f.message}`)).toEqual([])
})

test('A table assignment ends when every fact is right and counts as done', async ({ browser, page, request }, testInfo) => {
  const findings = createFindings(testInfo)
  const tag = Math.random().toString(36).slice(2, 6)
  const classId = `klass-t-${tag}`
  const pupil = await createPupil(request, { name: `Tabell ${tag}`, classId, className: `Tabell ${tag}`, operations: ['multiplication'] })
  const teacher = await createTeacher(request, { classIds: [classId] })
  await teacherLogin(page, teacher)
  await page.evaluate(async body => {
    const response = await fetch('/api/teacher-class-assignment', { method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-teacher-token': sessionStorage.getItem('mathapp_teacher_api_token') },
      body: JSON.stringify(body) })
    if (!response.ok) throw new Error(`Could not activate: ${response.status}`)
  }, { targetType: 'class', targetId: classId, action: 'activate', assignmentPayload: payload({ id: `asg_t_${tag}`, kind: 'table', tables: [2] }) })

  const context = await browser.newContext()
  const student = await context.newPage()
  await login(student, pupil)
  await student.getByRole('button', { name: 'Starta nästa: Tabell 2', exact: true }).click()
  await student.waitForURL(/tables=2/)
  await answerTasks(student, findings, { count: 40, choice: {}, onLeave: async () => false })
  // The answer loop may already have dismissed the final table celebration.
  const celebration = student.getByRole('button', { name: 'Fortsätt', exact: true })
  if (await celebration.isVisible().catch(() => false)) await celebration.click()
  await expect(student.getByText('Tabell 2 är klart!')).toBeVisible()
  await student.getByRole('button', { name: 'Till startsidan', exact: true }).click()
  await expect(student.getByRole('region', { name: 'Mina uppdrag' })).toContainText('Alla uppdrag är klara ✓')
  await context.close()
})
