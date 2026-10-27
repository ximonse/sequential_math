import { test, expect } from '@playwright/test'
import { teacherLogin } from './lib/teacher.js'
import { openDispatch } from './lib/screening.js'

test('R2: removing an added image question preserves a different unfinished draft', async ({ page, request }) => {
  const classId = `image-draft-${Math.random().toString(36).slice(2, 8)}`
  await request.post('/__robot/seed', { data: { pupils: ['Image Draft'], classId }, timeout: 60000 })
  const teacher = await (await request.post('/__robot/teacher', { data: { id: `admin-${classId}`, classIds: [classId], role: 'super_admin' } })).json()
  await teacherLogin(page, teacher)
  const panel = await openDispatch(page)
  await panel.getByText('Lägg till bildfrågor', { exact: true }).click()
  const prompt = panel.getByRole('textbox', { name: 'Bildfrågans text', exact: true })
  await prompt.fill('Vad heter figuren?')
  await panel.getByRole('combobox', { name: /^Bildfrågans svarssätt/u }).selectOption('text')
  await panel.getByText('Välj ur figurbanken', { exact: true }).click()
  await panel.getByRole('button', { name: 'Lägg till Cirkel', exact: true }).click()
  await panel.getByRole('button', { name: 'Lägg till bildfrågan i samlingen', exact: true }).click()
  await prompt.fill('Mitt pågående utkast ska ligga kvar.')
  await panel.getByRole('button', { name: 'Ta bort bildfråga 1', exact: true }).click()
  await expect(prompt).toHaveValue('Mitt pågående utkast ska ligga kvar.')
})
