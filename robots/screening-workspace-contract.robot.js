import { test, expect } from '@playwright/test'
import { createPupil } from './lib/app.js'
import { createTeacher, teacherLogin } from './lib/teacher.js'
import { openDispatch, openResults, selectedCollection, collectionRows } from './lib/screening.js'

async function teacherApi(page, method, body) {
  return page.evaluate(async ({ method, body }) => {
    const response = await fetch('/api/teacher-diagnostic-assignments', { method,
      headers: { 'Content-Type': 'application/json', 'x-teacher-token': sessionStorage.getItem('mathapp_teacher_api_token') }, body: JSON.stringify(body) })
    if (!response.ok) throw Error(`Fixture request failed: ${response.status} ${await response.text()}`)
    return response.json()
  }, { method, body })
}

test('The overview filters status and recipients within a group, and results open for that same scope', async ({ page, request }, info) => {
  const tag = Math.random().toString(36).slice(2, 8), a = `scope-a-${tag}`, b = `scope-b-${tag}`
  const one = await createPupil(request, { name: 'UI Scope One', classId: a, className: 'Klass 6A' })
  const two = await createPupil(request, { name: 'UI Scope Two', classId: b, className: 'Klass 6B' })
  const teacher = await createTeacher(request, { classIds: [a, b], role: 'super_admin' })
  const group = (await (await request.post('/__robot/group', { data: { name: 'Grupp Eken', pupilIds: [two.studentId], teacherIds: [teacher.username] } })).json()).group
  await teacherLogin(page, teacher)
  const [first, second] = await Promise.all([[a, one], [b, two]].map(async ([classId, pupil]) => (await teacherApi(page, 'POST', {
    classId, studentIds: [pupil.studentId], titleSv: 'Taluppfattning – oktober', taskIds: ['add-no-carry-001']
  })).assignment))
  await teacherApi(page, 'PATCH', { classId: b, assignmentId: second.assignmentId, status: 'stopped' })
  const panel = await openDispatch(page, { startNew: false })
  await panel.getByRole('tab', { name: 'Utdelade', exact: true }).click()
  await expect(panel.getByRole('article', { name: 'Taluppfattning – oktober', exact: true })).toContainText('Hela Klass 6A · Hela Klass 6B')
  await page.screenshot({ path: info.outputPath('overview-landscape.png'), fullPage: true })
  await panel.getByRole('combobox', { name: 'Visa screeningar för', exact: true }).selectOption(`group:${group.id}`)
  const row = panel.getByRole('article', { name: 'Taluppfattning – oktober', exact: true })
  await expect(row).toContainText('Avslutad · Hela Klass 6B')
  await expect(row.getByText('0 av 1 inlämnade', { exact: true })).toBeVisible()
  const completionUrl = `**/api/teacher-diagnostic-attempts?classId=${b}&assignmentId=${second.assignmentId}`
  await page.route(completionUrl, route => route.fulfill({ json: { rows: [{ studentId: two.studentId, status: 'submitted' }] } }))
  await panel.getByRole('button', { name: 'Läs om', exact: true }).click()
  await expect(row.getByText('1 av 1 inlämnade', { exact: true })).toBeVisible()
  await page.unroute(completionUrl)
  await panel.getByRole('combobox', { name: 'Status', exact: true }).selectOption('active')
  await expect(row).toHaveCount(0)
  await panel.getByRole('combobox', { name: 'Status', exact: true }).selectOption('stopped')
  await row.getByText('Visa mottagare (1 elev)', { exact: true }).click()
  await expect(row).toContainText('UI Scope Two')
  await expect(row).not.toContainText('UI Scope One')
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.screenshot({ path: info.outputPath('overview-portrait.png'), fullPage: true })
  await row.getByRole('button', { name: 'Resultat och avslut', exact: true }).click()
  const results = page.getByRole('region', { name: 'Resultat av screening', exact: true })
  await expect(selectedCollection(results)).toHaveAttribute('data-collection-id', second.assignmentId)
  expect(first.assignmentId).not.toBe(second.assignmentId)
})

test('Saved content has its own library and opens without inheriting delivery recipients', async ({ page, request }, info) => {
  const classId = `workspace-${Date.now()}`
  await createPupil(request, { name: `Workspace ${classId}`, classId })
  await teacherLogin(page, await createTeacher(request, { classIds: [classId], role: 'super_admin' }))
  const panel = await openDispatch(page)
  await panel.getByRole('textbox', { name: 'Samlingens namn', exact: true }).fill('Material att återkomma till')
  await panel.getByRole('button', { name: 'Spara utkast', exact: true }).click()
  await expect(panel.getByRole('region', { name: 'Screeningutkast' }).getByRole('status')).toContainText('version 1')
  await panel.getByRole('tab', { name: 'Skapa ny', exact: true }).focus()
  await panel.getByRole('tab', { name: 'Skapa ny', exact: true }).press('ArrowRight')
  await expect(panel.getByRole('tab', { name: 'Utkast', exact: true })).toBeFocused()
  await expect(panel.getByRole('article', { name: 'Material att återkomma till', exact: true })).toBeVisible()
  await page.screenshot({ path: info.outputPath('material-library.png'), fullPage: true })
  const failDraftRead = route => route.abort()
  await page.route('**/api/teacher-diagnostic-assignments?resource=drafts&draftId=*', failDraftRead)
  await panel.getByRole('article', { name: 'Material att återkomma till', exact: true }).getByRole('button', { name: 'Öppna utkast', exact: true }).click()
  await expect(panel.getByRole('region', { name: 'Screeningutkast' }).getByRole('status')).toContainText(/fetch|server|nätverk/i)
  await expect(panel.getByRole('button', { name: 'Välj mottagare', exact: true })).toBeDisabled()
  await page.unroute('**/api/teacher-diagnostic-assignments?resource=drafts&draftId=*', failDraftRead)
  await panel.getByRole('combobox', { name: 'Sparade utkast', exact: true }).selectOption({ label: 'Material att återkomma till · version 1' })
  await expect(panel.getByRole('textbox', { name: 'Samlingens namn', exact: true })).toHaveValue('Material att återkomma till')
  await panel.getByRole('button', { name: 'Välj mottagare', exact: true }).click()
  await expect(panel.getByRole('region', { name: 'Mottagare', exact: true }).locator('[data-recipient-summary]')).toHaveText('Ingen mottagare vald.')
  await page.screenshot({ path: info.outputPath('recipients-empty.png'), fullPage: true })
  await page.getByRole('combobox', { name: 'Välj tema', exact: true }).selectOption({ label: 'Mörkt' })
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.screenshot({ path: info.outputPath('recipients-dark-portrait.png'), fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: info.outputPath('recipients-dark-narrow.png'), fullPage: true })
})

test('Question images and answer images use separate explicit insertion paths; answer mode never silently erases choices', async ({ page, request }, info) => {
  const classId = `image-roles-${Date.now()}`
  await createPupil(request, { name: `Workspace ${classId}`, classId })
  await teacherLogin(page, await createTeacher(request, { classIds: [classId], role: 'super_admin' }))
  const panel = await openDispatch(page)
  await panel.getByText('Lägg till bildfrågor', { exact: true }).click()
  await panel.getByRole('textbox', { name: 'Bildfrågans text', exact: true }).fill('Vilken figur hör ihop med frågebildens form?')
  const question = panel.getByRole('region', { name: 'Frågebild', exact: true })
  const answers = panel.getByRole('region', { name: 'Svarsalternativ', exact: true })
  await question.getByRole('button', { name: 'Lägg till frågebild', exact: true }).click()
  const picker = panel.getByRole('region', { name: 'Välj bild till frågan', exact: true })
  await picker.getByText('Välj ur figurbanken', { exact: true }).click()
  await picker.getByRole('button', { name: 'Lägg till Cirkel', exact: true }).click()
  await picker.getByRole('button', { name: 'Klar med bildval', exact: true }).click()
  await expect(question.getByRole('button', { name: 'Ta bort frågebild 1', exact: true })).toBeVisible()
  await expect(answers.getByRole('button', { name: 'Ta bort alternativ 1', exact: true })).toHaveCount(0)
  await answers.getByRole('button', { name: 'Lägg till bildalternativ', exact: true }).click()
  const answerPicker = panel.getByRole('region', { name: 'Välj bild till svarsalternativ', exact: true })
  await answerPicker.getByText('Välj ur figurbanken', { exact: true }).click()
  await answerPicker.getByRole('button', { name: 'Lägg till Kvadrat', exact: true }).click()
  await answerPicker.getByRole('button', { name: 'Lägg till Cirkel', exact: true }).click()
  await answerPicker.getByRole('button', { name: 'Klar med bildval', exact: true }).click()
  await answers.getByRole('checkbox', { name: 'Rätt alternativ 2', exact: true }).check()
  const mode = panel.getByRole('combobox', { name: 'Bildfrågans svarssätt', exact: true })
  await mode.selectOption('multiple')
  await expect(answers.getByRole('checkbox', { name: 'Rätt alternativ 2', exact: true })).toBeChecked()
  page.once('dialog', dialog => dialog.dismiss())
  await mode.selectOption('name')
  await expect(mode).toHaveValue('multiple')
  await page.screenshot({ path: info.outputPath('image-roles-landscape.png'), fullPage: true })
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.screenshot({ path: info.outputPath('image-roles-portrait.png'), fullPage: true })
})

test('R1: results list the screenings that reached the picked pupils, not the whole class', async ({ page, request }) => {
  const tag = Math.random().toString(36).slice(2, 8), classId = `list-${tag}`, className = `Listklass ${tag}`
  const one = await createPupil(request, { name: 'UI List One', classId, className })
  const two = await createPupil(request, { name: 'UI List Two', classId, className })
  await teacherLogin(page, await createTeacher(request, { classIds: [classId], role: 'super_admin' }))
  for (const [pupil, titleSv] of [[one, 'Bara ettan'], [two, 'Bara tvåan']]) {
    await teacherApi(page, 'POST', { classId, studentIds: [pupil.studentId], titleSv, taskIds: ['add-no-carry-001'] })
  }
  const results = await openResults(page, { className })
  await expect(collectionRows(results)).toHaveCount(2)
  await page.locator('[data-recipient-picker]').getByRole('button', { name: className, exact: true }).click()
  await openResults(page, { pupilName: 'UI List One' })
  await expect(collectionRows(results)).toHaveCount(1)
  await expect(collectionRows(results).first()).toContainText('Bara ettan')
  await expect(collectionRows(results).first()).toContainText('UI List One (')
})
