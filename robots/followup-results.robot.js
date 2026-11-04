// Directed follow-up end to end: suspicion → contrast draft → approval and
// dispatch → pupil answers → results with a signal (advice, not a conclusion).
import { test, expect } from '@playwright/test'
import { createPupil, login } from './lib/app.js'
import { createTeacher, teacherLogin } from './lib/teacher.js'

async function teacherRequest(page, url, body) {
  return page.evaluate(async ({ url, body }) => {
    const response = await fetch(url, { ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}),
      headers: { 'Content-Type': 'application/json', 'x-teacher-token': sessionStorage.getItem('mathapp_teacher_api_token') } })
    return { status: response.status, data: await response.json() }
  }, { url, body })
}

// Larger digit minus smaller digit in every column.
const smallerFromLarger = (a, b) => Number(String(a).split('').map((d, i) => Math.abs(Number(d) - Number(String(b).padStart(String(a).length, '0')[i]))).join(''))

test('A dispatched follow-up keeps partial answers and competing models as observations', async ({ page, request, browser }, testInfo) => {
  test.skip(process.env.ROBOT_DEV !== '1', 'Cookie approval requires the local development origin policy; run with ROBOT_DEV=1.')
  const classId = `followup-${Math.random().toString(36).slice(2, 8)}`
  const pupil = await createPupil(request, { classId, name: 'Followup Pupil' })
  const teacher = await createTeacher(request, { classIds: [classId], role: 'super_admin' })
  await teacherLogin(page, teacher)
  const created = await teacherRequest(page, '/api/teacher-diagnostic-assignments', {
    classId, studentIds: [pupil.studentId], taskIds: ['sub-through-zero-001'], titleSv: 'Första screeningen' })
  expect(created.status).toBe(201)

  const pupilContext = await browser.newContext()
  const student = await pupilContext.newPage()
  await login(student, pupil)
  await student.getByRole('button', { name: 'Första screeningen', exact: true }).click()
  await student.getByRole('textbox', { name: 'Mitt svar', exact: true }).pressSequentially('376')
  await student.getByRole('button', { name: 'Lämna in svaren', exact: true }).click()

  await page.goto(`/teacher/student/${pupil.studentId}`)
  const panel = page.getByRole('region', { name: 'Analys och avstämning', exact: true })
  await panel.getByRole('button', { name: /^Analys och avstämning/ }).click()
  await expect(panel.getByRole('status')).toContainText('inlästa')
  await panel.getByLabel('Underlag', { exact: true }).selectOption('screening')
  await panel.getByRole('button', { name: 'Skapa granskningsunderlag', exact: true }).click()
  const recommendation = await panel.locator('p').filter({ hasText: 'Förslag, inte utdelat:' }).innerText()
  const recommendedQuestion = recommendation.split('Förslag, inte utdelat: ')[1].split('. ')[0]
  await panel.getByRole('button', { name: 'Spara rapportversion', exact: true }).click()
  await panel.getByRole('combobox', { name: /Ställningstagande/ }).selectOption('revised')
  await panel.getByRole('textbox', { name: /Din tolkning/ }).fill('Pröva avskrivning innan en metod antas.')
  await panel.getByLabel('Nästa mål', { exact: true }).fill('Kontrollera originalet och låt eleven förklara.')
  await panel.getByRole('button', { name: 'Spara avstämning', exact: true }).click()
  await expect(panel.getByRole('status')).toContainText('sparad på servern')
  await expect(panel.getByLabel('Rapportens avstämning')).toContainText('Ändrad tolkning')
  await panel.getByRole('button', { name: 'Pröva med kontrastfrågor', exact: true }).click()
  const contrast = panel.getByRole('region', { name: 'Kontrastfrågor', exact: true })
  await expect(contrast.getByRole('table')).toContainText(recommendedQuestion)
  await expect(contrast.getByRole('button', { name: 'Skapa utkast', exact: true })).toBeDisabled()
  await contrast.getByRole('checkbox', { name: /pröva den ursprungliga modellen igen/ }).check()
  await contrast.screenshot({ path: testInfo.outputPath('shared-selection-review.png') })
  await contrast.getByRole('button', { name: 'Skapa utkast', exact: true }).click()
  await contrast.getByRole('link', { name: 'Öppna granskning', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Prövningsavsikt', exact: true })).toContainText('Större minus mindre i varje kolumn')
  await expect(page.getByLabel('Rapportens avstämning')).toContainText('Pröva avskrivning innan en metod antas.')
  const intent = page.getByRole('region', { name: 'Prövningsavsikt', exact: true })
  await intent.getByText('Frågornas facit och modellsvar', { exact: true }).click()
  await intent.screenshot({ path: testInfo.outputPath('investigation-review-landscape.png') })
  await page.setViewportSize({ width: 768, height: 1024 })
  await intent.screenshot({ path: testInfo.outputPath('investigation-review-portrait.png') })
  await page.setViewportSize({ width: 1024, height: 768 })

  await page.getByRole('checkbox', { name: /Jag har granskat/ }).check()
  await page.getByRole('button', { name: 'Godkänn version 1', exact: true }).click()
  await expect(page.getByText('Version 1 är godkänd.', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: /^Dela ut till 1 elev/ }).click()
  await expect(page.getByText(/1 av 1 mottagare är bekräftade/)).toBeVisible()
  const draftId = new URL(page.url()).pathname.split('/').at(-1)
  const saved = (await teacherRequest(page, `/api/teacher-material?draftId=${draftId}`)).data
  const savedPlan = saved.draft.versions[0].material.investigation
  expect(savedPlan.modelId).toBe('smaller_minus_larger')
  expect(savedPlan.pupils[0].reportReview).toMatchObject({ decision: 'revised', reopen: true, checkInRevision: 1 })
  expect(saved.dispatches[0].receipts[0].investigationRevision).toBe(savedPlan.revision)
  // Before the pupil answers, nothing is interpreted.
  await expect(page.getByRole('region', { name: 'Resultat av uppföljningen', exact: true })).toContainText('inte lämnat svar')

  await student.goto(`/student/${pupil.studentId}`)
  await student.getByRole('button', { name: 'Uppföljning: subtraktion', exact: true }).click()
  const heading = student.getByRole('heading', { name: /^\d+ − \d+$/u })
  let first = true
  for (;;) {
    await expect(heading).toBeVisible()
    const shown = await heading.innerText()
    const [a, b] = shown.split('−').map(s => Number(s.trim()))
    if (first) {
      await student.getByRole('textbox', { name: 'Mitt svar', exact: true }).pressSequentially(String(a - b))
      await expect(student.getByText('Alla skickade ändringar är sparade på servern.')).toBeVisible()
      await page.reload()
      const partial = page.getByRole('region', { name: 'Resultat av uppföljningen', exact: true })
      await expect(partial).toContainText('Delresultat')
      await expect(partial).not.toContainText('talar emot misstanken')
      await expect(partial).not.toContainText('utan tips')
      await partial.screenshot({ path: testInfo.outputPath('followup-partial.png') })
      for (let index = 0; index < String(a - b).length; index++) {
        await student.getByRole('textbox', { name: 'Mitt svar', exact: true }).press('Backspace')
      }
      first = false
    }
    await student.getByRole('textbox', { name: 'Mitt svar', exact: true }).pressSequentially(String(smallerFromLarger(a, b)))
    const next = student.getByRole('button', { name: 'Nästa fråga', exact: true })
    if (await next.count() === 0) break
    await next.click()
    await expect(heading).not.toHaveText(shown)
  }
  await student.getByRole('button', { name: 'Lämna in svaren', exact: true }).click()
  await expect(student).toHaveURL(new RegExp(`/student/${pupil.studentId}$`))
  await pupilContext.close()

  await page.reload()
  const results = page.getByRole('region', { name: 'Resultat av uppföljningen', exact: true })
  await expect(results).toContainText('Observationer')
  await expect(results).toContainText('Större minus mindre i varje kolumn')
  await expect(results).not.toContainText('talar för misstanken')
  await expect(results).not.toContainText('talar emot misstanken')
  await expect(results).toContainText('Prövar: Större minus mindre i varje kolumn')
  await expect(results.getByLabel('Rapportens avstämning')).toContainText('Pröva avskrivning innan en metod antas.')
  await expect(results.getByText('Möjliga samtalsingångar')).toBeVisible()
  await results.screenshot({ path: testInfo.outputPath('followup-results.png') })
  // An incomplete history read cannot leave an old result on screen. Retry is
  // an explicit action and succeeds after the simulated paging failure clears.
  const evidenceRoute = '**/api/teacher-students/*'
  await page.route(evidenceRoute, async route => {
    if (new URL(route.request().url()).searchParams.get('resource') !== 'evidence') return route.continue()
    const response = await route.fetch()
    const data = await response.json()
    await route.fulfill({ response, json: { ...data, nextCursor: data.nextCursor || `${data.snapshotRevision}:0` } })
  })
  await results.getByRole('button', { name: 'Hämta svar igen', exact: true }).click()
  await expect(results.getByRole('status')).toContainText('fullständigt')
  await expect(results).not.toContainText('Observationer:')
  await page.unroute(evidenceRoute)
  await results.getByRole('button', { name: 'Hämta svar igen', exact: true }).click()
  await expect(results).toContainText('Inlämnade svar')
  await expect(results).toContainText('Observationer:')
  await page.route(evidenceRoute, async route => {
    if (new URL(route.request().url()).searchParams.get('resource') !== 'evidence') return route.continue()
    const response = await route.fetch()
    const data = await response.json()
    for (const entry of data.entries) if (entry.reference?.assignmentId === saved.dispatches[0].receipts[0].assignmentId) {
      entry.answer.correctAnswer = 999
      entry.interpretation.predictable.matches = [{ modelId: 'carry_forget' }]
    }
    await route.fulfill({ response, json: data })
  })
  await results.getByRole('button', { name: 'Hämta svar igen', exact: true }).click()
  await expect(results.getByRole('status')).toContainText('facit stämmer inte')
  await expect(results).not.toContainText('Observationer:')
  await expect(results).not.toContainText('Andra träffar i aktuell analys')
  await page.unroute(evidenceRoute)
  await results.getByRole('button', { name: 'Hämta svar igen', exact: true }).click()
  await expect(results).toContainText('Observationer:')
})

test('Multiplication contrasts display the same operation as their reviewed bank questions', async ({ page, request, browser }) => {
  const classId = `followup-mul-${Math.random().toString(36).slice(2, 8)}`
  const pupil = await createPupil(request, { classId, name: 'Followup Multiplication' })
  const teacher = await createTeacher(request, { classIds: [classId], role: 'super_admin' })
  await teacherLogin(page, teacher)
  const created = await teacherRequest(page, '/api/teacher-diagnostic-assignments', {
    classId, studentIds: [pupil.studentId], taskIds: ['mul-carry-002'], titleSv: 'Multiplikation först' })
  expect(created.status).toBe(201)
  const pupilContext = await browser.newContext()
  const student = await pupilContext.newPage()
  await login(student, pupil)
  await student.getByRole('button', { name: 'Multiplikation först', exact: true }).click()
  await student.getByRole('textbox', { name: 'Mitt svar', exact: true }).pressSequentially('282')
  await student.getByRole('button', { name: 'Lämna in svaren', exact: true }).click()
  await page.goto(`/teacher/student/${pupil.studentId}`)
  const panel = page.getByRole('region', { name: 'Analys och avstämning', exact: true })
  await panel.getByRole('button', { name: /^Analys och avstämning/ }).click()
  await expect(panel.getByRole('status')).toContainText('inlästa')
  await panel.getByLabel('Underlag', { exact: true }).selectOption('screening')
  await panel.getByRole('button', { name: 'Skapa granskningsunderlag', exact: true }).click()
  await panel.getByRole('button', { name: 'Pröva med kontrastfrågor', exact: true }).first().click()
  const contrast = panel.getByRole('region', { name: 'Kontrastfrågor', exact: true })
  await expect(contrast.locator('tbody tr').first().locator('td').first()).toHaveText(/^\d+ × \d+$/u)
  await pupilContext.close()
})
