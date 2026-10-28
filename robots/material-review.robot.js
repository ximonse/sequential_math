import { test, expect } from '@playwright/test'
import { createPupil } from './lib/app.js'
import { createTeacher, teacherLogin } from './lib/teacher.js'
import { stockholmDay } from '../src/lib/evidencePeriod.js'

test('Teacher reviews filled material, preserves edits across versions and approves exact current content through browser cookie only', async ({ page, request }, info) => {
  test.skip(process.env.ROBOT_DEV !== '1', 'Cookie mutations over localhost HTTP require the development API origin policy; run with ROBOT_DEV=1.')
  const classId = `review-${Math.random().toString(36).slice(2, 7)}`
  await createPupil(request, { classId, name: 'Review Pupil One' })
  await createPupil(request, { classId, name: 'Review Pupil Two' })
  const teacher = await createTeacher(request, { classIds: [classId], role: 'super_admin' })
  const { token } = await (await request.post('/api/teacher-login', { data: teacher })).json()
  const headers = { 'x-teacher-token': token }
  const audience = await (await request.get(`/api/students?resource=audience&targetType=class&targetId=${classId}`, { headers })).json()
  const material = { schemaVersion: 1, kind: 'screening', mode: 'general', titleSv: 'Subtraktion och geometriska former',
    goalSv: 'Visa växling genom noll och förklara hur en triangel känns igen.', instructionSv: 'Skapa en kort screening med utrymme för elevens metod och en fråga om former.',
    sourceMaterials: [{ label: 'Lärarens planering', excerpt: 'Vi har arbetat med subtraktion. Pröva särskilt när tiotalet är noll. Låt eleven förklara hur hen kontrollerar sitt svar.' }],
    audience: { targetType: 'class', targetId: classId, rosterRevision: audience.rosterRevision },
    content: { taskIds: ['sub-through-zero-001', 'geometry-one-triangle'], customTasks: [{ promptSv: 'Förklara hur du kan kontrollera ditt svar i subtraktionen.', gridEnabled: true }] } }
  const preview = await (await request.post('/api/teacher-material', { headers, data: { action: 'preview', material } })).json()
  expect(preview.contentRevision).toMatch(/^[a-f0-9]{64}$/u)
  const saved = await (await request.post('/api/teacher-material', { headers, data: { action: 'save', material,
    expectedRevision: 0, expectedContentRevision: preview.contentRevision, requestId: 'review-material-save-0001' } })).json()
  expect((await request.post('/api/teacher-material', { headers, data: { action: 'approve', draftId: saved.draftId,
    expectedRevision: 1, contentRevision: preview.contentRevision, version: 1, requestId: 'header-must-not-approve' } })).status()).toBe(403)
  await teacherLogin(page, teacher)
  await page.goto(saved.reviewPath)
  await expect(page.getByRole('heading', { name: material.titleSv, exact: true })).toBeVisible()
  await expect(page.getByText('Review Pupil One', { exact: true })).toBeVisible()
  await expect(page.getByText('Facit:', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Fråga 3' })).toBeVisible()
  await page.screenshot({ path: info.outputPath('material-review-landscape.png'), fullPage: true })
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.screenshot({ path: info.outputPath('material-review-portrait.png'), fullPage: true })
  await page.getByLabel('Rubrik', { exact: true }).fill('Reviderad screening')
  await page.getByRole('button', { name: 'Förhandsvisa ändring', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Spara som ny version', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Spara som ny version', exact: true }).click()
  await expect(page.getByLabel('Utkastversion')).toHaveValue('2')
  await page.getByLabel('Undervisningsmål', { exact: true }).fill('Osparat mål finns kvar')
  await page.getByLabel('Utkastversion').selectOption('1')
  const reviewCheck = page.getByRole('checkbox', { name: /Jag har granskat/ })
  await expect(reviewCheck).toBeDisabled()
  await page.getByLabel('Utkastversion').selectOption('2')
  await expect(page.getByLabel('Undervisningsmål', { exact: true })).toHaveValue('Osparat mål finns kvar')
  await page.getByLabel('Undervisningsmål', { exact: true }).fill(material.goalSv)
  await reviewCheck.check()
  await page.getByRole('button', { name: 'Godkänn version 2', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Innehåll och mottagare är godkända')
  const state = await (await request.get(`/api/teacher-material?draftId=${saved.draftId}`, { headers })).json()
  expect(state.draft.approvals).toHaveLength(1)
  expect(state.draft.approvals[0].version).toBe(2)
  expect((await (await request.get(`/api/teacher-diagnostic-assignments?classId=${classId}`, { headers })).json()).assignments).toEqual([])
  await page.reload()
  await page.getByLabel('Utkastversion').selectOption('2')
  await expect(page.getByText('Version 2 är godkänd.', { exact: false })).toBeVisible()
  await page.screenshot({ path: info.outputPath('material-review-approved.png'), fullPage: true })
  const practice = { ...material, kind: 'practice', titleSv: 'Talområde 10–20', goalSv: 'Addera och subtrahera inom valt talområde.',
    instructionSv: 'Skapa ett kort träningsuppdrag för addition och subtraktion inom de valda talområdena.',
    sourceMaterials: [{ label: 'Valt talområde', excerpt: 'Första talet jämnt mellan 10 och 20. Andra talet udda mellan 1 och 9.' }],
    content: { kind: 'math_practice', operations: ['addition', 'subtraction'], targetCount: 12,
      numberRange: { first: { min: 10, max: 20, filter: 'even' }, second: { min: 1, max: 9, filter: 'odd' } },
      settings: { maxTimePerProblem: 90, randomizeOrder: true, hideCountdown: false } } }
  const practicePreview = await (await request.post('/api/teacher-material', { headers, data: { action: 'preview', material: practice } })).json()
  const practiceSaved = await (await request.post('/api/teacher-material', { headers, data: { action: 'save', material: practice,
    expectedRevision: 0, expectedContentRevision: practicePreview.contentRevision, requestId: 'practice-review-save-0001' } })).json()
  await page.goto(practiceSaved.reviewPath)
  await expect(page.getByRole('heading', { name: 'Träningsram', exact: true })).toBeVisible()
  await expect(page.getByText('10–20, jämna tal', { exact: true })).toBeVisible()
  await expect(page.getByText('1–9, udda tal', { exact: true })).toBeVisible()
  await expect(page.getByText('90 sekunder', { exact: true })).toBeVisible()
  await page.screenshot({ path: info.outputPath('practice-frame-review.png'), fullPage: true })
})

test('Analysis-specific review exposes the exact supporting answer and refuses approval after source data changes', async ({ page, request }, info) => {
  test.skip(process.env.ROBOT_DEV !== '1', 'Run cookie review with ROBOT_DEV=1 for the localhost development origin policy.')
  const classId = `basis-${Math.random().toString(36).slice(2, 7)}`
  const pupil = await createPupil(request, { classId, name: 'Review Evidence' })
  const teacher = await createTeacher(request, { classIds: [classId], role: 'super_admin' })
  const seed = currentCorrect => request.post('/__robot/seed-table-progress', { data: { students: [{ studentId: pupil.studentId,
    currentAttempts: 4, currentCorrect, previousAttempts: 0, noiseAttempts: 0 }] } })
  await seed(2)
  const { token } = await (await request.post('/api/teacher-login', { data: teacher })).json()
  const headers = { 'x-teacher-token': token }
  const audience = await (await request.get(`/api/students?resource=audience&targetType=class&targetId=${classId}`, { headers })).json()
  const period = { from: '2026-01-01', to: stockholmDay(), source: 'practice' }
  const evidence = await (await request.get(`/api/teacher-students/${pupil.studentId}?${new URLSearchParams({ ...period, classId, resource: 'evidence' })}`, { headers })).json()
  const material = { schemaVersion: 1, kind: 'screening', mode: 'specific', titleSv: 'Undersök sjuans tabell',
    goalSv: 'Skilja fel i tabellfakta från ett tillfälligt inmatningsfel.', instructionSv: 'Pröva hur eleven kommer fram till produkten.',
    audience: { targetType: 'class', targetId: classId, rosterRevision: audience.rosterRevision },
    basis: [{ studentId: pupil.studentId, classId, ...period, snapshotRevision: evidence.snapshotRevision,
      supportRefs: [evidence.entries[2].ref], counterRefs: [], reasonSv: '7 × 3 besvarades med 22. Ett slutsvar visar inte elevens metod; be om en förklaring.' }],
    content: { taskIds: [], customTasks: [{ promptSv: 'Räkna 7 × 3 och förklara hur du kommer fram till svaret.' }] } }
  const preview = await (await request.post('/api/teacher-material', { headers, data: { action: 'preview', material } })).json()
  const saved = await (await request.post('/api/teacher-material', { headers, data: { action: 'save', material,
    expectedRevision: 0, expectedContentRevision: preview.contentRevision, requestId: 'basis-review-save-0001' } })).json()
  await teacherLogin(page, teacher)
  await page.goto(saved.reviewPath)
  await page.getByRole('button', { name: 'Stödsvar 1', exact: true }).click()
  const source = page.getByRole('region', { name: 'Analysens källsvar' })
  await expect(source).toContainText('7 × 3')
  await expect(source).toContainText('Elevens svar: 22')
  await expect(source).toContainText('Facit/bedömningsunderlag: 21')
  await page.screenshot({ path: info.outputPath('specific-material-source.png'), fullPage: true })
  await seed(4)
  await page.getByRole('checkbox', { name: /Jag har granskat/ }).check()
  const rejected = page.waitForResponse(response => response.url().includes('/api/teacher-material') && response.request().method() === 'POST')
  await page.getByRole('button', { name: 'Godkänn version 1', exact: true }).click()
  expect((await rejected).status()).toBe(409)
  await expect(page.getByRole('status')).toContainText('ändrat')
  const state = await (await request.get(`/api/teacher-material?draftId=${saved.draftId}`, { headers })).json()
  expect(state.draft.approvals || []).toEqual([])
})
