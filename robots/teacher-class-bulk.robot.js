// An administrator gives one teacher several classes in a single save, and can
// take one back again, without opening each class. Other teachers on the same
// classes stay as they were.
import { test, expect } from '@playwright/test'
import { createPupil } from './lib/app.js'
import { teacherLogin } from './lib/teacher.js'

test('Administrator assigns several classes to one teacher in one save', async ({ page, request }, testInfo) => {
  const tag = Math.random().toString(36).slice(2, 8)
  const names = [`Bulk A ${tag}`, `Bulk B ${tag}`, `Bulk C ${tag}`]
  const classIds = names.map((_, index) => `bulk-${index}-${tag}`)
  for (const [index, className] of names.entries()) {
    await createPupil(request, { name: `Bulkelev ${index} ${tag}`, classId: classIds[index], className })
  }
  const admin = await (await request.post('/__robot/teacher', { data: { id: `bulk-admin-${tag}`, classIds, role: 'super_admin' } })).json()
  const target = await (await request.post('/__robot/teacher', { data: { id: `bulk-lararen-${tag}`, classIds: [] } })).json()
  await teacherLogin(page, admin)
  await page.goto('/teacher/admin')
  await page.getByRole('tab', { name: 'Lärare och skolor', exact: true }).click()

  const openEditor = async () => {
    await page.locator('tr', { hasText: target.username }).getByRole('button', { name: 'Redigera' }).click()
    return page.locator('tr', { hasText: 'Klassansvar' })
  }
  let editor = await openEditor()
  for (const name of names) await editor.getByLabel(name).check()
  await page.screenshot({ path: testInfo.outputPath('3-klassansvar.png'), fullPage: true })
  await editor.getByRole('button', { name: 'Spara', exact: true }).click()
  await expect(page.getByText(/Konto uppdaterat och klassansvar sparat \(3 klasser ändrade\)/)).toBeVisible()

  await page.reload()
  await page.getByRole('tab', { name: 'Lärare och skolor', exact: true }).click()
  editor = await openEditor()
  for (const name of names) await expect(editor.getByLabel(name)).toBeChecked()

  await editor.getByLabel(names[1]).uncheck()
  await editor.getByRole('button', { name: 'Spara', exact: true }).click()
  await expect(page.getByText(/1 klasser ändrade/)).toBeVisible()
  await page.reload()
  await page.getByRole('tab', { name: 'Lärare och skolor', exact: true }).click()
  editor = await openEditor()
  await expect(editor.getByLabel(names[0])).toBeChecked()
  await expect(editor.getByLabel(names[1])).not.toBeChecked()
  await expect(editor.getByLabel(names[2])).toBeChecked()
})

test('A class that cannot be saved is named next to the Save button and unticked', async ({ page, request }) => {
  const tag = Math.random().toString(36).slice(2, 8)
  const names = [`Fail A ${tag}`, `Fail B ${tag}`]
  const classIds = names.map((_, index) => `fail-${index}-${tag}`)
  for (const [index, className] of names.entries()) {
    await createPupil(request, { name: `Failelev ${index} ${tag}`, classId: classIds[index], className })
  }
  const admin = await (await request.post('/__robot/teacher', { data: { id: `fail-admin-${tag}`, classIds, role: 'super_admin' } })).json()
  const target = await (await request.post('/__robot/teacher', { data: { id: `fail-lararen-${tag}`, classIds: [] } })).json()
  await teacherLogin(page, admin)
  await page.goto('/teacher/admin')
  await page.getByRole('tab', { name: 'Lärare och skolor', exact: true }).click()
  // The server refuses the second class, the way it does for a class outside the administrator's reach.
  await page.route(`**/api/admin/classes/${classIds[1]}`, route => route.request().method() === 'PUT'
    ? route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: 'Klassen ligger utanför din behörighet.' }) })
    : route.continue())

  await page.locator('tr', { hasText: target.username }).getByRole('button', { name: 'Redigera' }).click()
  const editor = page.locator('tr', { hasText: 'Klassansvar' })
  for (const name of names) await editor.getByLabel(name).check()
  await editor.getByRole('button', { name: 'Spara', exact: true }).click()

  await expect(editor.getByRole('alert')).toContainText(`${names[1]} (Klassen ligger utanför din behörighet.)`)
  await expect(editor.getByLabel(names[0])).toBeChecked()
  await expect(editor.getByLabel(names[1])).not.toBeChecked()
})
