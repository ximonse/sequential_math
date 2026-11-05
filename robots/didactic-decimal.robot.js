import { test, expect } from '@playwright/test'
import { createPupil, login, readServerProfile } from './lib/app.js'
import { createTeacher, teacherLogin } from './lib/teacher.js'

async function api(page, url, body) {
  return page.evaluate(async ({ url, body }) => {
    const result = await fetch(url, { headers: { 'Content-Type': 'application/json', 'x-teacher-token': sessionStorage.getItem('mathapp_teacher_api_token') },
      ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}) })
    return { status: result.status, data: await result.json() }
  }, { url, body })
}
async function answer(student, pupil, title, answers) {
  await student.goto(`/student/${pupil.studentId}`)
  await student.getByRole('button', { name: title, exact: true }).click()
  for (const [index, value] of answers.entries()) {
    await student.getByRole('textbox', { name: 'Mitt svar', exact: true }).pressSequentially(value)
    if (index < answers.length - 1) await student.getByRole('button', { name: 'Nästa fråga', exact: true }).click()
  }
  await student.getByRole('button', { name: 'Lämna in svaren', exact: true }).click()
  await expect(student).toHaveURL(new RegExp(`/student/${pupil.studentId}$`))
}
async function approve(page) {
  await page.getByRole('checkbox', { name: /Jag har granskat/ }).check()
  await page.getByRole('button', { name: 'Godkänn version 1', exact: true }).click()
  await expect(page.getByText('Version 1 är godkänd.', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: /^Dela ut till 1 elev/ }).click()
  await expect(page.getByText(/1 av 1 mottagare är bekräftade/)).toBeVisible()
}
test('Approved decimal pilot preserves teaching and help through new and later controls without changing mastery', async ({ page, request, browser }, testInfo) => {
  test.skip(process.env.ROBOT_DEV !== '1', 'Cookie approval uses the local development origin policy.')
  const classId = `decimal-didactic-${Math.random().toString(36).slice(2, 8)}`
  const pupil = await createPupil(request, { classId, name: 'Didactic Decimal Pupil' })
  const before = await readServerProfile(request, pupil.studentId)
  await teacherLogin(page, await createTeacher(request, { classIds: [classId], role: 'super_admin' }))
  expect((await api(page, '/api/teacher-diagnostic-assignments', { classId, studentIds: [pupil.studentId], taskIds: ['decimal-mul-source'], titleSv: 'Decimal första' })).status).toBe(201)
  const context = await browser.newContext(), student = await context.newPage()
  await login(student, pupil)
  await answer(student, pupil, 'Decimal första', ['42,49'])
  await page.goto(`/teacher/student/${pupil.studentId}`)
  const panel = page.getByRole('region', { name: 'Analys och avstämning', exact: true })
  await panel.getByRole('button', { name: /^Analys och avstämning/ }).click()
  await expect(panel.getByRole('status')).toContainText('inlästa')
  await panel.getByLabel('Underlag', { exact: true }).selectOption('screening')
  await panel.getByRole('button', { name: 'Skapa granskningsunderlag', exact: true }).click()
  await panel.getByRole('button', { name: 'Spara rapportversion', exact: true }).click()
  await panel.getByRole('button', { name: 'Pröva med kontrastfrågor', exact: true }).click()
  const contrast = panel.getByRole('region', { name: 'Kontrastfrågor', exact: true })
  await contrast.getByRole('button', { name: 'Skapa utkast', exact: true }).click()
  await contrast.getByRole('link', { name: 'Öppna granskning', exact: true }).click()
  await approve(page)
  await answer(student, pupil, 'Uppföljning: multiplikation', ['6,12', '15,30'])
  await page.reload()
  let flow = page.getByRole('region', { name: 'Undervisning och nya kontroller', exact: true })
  await expect(flow).toContainText('Prövning före undervisning')
  await flow.getByRole('button', { name: 'Läs senaste avstämning', exact: true }).click()
  await flow.getByLabel('Vad gjorde ni?', { exact: true }).fill('Vi delade upp 2,5 i två hela och fem tiondelar.')
  await flow.getByLabel('Hjälp vid arbetet', { exact: true }).selectOption('given')
  // A real concurrent check-in must not be overwritten or erase the note.
  const analysisUrl = `/api/teacher-students/${pupil.studentId}?resource=analysis&classId=${classId}`
  const state = (await api(page, analysisUrl)).data, report = state.reports[0]
  expect((await api(page, analysisUrl, { action: 'check_in', reportId: report.id, expectedRevision: state.revision,
    requestId: crypto.randomUUID(), checkIn: { decisions: report.report.hypotheses.map(h => ({ hypothesisId: h.id, decision: 'undecided', interpretationSv: '' })),
      goalSv: 'Andra flikens bevarade mål', noteSv: '' } })).status).toBe(200)
  await flow.getByRole('button', { name: 'Spara undervisningsnotering', exact: true }).click()
  await expect(flow.getByRole('status')).toContainText('annan flik')
  await expect(flow.getByLabel('Vad gjorde ni?', { exact: true })).toHaveValue('Vi delade upp 2,5 i två hela och fem tiondelar.')
  await flow.getByRole('button', { name: 'Läs senaste avstämning', exact: true }).click()
  await flow.getByRole('button', { name: 'Spara undervisningsnotering', exact: true }).click()
  await expect(flow.getByRole('status')).toContainText('ny avstämning')
  await page.reload()
  flow = page.getByRole('region', { name: 'Undervisning och nya kontroller', exact: true })
  await flow.getByRole('button', { name: 'Läs senaste avstämning', exact: true }).click()
  await expect(flow).toContainText('Hjälp gavs')
  await flow.getByRole('button', { name: 'Skapa ny kontroll', exact: true }).click()
  await flow.getByRole('link', { name: 'Öppna kontrollutkast', exact: true }).click()
  const immediateDraftId = new URL(page.url()).pathname.split('/').at(-1)
  const saved = (await api(page, `/api/teacher-material?draftId=${immediateDraftId}`)).data
  const plan = saved.draft.versions[0].material.investigation
  expect(plan.didactic).toMatchObject({ phase: 'independent_check', teaching: { help: 'given' } })
  expect(plan.pupils[0].reportReview.goalSv).toBe('Andra flikens bevarade mål')
  expect(plan.pupils[0].reportReview.sourceBindings[0].reportRef).not.toBe(plan.pupils[0].reportReview.sourceBindings[0].currentRef)
  await approve(page)
  await answer(student, pupil, 'Ny kontroll: decimalmultiplikation', ['28,20'])
  await page.reload()
  flow = page.getByRole('region', { name: 'Undervisning och nya kontroller', exact: true })
  await flow.getByRole('button', { name: 'Läs senaste avstämning', exact: true }).click()
  await flow.getByLabel('Vad gjorde ni?', { exact: true }).fill('Eleven förklarade kontrollen med tiondelar. Ingen ny undervisning.')
  await flow.getByLabel('Hjälp vid arbetet', { exact: true }).selectOption('none_reported')
  await flow.getByRole('button', { name: 'Spara kontrollobservation', exact: true }).click()
  await expect(flow.getByRole('status')).toContainText('ny avstämning')
  await flow.getByRole('button', { name: 'Skapa senare kontroll', exact: true }).click()
  await flow.getByRole('link', { name: 'Öppna kontrollutkast', exact: true }).click()
  await approve(page)
  await answer(student, pupil, 'Senare kontroll: decimalmultiplikation', ['24,48'])
  await page.reload()
  flow = page.getByRole('region', { name: 'Undervisning och nya kontroller', exact: true })
  await expect(flow).toContainText('Senare kontroll')
  await flow.getByRole('button', { name: 'Läs senaste avstämning', exact: true }).click()
  await expect(flow).toContainText('Ingen hjälp enligt läraren')
  await expect(page.getByRole('region', { name: 'Resultat av uppföljningen', exact: true })).not.toContainText('talar för misstanken')
  // Even a freshly rebound source cannot turn an already answered task into a
  // new control. This must be rejected by the API, not only hidden in the UI.
  const freshHistory = (await api(page, `/api/teacher-students/${pupil.studentId}?${new URLSearchParams({
    resource: 'evidence', classId, from: report.report.period.from, to: report.report.period.to, source: report.report.source, limit: '100' })}`)).data
  const latestReport = (await api(page, analysisUrl)).data.reports.find(item => item.id === report.id)
  const repeated = structuredClone(saved.draft.versions[0].input)
  repeated.basis[0].snapshotRevision = freshHistory.snapshotRevision
  for (const field of ['supportRefs', 'counterRefs']) repeated.basis[0][field] = report.report.hypotheses[0][field].map(ref => {
    const original = report.report.evidence.find(entry => entry.ref === ref)
    return freshHistory.entries.find(entry => JSON.stringify(entry.reference) === JSON.stringify(original.reference)).ref
  })
  repeated.investigation.reportReview.checkInRevision = latestReport.checkIns.at(-1).revision
  const denied = await api(page, '/api/teacher-material', { action: 'preview', material: repeated })
  expect(denied.status).toBe(400)
  expect(denied.data.error).toContain('redan mött')
  await flow.screenshot({ path: testInfo.outputPath('didactic-later-landscape.png') })
  await page.setViewportSize({ width: 768, height: 1024 })
  await flow.screenshot({ path: testInfo.outputPath('didactic-later-portrait.png') })
  const after = await readServerProfile(request, pupil.studentId)
  expect(after.masteryFacts).toEqual(before.masteryFacts)
  expect(after.problemLog).toEqual(before.problemLog)
  await context.close()
})
