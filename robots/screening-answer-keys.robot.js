import { test, expect } from '@playwright/test'
import { createPupil, login, readServerProfile } from './lib/app.js'
import { createTeacher, teacherLogin, sendScreening } from './lib/teacher.js'
import { openDispatch, openResults, collectionSelect } from './lib/screening.js'

async function teacherGet(page, path) {
  return page.evaluate(async path => {
    const response = await fetch(path, { headers: { 'x-teacher-token': sessionStorage.getItem('mathapp_teacher_api_token') } })
    if (!response.ok) throw new Error(`Teacher read failed: ${response.status}`)
    return response.json()
  }, path)
}

test('original frozen keys survive assignment, pupil work, reload and automatic teacher results without affecting mastery', async ({ page, request, browser }, testInfo) => {
  const tag = Math.random().toString(36).slice(2, 8), classId = `key-${tag}`, title = `Egna facit ${tag}`
  const pupil = await createPupil(request, { name: 'Key Pupil', classId })
  const excluded = await createPupil(request, { name: 'Other Pupil', classId })
  const teacher = await createTeacher(request, { classIds: [classId], role: 'super_admin' })
  await teacherLogin(page, teacher)
  const panel = await openDispatch(page)
  await panel.getByRole('textbox', { name: 'Samlingens namn', exact: true }).fill(title)
  await panel.getByText('Välj uppgifter en och en', { exact: true }).click()
  await panel.getByRole('checkbox', { name: 'Räkna ut 268 + 431.', exact: true }).uncheck()
  await panel.getByText('Egna frågor med automatisk rättning', { exact: true }).click()
  const questions = [
    ['Tal', '2,35', 'kg', 'Beräkna 5,63 - 3,28. Svara i kg.', '2.35 kg', 'correct'],
    ['Bråkform', '3/8', '', 'Skriv 0,375 i bråkform.', '6/16', 'correct'],
    ['Blandad form', '2 3/8', '', 'Skriv 19/8 i blandad form.', '19/8', 'incomplete'],
    ['Tal', '35', '%', 'Skriv 7/20 som procent.', '3,5 %', 'incorrect'],
    ['Flera tal i ordning', '0,45; 45', '', 'Skriv först 9/20 som decimaltal och sedan procenttalet utan procenttecken.', '0.45 and 45', 'correct'],
    ['Bestämt textsvar', 'mindre; mindre än', '', 'Blir ett positivt tal större eller mindre när du delar det med 10?', 'mindre', 'correct'],
    ['Tal', '23', '', 'Vilket tal är x? x + 9 = 32.', 'x = 23', 'correct'],
    ['Tal', '1,84', 'kg', 'Ett paket väger 1,36 kg. Lägg till 480 g. Svara i kg.', '1,84 g', 'incorrect'],
  ]
  for (const [format, key, unit, prompt] of questions) {
    await panel.getByRole('textbox', { name: 'Egen fråga', exact: true }).fill(prompt)
    await panel.getByRole('combobox', { name: 'Facitformat', exact: true }).selectOption({ label: format })
    await panel.getByRole('textbox', { name: 'Facit', exact: true }).fill(key)
    if (unit) await panel.getByRole('textbox', { name: 'Enhet (valfri)', exact: true }).fill(unit)
    await panel.getByRole('button', { name: 'Lägg till självrättande fråga', exact: true }).click()
  }
  await expect(panel.getByText('8 självrättande frågor tillagda.', { exact: true })).toBeVisible()
  // Editing must retain both the key and the workspace selection.
  await panel.getByRole('button', { name: 'Redigera fråga 2', exact: true }).click()
  await expect(panel.getByRole('textbox', { name: 'Facit', exact: true })).toHaveValue('3/8')
  await expect(panel.getByRole('checkbox', { name: 'Räknehäfte till frågan', exact: true })).toBeChecked()
  await panel.getByRole('button', { name: 'Spara ändrad fråga', exact: true }).click()
  await page.screenshot({ path: testInfo.outputPath('teacher-frozen-keys.png'), fullPage: true })
  await sendScreening(page, { pupilName: pupil.loginCode })
  const assignment = (await teacherGet(page, `/api/teacher-diagnostic-assignments?classId=${classId}`)).assignments.find(item => item.titleSv === title)
  expect(assignment.studentIds).toEqual([pupil.studentId])
  expect(assignment.items).toHaveLength(8)
  expect(assignment.items.every(item => item.taskSnapshot.answerRule === 'custom_facit')).toBe(true)
  const before = await readServerProfile(request, pupil.studentId)
  const context = await browser.newContext({ viewport: { width: 1024, height: 768 }, hasTouch: true })
  const student = await context.newPage()
  await login(student, pupil)
  const publicList = await student.evaluate(async () => (await fetch('/api/me/diagnostic-assignments')).json())
  expect(JSON.stringify(publicList)).not.toMatch(/answerKey|expected|custom_facit/u)
  await student.getByRole('button', { name: title, exact: true }).click()
  for (let index = 0; index < questions.length; index++) {
    await expect(student.getByText(`Fråga ${index + 1} av 8`, { exact: true })).toBeVisible()
    await expect(student.getByText(questions[index][3], { exact: true })).toBeVisible()
    await student.locator('#diagnostic-answer').fill(questions[index][4])
    await expect(student.locator('#diagnostic-answer')).toHaveValue(questions[index][4])
    await expect.poll(async () => {
      const live = await teacherGet(page, `/api/teacher-diagnostic-attempts?classId=${classId}&assignmentId=${assignment.assignmentId}`)
      return live.rows[0].items[index].screening?.explicitAnswer
    }).toBe(questions[index][4])
    if (index === 0) {
      await student.reload()
      await expect(student.locator('#diagnostic-answer')).toHaveValue('2.35 kg')
      await student.screenshot({ path: testInfo.outputPath('pupil-landscape.png'), fullPage: true })
      await student.setViewportSize({ width: 768, height: 1024 })
      await student.screenshot({ path: testInfo.outputPath('pupil-portrait.png'), fullPage: true })
    }
    if (index < questions.length - 1) await student.getByRole('button', { name: 'Nästa fråga', exact: true }).click()
  }
  const overview = await teacherGet(page, `/api/teacher-diagnostic-attempts?classId=${classId}&assignmentId=${assignment.assignmentId}`)
  expect(overview.items.every(item => item.automaticallyMarked)).toBe(true)
  expect(overview.rows[0].items.map(item => item.screening.answerStatus)).toEqual(questions.map(question => question[5]))
  const after = await readServerProfile(request, pupil.studentId)
  for (const key of ['adaptive', 'mastery', 'problemLog', 'recentProblems', 'totalProblems']) expect(after[key]).toEqual(before[key])
  await openResults(page, { className: classId })
  const results = page.getByRole('region', { name: 'Resultat av screening', exact: true })
  await collectionSelect(results).selectOption(assignment.assignmentId)
  await expect(results.getByText('5 / 8', { exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('teacher-automatic-results.png'), fullPage: true })
  await student.goto('/'); await login(student, excluded)
  await expect(student.getByRole('button', { name: title, exact: true })).toHaveCount(0)
  await context.close()
})
