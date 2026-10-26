import { test, expect } from '@playwright/test'
import { createPupil, login } from './lib/app.js'
import { createTeacher, openTab, teacherLogin } from './lib/teacher.js'

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
  await openTab(page, 'Screening')
  const panel = page.getByRole('heading', { name: 'Screening till elev eller klass' }).locator('..')
  await panel.getByRole('button', { name: 'Resultat', exact: true }).click()
  await expect(panel.getByText('Välj en klass ovan för att se utdelade samlingar och elevernas svar.', { exact: true })).toBeVisible()
  await panel.getByRole('combobox', { name: 'Klass', exact: true }).selectOption(targetClass)
  await expect(panel.getByText(/Det finns inga utdelade samlingar i den här klassen ännu/)).toBeVisible()
  await panel.getByRole('combobox', { name: 'Klass', exact: true }).selectOption(sourceClass)
  await expect(panel.getByRole('combobox', { name: 'Uppdrag att gå igenom' }).locator('option')).toContainText(['Välj uppdrag', 'Min samling'])
  await panel.getByRole('button', { name: 'Dela ut', exact: true }).click()
  await panel.getByRole('combobox', { name: 'Återanvänd samling', exact: true }).selectOption(source.assignmentId)
  await expect(panel.getByRole('region', { name: 'Samling att återanvända' }).locator('li')).toHaveCount(3)
  const picker = page.locator('[data-recipient-picker]')
  const send = panel.getByRole('button', { name: 'Ge till valda mottagare (1 screening)', exact: true })
  const clearPicks = () => picker.getByRole('button', { name: 'Rensa', exact: true }).click()
  const deliver = async title => {
    await panel.getByRole('textbox', { name: 'Samlingens namn' }).fill(title)
    await expect(send).toBeEnabled()
    await send.click()
    await expect(panel.getByText(/^Screening skapad för /)).toBeVisible()
    const assignments = (await teacherRequest(page, `/api/teacher-diagnostic-assignments?classId=${targetClass}`)).assignments
    const copy = assignments.find(item => item.titleSv === title)
    expect(copy.items.map(item => item.taskSnapshot)).toEqual(source.items.map(item => item.taskSnapshot))
    expect(copy.items.map(item => item.assignmentItemId)).not.toEqual(source.items.map(item => item.assignmentItemId))
    return copy
  }
  await picker.getByRole('button', { name: `Grupp: ${group.name}`, exact: true }).click()
  expect((await deliver('Till gruppen')).studentIds).toEqual([first.studentId])
  await clearPicks()
  await picker.getByRole('button', { name: `Ny klass ${tag}`, exact: true }).click()
  expect(new Set((await deliver('Till klassen')).studentIds)).toEqual(new Set([first.studentId, second.studentId]))
  await clearPicks()
  await picker.getByRole('searchbox', { name: 'Sök elev' }).fill('Reuse Two')
  await picker.getByRole('button', { name: 'Lägg till Reuse Two', exact: true }).click()
  expect((await deliver('Till en elev')).studentIds).toEqual([second.studentId])
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
