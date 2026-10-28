import { test, expect } from '@playwright/test'
import { createPupil, login } from './lib/app.js'
import { createTeacher, teacherLogin, sendScreening } from './lib/teacher.js'
import { collectionSelect, openDispatch, openResults } from './lib/screening.js'

async function teacherRequest(page, url, method = 'GET', body) {
  return page.evaluate(async ({ url, method, body }) => {
    const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json',
      'x-teacher-token': sessionStorage.getItem('mathapp_teacher_api_token') },
      ...(body ? { body: JSON.stringify(body) } : {}) })
    if (!response.ok) throw new Error(`Teacher request failed: ${response.status} ${await response.text()}`)
    return response.json()
  }, { url, method, body })
}

test('A stopped collection can be reused for a group, another class and one pupil, with separate results', async ({ page, request, browser }, testInfo) => {
  const tag = Math.random().toString(36).slice(2, 8)
  const sourceClass = `reuse-source-${tag}`, targetClass = `reuse-target-${tag}`
  const sourcePupil = await createPupil(request, { name: 'Reuse Source', classId: sourceClass })
  const first = await createPupil(request, { name: 'Reuse One', classId: targetClass, className: `Ny klass ${tag}` })
  const second = await createPupil(request, { name: 'Reuse Two', classId: targetClass })
  const teacher = await createTeacher(request, { classIds: [sourceClass, targetClass], role: 'super_admin' })
  const group = (await (await request.post('/__robot/group', { data: {
    name: `Återbruk ${tag}`, pupilIds: [first.studentId], teacherIds: [teacher.username]
  } })).json()).group
  await teacherLogin(page, teacher)
  const source = (await teacherRequest(page, '/api/teacher-diagnostic-assignments', 'POST', {
    classId: sourceClass, studentIds: [sourcePupil.studentId], titleSv: 'Min samling',
    taskIds: ['add-no-carry-001'], itemOptions: { 'add-no-carry-001': { answerType: 'text', gridEnabled: false, drawingEnabled: true } },
    customTasks: [{ promptSv: 'Förklara 6//2.', gridEnabled: true }, { promptSv: 'Rita din metod.', drawingEnabled: true }]
  })).assignment
  const pupilContext = await browser.newContext()
  const student = await pupilContext.newPage()
  await login(student, sourcePupil)
  await student.getByRole('button', { name: 'Min samling', exact: true }).click()
  await student.locator('#diagnostic-answer').fill('Mitt tidigare svar')
  await expect(student.getByText('Alla skickade ändringar är sparade på servern.')).toBeVisible()
  await teacherRequest(page, '/api/teacher-diagnostic-assignments', 'PATCH', {
    classId: sourceClass, assignmentId: source.assignmentId, status: 'stopped'
  })
  const results = await openResults(page)
  await expect(results.getByText('Välj mottagare överst för att se resultat.', { exact: true })).toBeVisible()
  await openResults(page, { className: `Ny klass ${tag}` })
  await expect(results.getByText(/Det finns inga utdelade samlingar till de valda mottagarna ännu/)).toBeVisible()
  await openResults(page, { className: `Ny klass ${tag}` })
  await openResults(page, { className: sourceClass })
  await expect(collectionSelect(results).locator('option')).toContainText(['Välj samling', 'Min samling'])
  const panel = await openDispatch(page, { startNew: false })
  const deliver = async (title, target) => {
    const close = panel.getByRole('button', { name: 'Till utdelade screeningar', exact: true })
    if (await close.isVisible()) await close.click()
    await panel.getByRole('button', { name: 'Dela ut screening', exact: true }).click()
    await panel.getByRole('button', { name: 'Återanvänd', exact: false }).click()
    await panel.getByRole('combobox', { name: 'Klass att hämta samlingar från', exact: true }).selectOption(sourceClass)
    await panel.getByRole('combobox', { name: 'Återanvänd samling', exact: true }).selectOption(source.assignmentId)
    await panel.getByText('Visa frågor och arbetsytor', { exact: true }).click()
    await expect(panel.getByText('Visa frågor och arbetsytor', { exact: true }).locator('..').locator('ol > li')).toHaveCount(3)
    await panel.getByRole('textbox', { name: 'Samlingens namn' }).fill(title)
    await sendScreening(page, target)
    const assignments = (await teacherRequest(page, `/api/teacher-diagnostic-assignments?classId=${targetClass}`)).assignments
    const copy = assignments.find(item => item.titleSv === title)
    expect(copy.items.map(item => item.taskSnapshot)).toEqual(source.items.map(item => item.taskSnapshot))
    expect(copy.items.map(item => item.assignmentItemId)).not.toEqual(source.items.map(item => item.assignmentItemId))
    return copy
  }
  expect((await deliver('Till gruppen', { groupName: group.name })).studentIds).toEqual([first.studentId])
  expect(new Set((await deliver('Till klassen', { className: `Ny klass ${tag}` })).studentIds)).toEqual(new Set([first.studentId, second.studentId]))
  expect((await deliver('Till en elev', { pupilName: 'Reuse Two' })).studentIds).toEqual([second.studentId])
  await page.screenshot({ path: testInfo.outputPath('reuse-collection.png'), fullPage: true })
  const stopped = (await teacherRequest(page, `/api/teacher-diagnostic-assignments?classId=${sourceClass}`)).assignments[0]
  expect(stopped.status).toBe('stopped')
  expect(stopped.items).toEqual(source.items)
  // Original submissions remain in the original collection, not in the copy.
  const query = new URLSearchParams({ classId: sourceClass, assignmentId: source.assignmentId, studentId: sourcePupil.studentId })
  const attempts = await teacherRequest(page, `/api/teacher-diagnostic-attempts?${query}`)
  query.set('attemptId', attempts.attempts[0].attemptId)
  const detail = await teacherRequest(page, `/api/teacher-diagnostic-attempts?${query}`)
  expect(detail.snapshot.answer).toBe('Mitt tidigare svar')
  await pupilContext.close()
  const targetContext = await browser.newContext()
  const targetStudent = await targetContext.newPage()
  await login(targetStudent, second)
  await expect(targetStudent.getByRole('button', { name: 'Till gruppen', exact: true })).toHaveCount(0)
  await targetStudent.getByRole('button', { name: 'Till en elev', exact: true }).click()
  await expect(targetStudent.locator('#diagnostic-answer')).toHaveValue('')
  await targetContext.close()
})
