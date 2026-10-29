import { test, expect } from '@playwright/test'
import { createPupil } from './lib/app.js'
import { createTeacher, teacherLogin } from './lib/teacher.js'
import { openDispatch } from './lib/screening.js'
import { emptyScreeningDraft } from '../src/domains/arithmetic/screeningDraft.js'

test('Saved API material is discoverable with manual drafts, opens exact versions and protects unsaved work and account scope', async ({ page, request }, info) => {
  const classId = `library-${Math.random().toString(36).slice(2, 8)}`
  await createPupil(request, { classId, name: 'Library Pupil' })
  const teacher = await createTeacher(request, { classIds: [classId], role: 'super_admin' })
  const token = (await (await request.post('/api/teacher-login', { data: teacher })).json()).token
  const headers = { 'x-teacher-token': token }
  const audience = await (await request.get(`/api/students?resource=audience&targetType=class&targetId=${classId}`, { headers })).json()
  const input = { schemaVersion: 1, kind: 'practice', mode: 'general', titleSv: 'Sparat MCP-material',
    goalSv: 'Öva tabell 7', instructionSv: 'Privat beställning ska inte visas i listan.',
    audience: { targetType: 'class', targetId: classId, rosterRevision: audience.rosterRevision },
    content: { kind: 'table', tables: [7], targetCount: 8 } }
  const save = async (material, draftId, expectedRevision, requestId) => {
    const preview = await (await request.post('/api/teacher-material', { headers, data: { action: 'preview', material } })).json()
    const response = await request.post('/api/teacher-material', { headers, data: { action: 'save', material,
      draftId, expectedRevision, expectedContentRevision: preview.contentRevision, requestId } })
    const data = await response.json()
    expect(response.status(), JSON.stringify(data)).toBe(200)
    return data
  }
  const first = await save(input, undefined, 0, 'library-first-save')
  const revised = await save({ ...input, titleSv: 'Sparat MCP-material, reviderat' }, first.draftId, 1, 'library-revised-save')
  const manual = await request.post('/api/teacher-diagnostic-assignments?resource=drafts', { headers,
    data: { action: 'save_draft', expectedRevision: 0, requestId: 'library-manual-save', content: { ...emptyScreeningDraft(), titleSv: 'Manuellt screeningutkast' } } })
  expect(manual.status()).toBe(200)
  await teacherLogin(page, teacher)
  const panel = await openDispatch(page, { startNew: false })
  await panel.getByRole('tab', { name: 'Materialbibliotek', exact: true }).click()
  const row = panel.getByRole('article', { name: 'Sparat MCP-material, reviderat', exact: true })
  await expect(row).toBeVisible()
  await expect(row).toContainText('version 2')
  await expect(panel.getByRole('article', { name: 'Manuellt screeningutkast', exact: true })).toBeVisible()
  await page.screenshot({ path: info.outputPath('material-library-landscape.png'), fullPage: true })
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.screenshot({ path: info.outputPath('material-library-portrait.png'), fullPage: true })
  await panel.getByRole('searchbox', { name: 'Sök material', exact: true }).fill('reviderat')
  await expect(row).toBeVisible()
  await expect(panel.getByRole('article', { name: 'Manuellt screeningutkast', exact: true })).toHaveCount(0)
  const reviewUrl = new URL(revised.reviewPath, page.url()).href
  await row.getByRole('button', { name: 'Öppna granskning', exact: true }).click()
  await expect(page).toHaveURL(reviewUrl)
  await expect(page.getByLabel('Utkastversion')).toHaveValue('2')
  await expect(page.getByRole('button', { name: /Dela ut till/ })).toBeDisabled()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Sparat MCP-material, reviderat', exact: true })).toBeVisible()
  await page.getByLabel('Undervisningsmål', { exact: true }).fill('Osparad materialtext finns kvar')
  page.once('dialog', dialog => dialog.dismiss())
  await page.getByRole('link', { name: '← Lärarvyn', exact: true }).click()
  await expect(page).toHaveURL(reviewUrl)
  await expect(page.getByLabel('Undervisningsmål', { exact: true })).toHaveValue('Osparad materialtext finns kvar')
  await page.getByLabel('Undervisningsmål', { exact: true }).fill(input.goalSv)
  await page.goto('/teacher')
  await openDispatch(page)
  await page.getByRole('textbox', { name: 'Samlingens namn', exact: true }).fill('Osparat arbete ligger kvar')
  await page.getByRole('button', { name: 'Tillbaka', exact: true }).click()
  await page.getByRole('button', { name: 'Till utdelade screeningar', exact: true }).click()
  await page.getByRole('tab', { name: 'Materialbibliotek', exact: true }).click()
  await page.getByRole('searchbox', { name: 'Sök material', exact: true }).fill('')
  page.once('dialog', dialog => dialog.dismiss())
  await page.getByRole('article', { name: 'Sparat MCP-material, reviderat', exact: true }).getByRole('button', { name: 'Öppna granskning', exact: true }).click()
  await expect(page).toHaveURL(/\/teacher$/u)
  await page.getByRole('button', { name: 'Återgå till utdelning', exact: true }).click()
  await page.getByRole('button', { name: 'Skapa ny', exact: false }).click()
  await expect(page.getByRole('textbox', { name: 'Samlingens namn', exact: true })).toHaveValue('Osparat arbete ligger kvar')
  await page.screenshot({ path: info.outputPath('library-unsaved-preserved.png'), fullPage: true })
  const other = await createTeacher(request, { classIds: [classId] })
  const otherToken = (await (await request.post('/api/teacher-login', { data: other })).json()).token
  const otherList = await (await request.get('/api/teacher-material?resource=drafts', { headers: { 'x-teacher-token': otherToken } })).json()
  expect(otherList.drafts).toEqual([])
  expect((await request.get(`/api/teacher-material?draftId=${first.draftId}`, { headers: { 'x-teacher-token': otherToken } })).status()).toBe(404)
  const current = await (await request.get(`/api/teacher-material?draftId=${first.draftId}`, { headers })).json()
  expect(current.draft.approvals || []).toEqual([])
  expect((await (await request.get(`/api/teacher-diagnostic-assignments?classId=${classId}`, { headers })).json()).assignments).toEqual([])
})
