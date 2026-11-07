// Ticking several screenings acts on exactly those (R1, R3): archive keeps the
// answers and hides the screening, delete removes it for good, and private drafts
// can be deleted several at a time. Every action asks first and gives a receipt.
import { test, expect } from '@playwright/test'
import { createPupil, login } from './lib/app.js'
import { createTeacher, teacherLogin } from './lib/teacher.js'
import { openDispatch } from './lib/screening.js'

async function teacherApi(page, method, body, query = '') {
  return page.evaluate(async ({ method, body, query }) => {
    const response = await fetch(`/api/teacher-diagnostic-assignments${query}`, { method,
      headers: { 'Content-Type': 'application/json', 'x-teacher-token': sessionStorage.getItem('mathapp_teacher_api_token') }, ...(body ? { body: JSON.stringify(body) } : {}) })
    if (!response.ok) throw Error(`Fixture request failed: ${response.status} ${await response.text()}`)
    return response.json()
  }, { method, body, query })
}

test('Several screenings and drafts can be archived, restored and deleted at once, with answers kept until deletion', async ({ page, request, browser }, info) => {
  const tag = Math.random().toString(36).slice(2, 8), classId = `bulk-${tag}`
  const one = await createPupil(request, { name: 'Bulk One', classId, className: `Bulkklass ${tag}` })
  const two = await createPupil(request, { name: 'Bulk Two', classId, className: `Bulkklass ${tag}` })
  const teacher = await createTeacher(request, { classIds: [classId], role: 'super_admin' })
  await teacherLogin(page, teacher)
  const created = []
  for (const titleSv of [`Bulk A ${tag}`, `Bulk B ${tag}`, `Bulk C ${tag}`]) {
    created.push((await teacherApi(page, 'POST', { classId, studentIds: [one.studentId, two.studentId], titleSv, taskIds: ['add-no-carry-001'] })).assignment)
  }
  // One pupil answers screening A, so archiving can be shown to keep the answer.
  const pupil = await (await browser.newContext()).newPage()
  await login(pupil, one)
  await pupil.getByRole('button', { name: `Bulk A ${tag}`, exact: true }).click()
  await pupil.locator('input[data-cell="0:0"]').press('7')
  await expect(pupil.getByText('Alla skickade ändringar är sparade på servern.')).toBeVisible()

  const panel = await openDispatch(page, { startNew: false })
  await panel.getByRole('tab', { name: 'Utdelade', exact: true }).click()
  const row = title => panel.getByRole('article', { name: title, exact: true })
  await expect(row(`Bulk A ${tag}`)).toContainText(`Hela Bulkklass ${tag}`)
  const dialogs = []
  page.on('dialog', dialog => { dialogs.push(dialog.message()); void dialog.accept() })
  await row(`Bulk A ${tag}`).getByRole('checkbox').check()
  await row(`Bulk B ${tag}`).getByRole('checkbox').check()
  const bar = panel.getByRole('toolbar', { name: 'Åtgärder för markerade' })
  await expect(bar).toContainText('2 markerade')
  await page.screenshot({ path: info.outputPath('1-markerade.png'), fullPage: true })
  await bar.getByRole('button', { name: 'Arkivera …', exact: true }).click()
  await expect(panel.getByRole('status').filter({ hasText: '2 arkiverade.' })).toBeVisible()
  expect(dialogs.at(-1)).toContain('Elevsvaren finns kvar')
  await expect(row(`Bulk A ${tag}`)).toHaveCount(0)
  await expect(row(`Bulk C ${tag}`)).toBeVisible()
  // Archiving stopped the active screenings and kept the pupil's answer.
  const listed = (await teacherApi(page, 'GET', null, `?classId=${classId}`)).assignments
  expect(listed.filter(item => item.archivedAt).map(item => item.status)).toEqual(['stopped', 'stopped'])
  const attempts = await page.evaluate(async ({ classId, assignmentId }) => (await (await fetch(`/api/teacher-diagnostic-attempts?classId=${classId}&assignmentId=${assignmentId}`,
    { headers: { 'x-teacher-token': sessionStorage.getItem('mathapp_teacher_api_token') } })).json()).rows, { classId, assignmentId: created[0].assignmentId })
  expect(attempts.some(item => item.studentId === one.studentId && item.status === 'submitted')).toBe(true)

  await panel.getByRole('combobox', { name: 'Status', exact: true }).selectOption('archived')
  await expect(row(`Bulk A ${tag}`)).toContainText('Arkiverad')
  await row(`Bulk B ${tag}`).getByRole('checkbox').check()
  await bar.getByRole('button', { name: 'Återställ', exact: true }).click()
  await expect(panel.getByRole('status').filter({ hasText: '1 återställda.' })).toBeVisible()
  await row(`Bulk A ${tag}`).getByRole('checkbox').check()
  await bar.getByRole('button', { name: 'Radera …', exact: true }).click()
  await expect(panel.getByRole('status').filter({ hasText: '1 raderade.' })).toBeVisible()
  expect(dialogs.at(-1)).toContain('kan inte återställas')
  const after = (await teacherApi(page, 'GET', null, `?classId=${classId}`)).assignments
  expect(after.map(item => item.titleSv).sort()).toEqual([`Bulk B ${tag}`, `Bulk C ${tag}`])
  expect(after.find(item => item.titleSv === `Bulk B ${tag}`).archivedAt).toBeUndefined()
  await expect(pupil.reload().then(() => pupil.getByRole('button', { name: `Bulk A ${tag}`, exact: true }))).resolves.toBeTruthy()
  await expect(pupil.getByRole('button', { name: `Bulk A ${tag}`, exact: true })).toHaveCount(0)

  // Two private drafts are deleted together; nothing is handed out.
  const drafts = page.getByRole('region', { name: 'Screeningutkast', exact: true })
  for (const title of [`Utkast X ${tag}`, `Utkast Y ${tag}`]) {
    await openDispatch(page)
    await drafts.getByRole('button', { name: 'Nytt utkast', exact: true }).click()
    const discard = drafts.getByRole('button', { name: 'Öppna utan att spara', exact: true })
    if (await discard.isVisible()) await discard.click()
    await panel.getByRole('textbox', { name: 'Samlingens namn', exact: true }).fill(title)
    await drafts.getByRole('button', { name: 'Spara utkast', exact: true }).click()
    await expect(drafts.getByRole('status')).toContainText('version 1')
  }
  await panel.getByRole('tab', { name: 'Utkast', exact: true }).click()
  const library = panel.getByRole('region', { name: 'Utkast', exact: true })
  await library.getByText('Markera alla utkast', { exact: true }).click()
  await library.getByRole('toolbar', { name: 'Åtgärder för markerade' }).getByRole('button', { name: 'Radera …', exact: true }).click()
  await expect(library.getByRole('status').filter({ hasText: '2 utkast raderade.' })).toBeVisible()
  await expect(library.getByRole('article', { name: `Utkast X ${tag}`, exact: true })).toHaveCount(0)
  expect((await teacherApi(page, 'GET', null, '?resource=drafts')).drafts).toEqual([])
  expect((await teacherApi(page, 'GET', null, `?classId=${classId}`)).assignments).toHaveLength(2)
})
