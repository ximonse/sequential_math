import { test, expect } from '@playwright/test'
import { createPupil, login } from './lib/app.js'
import { teacherLogin, openTab } from './lib/teacher.js'

test('Admin reviews a class with submitted, ongoing and unopened work; notes survive retries and competing edits', async ({ page, request, browser }, testInfo) => {
  const tag = Math.random().toString(36).slice(2, 8)
  const classId = `review-${tag}`
  const pupils = []
  for (const name of ['NCM review A', 'NCM review B', 'NCM review C']) pupils.push(await createPupil(request, { name, classId }))
  const teacher = await (await request.post('/__robot/teacher', { data: { id: `review-admin-${tag}`, classIds: [classId], role: 'super_admin' } })).json()
  await teacherLogin(page, teacher)
  await openTab(page, 'NCM-diagnostik')
  const panel = page.getByRole('heading', { name: 'Testuppdrag till elev eller klass' }).locator('xpath=..')
  await panel.getByRole('combobox', { name: 'Klass', exact: true }).selectOption(classId)
  await panel.getByRole('combobox', { name: 'Diagnospaket', exact: true }).selectOption('written-addition')
  await panel.getByRole('button', { name: 'Ge till hela klassen (3 elever)', exact: true }).click()
  await expect(panel.getByText('Uppdraget är tilldelat hela klassen (3 elever).')).toBeVisible()
  const assignmentId = await panel.getByRole('combobox', { name: 'Uppdrag att gå igenom', exact: true }).locator('option').nth(1).getAttribute('value')
  const contexts = []
  const studentPages = []
  for (const pupil of pupils.slice(0, 2)) {
    const context = await browser.newContext()
    contexts.push(context)
    const student = await context.newPage()
    studentPages.push(student)
    await login(student, pupil)
    await student.getByRole('button', { name: 'Räkna ut 268 + 431.', exact: true }).click()
    await student.locator('input[data-cell="0:0"]').fill('8')
    await student.getByRole('button', { name: 'Spara arbetet', exact: true }).click()
    await expect(student.getByText('Alla skickade ändringar är sparade på servern.')).toBeVisible()
  }
  await studentPages[0].getByRole('button', { name: 'Lämna in svaret', exact: true }).click()
  await expect(studentPages[0].getByRole('button', { name: 'Nästa fråga', exact: true })).toBeEnabled()
  const review = panel.getByRole('region', { name: 'Klassgenomgång', exact: true })
  await review.getByRole('combobox', { name: 'Uppdrag att gå igenom', exact: true }).selectOption(assignmentId)
  const rows = review.getByRole('row')
  await expect(rows).toHaveCount(4)
  await expect(rows.filter({ hasText: 'NCM review A' })).toContainText('1 / 6')
  await expect(rows.filter({ hasText: 'NCM review B' })).toContainText('Påbörjat')
  await expect(rows.filter({ hasText: 'NCM review C' })).toContainText('Inte påbörjat')
  await review.getByRole('button', { name: 'NCM review A · inlämnad', exact: true }).click()
  const form = review.getByRole('form', { name: 'Lärarens genomgång', exact: true })
  await form.getByRole('textbox', { name: 'Läraranteckning', exact: true }).fill('Be eleven förklara växlingen.')
  await form.getByRole('checkbox').check()
  await page.route('**/api/teacher-diagnostic-attempts', route => route.request().method() === 'POST' ? route.abort('failed') : route.continue())
  await form.getByRole('button', { name: 'Spara genomgång', exact: true }).click()
  await expect(form.getByText(/Din text finns kvar här/)).toBeVisible()
  await expect(form.getByRole('textbox')).toHaveValue('Be eleven förklara växlingen.')
  await page.unroute('**/api/teacher-diagnostic-attempts')
  await form.getByRole('button', { name: 'Spara genomgång', exact: true }).click()
  await expect(form.getByText('Genomgången är sparad på servern.')).toBeVisible()
  await expect(rows.filter({ hasText: 'NCM review A' }).getByRole('cell').last()).toHaveText('1 / 6')
  await review.getByRole('button', { name: 'Nästa elev', exact: true }).click()
  await expect(review.getByRole('gridcell', { name: /rad 1, kolumn 1, 8/ })).toBeVisible()
  await form.getByRole('checkbox').check()
  await form.getByRole('button', { name: 'Spara genomgång', exact: true }).click()
  await expect(form.getByText('Genomgången är sparad på servern.')).toBeVisible()
  await studentPages[1].locator('input[data-cell="0:0"]').fill('7')
  await studentPages[1].getByRole('button', { name: 'Spara arbetet', exact: true }).click()
  await expect(studentPages[1].getByText('Alla skickade ändringar är sparade på servern.')).toBeVisible()
  await review.getByRole('button', { name: 'Uppdatera klassöversikt', exact: true }).click()
  await expect(rows.filter({ hasText: 'NCM review B' }).getByRole('cell').last()).toHaveText('0 / 6')
  await review.getByRole('button', { name: 'Öppna senaste underlag', exact: true }).click()
  await expect(form.getByText('Eleven har ändrat underlaget sedan föregående genomgång.')).toBeVisible()
  await expect(form.getByRole('checkbox')).not.toBeChecked()
  await review.getByRole('button', { name: 'Föregående elev', exact: true }).click()
  await expect(form.getByRole('textbox')).toHaveValue('Be eleven förklara växlingen.')
  // A second teacher tab changes the shared note. The first tab must preserve
  // its draft and explicitly report the conflict instead of overwriting it.
  const conflict = await page.evaluate(async data => {
    const headers = { 'Content-Type': 'application/json', 'x-teacher-token': sessionStorage.getItem('mathapp_teacher_api_token') }
    const search = new URLSearchParams(data)
    const overview = await (await fetch(`/api/teacher-diagnostic-attempts?${search}`, { headers })).json()
    const attemptId = overview.attempts[0].attemptId
    const detail = await (await fetch(`/api/teacher-diagnostic-attempts?${new URLSearchParams({ ...data, attemptId })}`, { headers })).json()
    return (await fetch('/api/teacher-diagnostic-attempts', { method: 'POST', headers, body: JSON.stringify({ ...data, attemptId,
      expectedReviewRevision: detail.review.reviewRevision, evidenceRevision: detail.record.serverRevision,
      evidenceSequence: detail.record.lastSequence, reviewed: true, note: 'Anteckning från andra fliken.' }) })).status
  }, { classId, assignmentId, studentId: pupils[0].studentId })
  expect(conflict).toBe(200)
  await form.getByRole('textbox').fill('Min nya osparade fråga.')
  await form.getByRole('button', { name: 'Spara genomgång', exact: true }).click()
  await expect(form.getByText(/Genomgången har ändrats i en annan flik/)).toBeVisible()
  await expect(form.getByRole('textbox')).toHaveValue('Min nya osparade fråga.')
  page.once('dialog', dialog => dialog.dismiss())
  await review.getByRole('button', { name: 'Nästa elev', exact: true }).click()
  await expect(form.getByRole('textbox')).toHaveValue('Min nya osparade fråga.')
  await page.screenshot({ path: testInfo.outputPath('class-review-conflict.png'), fullPage: true })
  page.once('dialog', dialog => dialog.accept())
  await review.getByRole('button', { name: 'Öppna senaste underlag', exact: true }).click()
  await expect(form.getByRole('textbox')).toHaveValue('Anteckning från andra fliken.')
  await page.screenshot({ path: testInfo.outputPath('class-review.png'), fullPage: true })
  for (const context of contexts) await context.close()
})
