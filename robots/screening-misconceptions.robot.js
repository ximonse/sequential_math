// Step 4 in docs/STYRNING_FELFORSTAELSER.md: the results show the misconceptions
// behind the pupils' wrong answers, and clicking a card marks its answers in the
// table below (R3: what I press happens).
import { test, expect } from '@playwright/test'
import { createPupil, login } from './lib/app.js'
import { teacherLogin } from './lib/teacher.js'
import { openResults, reviewOf, chooseCollection } from './lib/screening.js'
import { readFileSync } from 'node:fs'
const manifest = JSON.parse(readFileSync(new URL('../src/domains/arithmetic/diagnosticTasks.v1.json', import.meta.url), 'utf8'))

test('A wrong answer from a known misconception shows a card that marks the answer in the table', async ({ page, request, browser }, testInfo) => {
  const tag = Math.random().toString(36).slice(2, 8)
  const classId = `misc-${tag}`
  const pupils = []
  for (const name of ['Misc Order', 'Misc Right']) pupils.push(await createPupil(request, { name, classId }))
  const teacher = await (await request.post('/__robot/teacher', { data: { id: `misc-admin-${tag}`, classIds: [classId], role: 'super_admin' } })).json()
  await teacherLogin(page, teacher)
  // 402 − 178: answering 376 takes the smaller digit from the larger in every column.
  const task = manifest.tasks.find(t => t.analysisCaseId === 'S2')
  const assignment = await page.evaluate(async data => {
    const response = await fetch('/api/teacher-diagnostic-assignments', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-teacher-token': sessionStorage.getItem('mathapp_teacher_api_token') }, body: JSON.stringify(data) })
    if (!response.ok) throw new Error(JSON.stringify(await response.json()))
    return (await response.json()).assignment
  }, { classId, audience: 'class', taskIds: [task.taskId] })
  for (const [pupil, answer] of [[pupils[0], '376'], [pupils[1], '224']]) {
    const context = await browser.newContext()
    const student = await context.newPage()
    await login(student, pupil)
    await student.getByRole('button', { name: 'Screening', exact: true }).click()
    await student.getByRole('textbox', { name: 'Mitt svar', exact: true }).pressSequentially(answer)
    await student.getByRole('button', { name: 'Lämna in svaren', exact: true }).click()
    await expect(student).toHaveURL(new RegExp(`/student/${pupil.studentId}$`))
    await context.close()
  }
  await page.reload()
  const results = await openResults(page, { className: classId })
  await chooseCollection(results, assignment.assignmentId)
  const section = results.getByRole('region', { name: 'Felförståelser i screeningen', exact: true })
  const card = section.getByRole('button', { name: /Additionskommutativitet överförd till subtraktion/ })
  await expect(card).toBeVisible()
  await expect(card).toContainText('1 elev')
  await expect(card).toContainText('Misc Order')
  await expect(card).not.toContainText('Misc Right')
  await expect(section).toContainText('1 fel')
  await expect(section).toContainText('1 pekar på en felförståelse')

  const review = reviewOf(results)
  const wrongCell = review.getByRole('cell').filter({ has: page.getByRole('button', { name: /Misc Order,.*svar 376/ }) })
  const rightCell = review.getByRole('cell').filter({ has: page.getByRole('button', { name: /Misc Right,.*svar 224/ }) })
  await card.click()
  await expect(card).toHaveAttribute('aria-pressed', 'true')
  await expect(wrongCell).toHaveClass(/outline-indigo-600/)
  await expect(rightCell).toHaveClass(/opacity-35/)
  await page.screenshot({ path: testInfo.outputPath('screening-misconception-card.png'), fullPage: true })
  await card.press('Enter')
  await expect(card).toHaveAttribute('aria-pressed', 'false')
  await expect(wrongCell).not.toHaveClass(/outline-indigo-600/)
  await expect(rightCell).not.toHaveClass(/opacity-35/)

  // The teacher picks one more misconception from the approved list; it gets its own card.
  await review.getByRole('button', { name: /Misc Order,.*svar 376/ }).click()
  const form = page.getByRole('form', { name: 'Lärarens genomgång', exact: true })
  await form.getByRole('combobox', { name: 'Felförståelse ur listan' }).selectOption({ label: 'Tiotalsövergången är inte förstådd' })
  await expect(form.getByRole('list', { name: 'Valda felförståelser' })).toContainText('Tiotalsövergången är inte förstådd')
  await form.getByRole('button', { name: 'Spara genomgång', exact: true }).click()
  await expect(form.getByText('Genomgången är sparad på servern.')).toBeVisible()
  await page.getByRole('button', { name: 'Stäng genomgång', exact: true }).click()
  const picked = section.getByRole('button', { name: /Tiotalsövergången är inte förstådd/ })
  await expect(picked).toContainText('Lärarens val')
  await expect(card).toBeVisible()
  await expect(review.getByRole('button', { name: /Misc Order,.*svar 376/ })).toHaveAccessibleName(/Felförståelse/)
  await page.screenshot({ path: testInfo.outputPath('screening-teacher-pick.png'), fullPage: true })
})
