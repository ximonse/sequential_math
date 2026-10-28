import { test, expect } from '@playwright/test'
import { createTeacher, teacherLogin } from './lib/teacher.js'
import { openDispatch } from './lib/screening.js'

test('R2: abandoning a screening draft asks once and never warns again for the discarded draft', async ({ page, request }) => {
  await teacherLogin(page, await createTeacher(request, { classIds: [], role: 'super_admin' }))
  const panel = await openDispatch(page)
  await panel.getByRole('textbox', { name: 'Samlingens namn', exact: true }).fill('Behåll tills jag väljer att lämna')
  let dialogs = 0
  page.on('dialog', async dialog => {
    dialogs += 1
    if (dialogs === 1) await dialog.dismiss()
    else await dialog.accept()
  })
  const nav = page.getByRole('navigation', { name: 'Lärarvy', exact: true })
  await nav.getByRole('button', { name: /^Statistik & stöd/u }).click()
  await expect(panel.getByRole('textbox', { name: 'Samlingens namn', exact: true })).toHaveValue('Behåll tills jag väljer att lämna')
  await nav.getByRole('button', { name: /^Statistik & stöd/u }).click()
  await expect(panel).toHaveCount(0)
  await nav.getByRole('button', { name: /^Framsteg/u }).click()
  expect(dialogs).toBe(2)
})
