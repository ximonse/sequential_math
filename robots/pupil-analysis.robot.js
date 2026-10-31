import { test, expect } from '@playwright/test'
import { createPupil, login, readServerProfile } from './lib/app.js'
import { createTeacher, teacherLogin } from './lib/teacher.js'
import { stockholmDay } from '../src/lib/evidencePeriod.js'

async function teacherRequest(page, url, body) {
  return page.evaluate(async ({ url, body }) => {
    const response = await fetch(url, { ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}),
      headers: { 'Content-Type': 'application/json', 'x-teacher-token': sessionStorage.getItem('mathapp_teacher_api_token') } })
    return { status: response.status, data: await response.json() }
  }, { url, body })
}

test('Analysis keeps source answers, versions and teacher corrections through conflicts and reload', async ({ page, request }, testInfo) => {
  const tag = Math.random().toString(36).slice(2, 8), classId = `analysis-${tag}`
  const pupil = await createPupil(request, { classId })
  await request.post('/__robot/seed-table-progress', { data: { students: [{ studentId: pupil.studentId,
    currentAttempts: 4, currentCorrect: 2, previousAttempts: 0, noiseAttempts: 0 }] } })
  const before = await readServerProfile(request, pupil.studentId)
  const teacher = await createTeacher(request, { classIds: [classId] })
  await teacherLogin(page, teacher)
  await page.goto(`/teacher/student/${pupil.studentId}`)
  const panel = page.getByRole('region', { name: 'Analys och avstämning', exact: true })
  await panel.getByRole('button', { name: /^Analys och avstämning/ }).click()
  await expect(panel.getByRole('status')).toContainText('inlästa')
  const from = stockholmDay(Date.now() - 14 * 86400000), to = stockholmDay()
  await panel.getByLabel('Analys från').fill(from)
  await panel.getByLabel('Analys till').fill(to)
  await panel.getByRole('button', { name: 'Skapa granskningsunderlag', exact: true }).click()
  await expect(panel.getByRole('region', { name: 'Analysrapport', exact: true })).toContainText('4 svar: 2 rätt, 2 fel')
  const url = `/api/teacher-students/${pupil.studentId}?resource=analysis&classId=${classId}`
  expect((await teacherRequest(page, url)).data.reports).toEqual([])
  await panel.getByRole('button', { name: 'Spara rapportversion', exact: true }).click()
  await panel.getByLabel('Nästa mål', { exact: true }).fill('Undersök tabellfakta med kontraster.')
  await panel.getByRole('button', { name: 'Spara avstämning', exact: true }).click()
  await expect(panel.getByRole('status')).toContainText('sparad på servern')
  const evidenceUrl = `/api/teacher-students/${pupil.studentId}?resource=evidence&classId=${classId}&from=${from}&to=${to}`
  const evidence = (await teacherRequest(page, evidenceUrl)).data
  const right = evidence.entries.filter(e => e.answer.status === 'correct').map(e => e.ref)
  const wrong = evidence.entries.filter(e => e.answer.status === 'incorrect').map(e => e.ref)
  const originalText = 'Felsvaren ligger ett över produkten. Undersök om eleven blandar ihop närliggande tabellfakta.'
  const report = { schemaVersion: 1, snapshotRevision: evidence.snapshotRevision, scopeSv: 'Pröva förklaring till tabellfelen',
    provenance: { kind: 'ai', model: 'synthetic-fixture', instructionVersion: 'pupil-analysis-v1' },
    strengths: [{ id: 'strength', textSv: 'Rätta produkter finns i samma tabell.', refs: right }],
    hypotheses: [{ id: 'table-hypothesis', textSv: originalText, basis: 'ai_interpretation', supportRefs: wrong,
      counterRefs: right, alternativesSv: ['Det kan vara en tillfällig felskrivning; rätta svar på andra faktorer behöver jämföras.'],
      nextCheckSv: 'Låt eleven förklara två nya produkter med närliggande faktorer.' }], limitationsSv: ['Detta är en syntetisk testrapport, inte en verifierad felorsak.'] }
  const stored = await teacherRequest(page, url, { action: 'create_report', from, to, source: 'practice', report,
    requestId: `robot-${tag}`, expectedRevision: 2 })
  expect(stored.status).toBe(200)
  await panel.getByRole('button', { name: 'Läs senaste sparade', exact: true }).click()
  await panel.getByLabel('Sparad rapportversion').selectOption(stored.data.affectedReportId)
  await expect(panel.getByRole('region', { name: 'Analysrapport', exact: true })).toHaveCount(1)
  await expect(panel).toContainText('AI-formulerad tolkning')
  await panel.getByRole('combobox', { name: /Ställningstagande/ }).selectOption('revised')
  await panel.getByRole('textbox', { name: /Din tolkning/ }).fill('Pröva först om felen uppstår när faktorn ändras med ett.')
  await panel.getByLabel('Nästa mål', { exact: true }).fill('Jämför närliggande faktorer muntligt.')
  let failOnce = true
  await page.route('**/api/teacher-students/*?*resource=analysis*', async route => {
    const body = route.request().method() === 'POST' ? route.request().postDataJSON() : null
    if (failOnce && body?.action === 'check_in') {
      failOnce = false
      await route.fulfill({ status: 409, json: { error: 'En annan flik hann spara.' } })
    } else await route.continue()
  })
  await panel.getByRole('button', { name: 'Spara avstämning', exact: true }).click()
  await expect(panel.getByRole('status')).toContainText('annan flik')
  await expect(panel.getByLabel('Nästa mål', { exact: true })).toHaveValue('Jämför närliggande faktorer muntligt.')
  await panel.getByRole('button', { name: 'Spara avstämning', exact: true }).click()
  await expect(panel.getByRole('status')).toContainText('sparad på servern')
  await page.reload()
  await panel.getByRole('button', { name: /^Analys och avstämning/ }).click()
  await expect(panel.getByLabel('Nästa mål', { exact: true })).toHaveValue('Jämför närliggande faktorer muntligt.')
  await expect(panel.getByRole('textbox', { name: /Din tolkning/ })).toHaveValue('Pröva först om felen uppstår när faktorn ändras med ett.')
  await expect(panel.getByRole('region', { name: 'Analysrapport', exact: true })).toContainText(originalText)
  await panel.getByText('Stödsvar (2)', { exact: true }).click()
  await panel.getByRole('button', { name: /^Visa svar 1:/ }).click()
  await expect(panel.getByRole('region', { name: 'Rapportens källsvar', exact: true })).toContainText('Elevens svar:')
  await page.setViewportSize({ width: 1366, height: 900 })
  await panel.scrollIntoViewIfNeeded()
  await panel.screenshot({ path: testInfo.outputPath('analysis-desktop.png') })
  await page.setViewportSize({ width: 1024, height: 768 })
  await panel.screenshot({ path: testInfo.outputPath('analysis-tablet.png') })
  const saved = (await teacherRequest(page, url)).data
  expect(saved.reports[0].checkIns).toHaveLength(1)
  expect(saved.reports[1].checkIns).toHaveLength(1)
  expect(saved.reports[1].report.hypotheses[0].textSv).toBe(originalText)
  expect(await readServerProfile(request, pupil.studentId)).toEqual(before)
  const firstId = saved.reports[0].id
  await panel.getByLabel('Nästa mål', { exact: true }).fill('Osparad text som ska ligga kvar.')
  await panel.getByLabel('Sparad rapportversion').selectOption(firstId)
  await panel.getByLabel('Sparad rapportversion').selectOption(saved.reports[1].id)
  await expect(panel.getByLabel('Nästa mål', { exact: true })).toHaveValue('Osparad text som ska ligga kvar.')
  page.on('dialog', dialog => dialog.accept())
  await panel.getByRole('button', { name: 'Återgå till senast sparade', exact: true }).click()
})

test('A report without a method hypothesis still shows the pupil answer and the version-bound notebook original', async ({ page, request }, testInfo) => {
  const classId = `analysis-work-${Math.random().toString(36).slice(2, 8)}`
  const pupil = await createPupil(request, { classId, name: 'Analysis Notebook' })
  const teacher = await createTeacher(request, { classIds: [classId], role: 'super_admin' })
  await teacherLogin(page, teacher)
  const created = await teacherRequest(page, '/api/teacher-diagnostic-assignments', {
    classId, studentIds: [pupil.studentId], taskIds: ['sub-through-zero-001'], titleSv: 'Original till analys' })
  expect(created.status).toBe(201)
  await login(page, pupil)
  await page.getByRole('button', { name: 'Original till analys', exact: true }).click()
  await page.locator('input[data-cell="0:0"]').press('4')
  await page.getByRole('textbox', { name: 'Mitt svar', exact: true }).tap()
  // 402 − 178 = 224; 213 matches no computed error model, so the report has no hypothesis.
  for (const digit of '213') await page.getByRole('button', { name: `Skriv ${digit}`, exact: true }).tap()
  await expect(page.getByText('Alla skickade ändringar är sparade på servern.')).toBeVisible()
  await page.goto(`/teacher/student/${pupil.studentId}`)
  const panel = page.getByRole('region', { name: 'Analys och avstämning', exact: true })
  await panel.getByRole('button', { name: /^Analys och avstämning/ }).click()
  await expect(panel.getByRole('status')).toContainText('inlästa')
  await panel.getByLabel('Underlag', { exact: true }).selectOption('screening')
  await panel.getByRole('button', { name: 'Skapa granskningsunderlag', exact: true }).click()
  await expect(panel).toContainText('Otillräckligt underlag för en felhypotes')
  await panel.getByRole('button', { name: 'Spara rapportversion', exact: true }).click()
  await panel.getByText('Svar från periodens början, högst 20 (1)', { exact: true }).click()
  await panel.getByRole('button', { name: /^Visa svar 1:/ }).click()
  await expect(panel.getByRole('region', { name: 'Rapportens källsvar', exact: true })).toContainText('Elevens svar: 213 · Facit: 224')
  await panel.getByRole('button', { name: 'Visa sparat räknehäfte', exact: true }).click()
  const original = panel.getByRole('region', { name: 'Elevens inmatningsförlopp', exact: true })
  await expect(original).toBeVisible()
  expect(await original.locator('.diagnostic-grid').evaluate(grid => getComputedStyle(grid).display)).toBe('grid')
  await expect(original.locator('.diagnostic-cell').first()).toContainText('4')
  await panel.screenshot({ path: testInfo.outputPath('analysis-notebook-original.png') })
})

test('A single computed error model is shown as insufficient evidence, not as a pupil method', async ({ page, request }) => {
  const classId = `analysis-model-${Math.random().toString(36).slice(2, 8)}`
  const pupil = await createPupil(request, { classId, name: 'Analysis Model' })
  const teacher = await createTeacher(request, { classIds: [classId], role: 'super_admin' })
  await teacherLogin(page, teacher)
  const created = await teacherRequest(page, '/api/teacher-diagnostic-assignments', {
    classId, studentIds: [pupil.studentId], taskIds: ['sub-through-zero-001'], titleSv: 'Beräknad modell' })
  expect(created.status).toBe(201)
  await login(page, pupil)
  await page.getByRole('button', { name: 'Beräknad modell', exact: true }).click()
  await page.getByRole('textbox', { name: 'Mitt svar', exact: true }).tap()
  // 402 − 178 answered 376 matches larger-minus-smaller per column, once.
  for (const digit of '376') await page.getByRole('button', { name: `Skriv ${digit}`, exact: true }).tap()
  await expect(page.getByText('Alla skickade ändringar är sparade på servern.')).toBeVisible()
  await page.goto(`/teacher/student/${pupil.studentId}`)
  const panel = page.getByRole('region', { name: 'Analys och avstämning', exact: true })
  await panel.getByRole('button', { name: /^Analys och avstämning/ }).click()
  await expect(panel.getByRole('status')).toContainText('inlästa')
  await panel.getByLabel('Underlag', { exact: true }).selectOption('screening')
  await panel.getByRole('button', { name: 'Skapa granskningsunderlag', exact: true }).click()
  await expect(panel).toContainText('Beräknad felmodell · Otillräckligt underlag')
  await expect(panel).not.toContainText('Otillräckligt underlag för en felhypotes')
  // R3/R4: contrast questions become a private draft; nothing reaches the pupil.
  await panel.getByRole('button', { name: 'Pröva med kontrastfrågor', exact: true }).click()
  const contrast = panel.getByRole('region', { name: 'Kontrastfrågor', exact: true })
  // An exchange-through-zero suspicion is followed up on the same structure first.
  await expect(contrast.locator('tbody tr').first()).toContainText('503 − 267')
  await contrast.getByRole('button', { name: 'Skapa utkast', exact: true }).click()
  await expect(contrast.getByRole('status')).toHaveText('Privat utkast sparat. Inget har delats ut.')
  await expect(contrast.getByRole('link', { name: 'Öppna granskning', exact: true })).toHaveAttribute('href', /^\/teacher\/material\/mat_/)
  const assignments = (await teacherRequest(page, `/api/teacher-diagnostic-assignments?classId=${classId}`)).data.assignments
  expect(assignments.map(item => item.titleSv)).toEqual(['Beräknad modell'])
})
