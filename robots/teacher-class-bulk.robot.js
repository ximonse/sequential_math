// An administrator gives one teacher several classes in a single save, and can
// take one back again, without opening each class. Other teachers on the same
// classes stay as they were.
import { test, expect } from '@playwright/test'
import { createPupil } from './lib/app.js'
import { teacherLogin } from './lib/teacher.js'

test('Administrator assigns several classes to one teacher in one save', async ({ page, request }) => {
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
