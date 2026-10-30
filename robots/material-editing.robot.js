import { test, expect } from '@playwright/test'
import { createPupil } from './lib/app.js'
import { createTeacher, teacherLogin } from './lib/teacher.js'

test('Question editing preserves mixed order and unfinished work, and requires approval of the new exact version', async ({ page, request }, info) => {
  test.skip(process.env.ROBOT_DEV !== '1', 'Cookie review requires the local development origin policy.')
  const classId = `edit-${Math.random().toString(36).slice(2, 7)}`
  await createPupil(request, { classId, name: 'Review Edit' })
  const teacher = await createTeacher(request, { classIds: [classId], role: 'super_admin' })
  await teacherLogin(page, teacher)
  const origin = new URL(page.url()).origin
  const post = async data => {
    const response = await page.request.post('/api/teacher-material', { headers: { Origin: origin }, data })
    const body = await response.json()
    expect(response.status(), JSON.stringify(body)).toBe(200)
    return body
  }
  const audience = await (await page.request.get(`/api/students?resource=audience&targetType=class&targetId=${classId}`)).json()
  const customTasks = [
    { promptSv: 'Räkna 6 + 7.', answerKey: { format: 'number', expected: [13] }, gridEnabled: true, drawingEnabled: true },
    { promptSv: 'Förklara hur du kontrollerar ditt svar.', gridEnabled: true, drawingEnabled: true },
    { promptSv: 'Räkna 8 + 8.', answerKey: { format: 'number', expected: [16] }, gridEnabled: true, drawingEnabled: false }
  ]
  const material = { schemaVersion: 1, kind: 'screening', mode: 'general', titleSv: 'Bearbeta frågor',
    goalSv: 'Pröva addition och elevens kontroll.', instructionSv: 'Behåll frågornas ordning.',
    sourceMaterials: [{ label: 'Beställning', excerpt: 'Addition med förklaring.' }],
    audience: { targetType: 'class', targetId: classId, rosterRevision: audience.rosterRevision },
    content: { taskIds: ['sub-through-zero-001'], customTasks } }
  const preview = await post({ action: 'preview', material })
  const saved = await post({ action: 'save', material, expectedRevision: 0, expectedContentRevision: preview.contentRevision, requestId: 'editing-initial-save' })
  await page.goto(saved.reviewPath)
  await page.getByRole('checkbox', { name: /Jag har granskat/ }).check()
  await page.getByRole('button', { name: 'Godkänn version 1', exact: true }).click()
  await expect(page.getByText('Version 1 är godkänd.', { exact: true })).toBeVisible()
  await page.getByText('Bearbeta screeningfrågor', { exact: true }).click()
  const row = page.getByRole('group', { name: 'Egen fråga 1', exact: true })
  await row.getByText('Egna frågor med automatisk rättning', { exact: true }).click()
  await row.getByRole('button', { name: 'Redigera fråga 1', exact: true }).click()
  await row.getByRole('textbox', { name: 'Egen fråga', exact: true }).fill('Räkna 6 + 8.')
  await row.getByRole('textbox', { name: 'Facit', exact: true }).fill('14')
  await expect(page.getByRole('button', { name: 'Förhandsvisa ändring', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: /Dela ut till/ })).toBeDisabled()
  await row.getByRole('button', { name: 'Spara ändrad fråga', exact: true }).click()
  await page.getByRole('button', { name: 'Förhandsvisa ändring', exact: true }).click()
  await page.getByRole('button', { name: 'Spara som ny version', exact: true }).click()
  await expect(page.getByLabel('Utkastversion')).toHaveValue('2')
  await expect(page.getByText('Version 2 väntar på granskning.', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /Dela ut till/ })).toBeDisabled()
  const state = await (await page.request.get(`/api/teacher-material?draftId=${saved.draftId}`)).json()
  expect(state.draft.versions[1].input.content.customTasks).toEqual([
    { ...customTasks[0], promptSv: 'Räkna 6 + 8.', answerKey: { format: 'number', expected: [14] } }, ...customTasks.slice(1)
  ])
  expect(state.draft.versions[1].input.sourceMaterials).toEqual(material.sourceMaterials)
  expect(state.draft.approvals.map(item => item.version)).toEqual([1])
  await page.getByText('Bearbeta screeningfrågor', { exact: true }).click()
  const image = page.getByRole('group', { name: 'Ny bildfråga', exact: true })
  await image.getByText('Lägg till bildfrågor', { exact: true }).click()
  await image.getByRole('textbox', { name: 'Bildfrågans text', exact: true }).fill('Vad heter figuren?')
  await image.getByRole('combobox', { name: /^Bildfrågans svarssätt/u }).selectOption('text')
  await image.getByRole('button', { name: 'Lägg till frågebild', exact: true }).click()
  await image.getByText('Välj ur figurbanken', { exact: true }).click()
  await image.getByRole('button', { name: 'Lägg till Cirkel', exact: true }).click()
  await image.getByRole('button', { name: 'Lägg till bildfrågan i samlingen', exact: true }).click()
  await page.getByRole('combobox', { name: 'Diagnospaket', exact: true }).selectOption({ label: 'Skriftlig addition · 6 uppgifter' })
  await page.getByRole('button', { name: 'Förhandsvisa ändring', exact: true }).click()
  await page.getByRole('button', { name: 'Spara som ny version', exact: true }).click()
  await expect(page.getByLabel('Utkastversion')).toHaveValue('3')
  const withImage = await (await page.request.get(`/api/teacher-material?draftId=${saved.draftId}`)).json()
  const editedContent = withImage.draft.versions[2].input.content
  expect(editedContent.customTasks.slice(0, 3)).toEqual(state.draft.versions[1].input.content.customTasks)
  expect(editedContent.customTasks[3]).toMatchObject({ promptSv: 'Vad heter figuren?', responseMode: 'text', images: [{ source: 'bank' }] })
  expect(editedContent.taskIds).toHaveLength(6)
  expect(withImage.draft.versions[2].material.content.items).toHaveLength(10)
  await page.getByText('Bearbeta screeningfrågor', { exact: true }).click()
  const second = page.getByRole('group', { name: 'Egen fråga 1', exact: true })
  await second.getByText('Egna frågor med automatisk rättning', { exact: true }).click()
  await second.getByRole('button', { name: 'Redigera fråga 1', exact: true }).click()
  await second.getByRole('textbox', { name: 'Egen fråga', exact: true }).fill('Halvfärdig fråga finns kvar')
  await page.getByLabel('Utkastversion').selectOption('1')
  await page.getByLabel('Utkastversion').selectOption('3')
  await page.getByText('Bearbeta screeningfrågor', { exact: true }).click()
  await second.getByText('Egna frågor med automatisk rättning', { exact: true }).click()
  await expect(second.getByRole('textbox', { name: 'Egen fråga', exact: true })).toHaveValue('Halvfärdig fråga finns kvar')
  await expect(page.getByRole('checkbox', { name: /Jag har granskat/ })).toBeDisabled()
  await page.screenshot({ path: info.outputPath('material-editing-landscape.png'), fullPage: true })
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.screenshot({ path: info.outputPath('material-editing-portrait.png'), fullPage: true })
  await page.getByRole('button', { name: 'Avbryt pågående frågeutkast', exact: true }).click()
  await expect(page.getByRole('checkbox', { name: /Jag har granskat/ })).toBeEnabled()
  await page.getByRole('checkbox', { name: /Jag har granskat/ }).check()
  await page.getByRole('button', { name: 'Godkänn version 3', exact: true }).click()
  await expect(page.getByText('Version 3 är godkänd.', { exact: true })).toBeVisible()
  expect((await (await page.request.get(`/api/teacher-diagnostic-assignments?classId=${classId}`)).json()).assignments).toEqual([])
})
