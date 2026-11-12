// Several suspicions in one screening, end to end: two computed suspicions in
// different areas → one private draft → approval and dispatch → one screening
// for the pupil → results judged per suspicion on its own questions only.
import { test, expect } from '@playwright/test'
import { createPupil, login } from './lib/app.js'
import { createTeacher, teacherLogin } from './lib/teacher.js'

async function teacherRequest(page, url) {
  return page.evaluate(async url => {
    const response = await fetch(url, { headers: { 'x-teacher-token': sessionStorage.getItem('mathapp_teacher_api_token') } })
    return { status: response.status, data: await response.json() }
  }, url)
}

const add = (a, b, answer) => ({ operation: 'addition', domain: 'arithmetic', skill: 'addition', problemType: 'addition_A', level: 4,
  values: { a, b }, promptText: `${a} + ${b}`, studentAnswer: answer, correctAnswer: a + b })
const mul = (a, b, answer) => ({ operation: 'multiplication', domain: 'arithmetic', skill: 'multiplication', problemType: 'multiplication_A', level: 2,
  values: { a, b }, promptText: `${a} · ${b}`, studentAnswer: answer, correctAnswer: a * b })
// Column sums without carrying.
const withoutCarry = (a, b) => {
  const left = String(a), right = String(b).padStart(left.length, '0')
  return Number(left.split('').map((digit, i) => (Number(digit) + Number(right[i])) % 10).join(''))
}

test('Two suspicions share one screening and are judged on their own questions', async ({ page, request, browser }) => {
  test.skip(process.env.ROBOT_DEV !== '1', 'Cookie approval requires the local development origin policy; run with ROBOT_DEV=1.')
  const classId = `multi-${Math.random().toString(36).slice(2, 8)}`
  const pupil = await createPupil(request, { classId, name: 'Multi Pupil', operations: ['addition', 'multiplication'] })
  const seeded = await (await request.post('/__robot/seed-practice-log', { data: { studentId: pupil.studentId,
    rows: [add(4, 88, 82), add(9, 69, 68), mul(46, 7, 282), mul(38, 6, 188)] } })).json()
  expect(seeded.ok).toBe(true)
  const teacher = await createTeacher(request, { classIds: [classId], role: 'super_admin' })
  await teacherLogin(page, teacher)

  await page.goto(`/teacher/student/${pupil.studentId}`)
  const panel = page.getByRole('region', { name: 'Analys och avstämning', exact: true })
  await expect(panel.getByRole('status')).toContainText(/inlästa|Förhandsvisning/)
  await panel.locator('[data-hypothesis="carry_forget"]').getByLabel('Pröva tillsammans').check()
  await expect(panel).toContainText('Välj minst en misstanke till')
  await panel.locator('[data-hypothesis="mul_carry_forgotten"]').getByLabel('Pröva tillsammans').check()
  const shared = panel.getByRole('region', { name: 'Gemensam prövning', exact: true })
  await shared.getByRole('button', { name: 'Skapa gemensamt utkast', exact: true }).click()
  await expect(shared.getByRole('status')).toContainText('Privat utkast sparat')
  await shared.getByRole('link', { name: 'Öppna granskning', exact: true }).click()
  const intent = page.getByRole('region', { name: 'Prövningsavsikt', exact: true })
  await expect(intent).toContainText('2 misstankar i samma screening')
  await expect(intent).toContainText('Minnessiffran glöms')
  await expect(intent).toContainText('Minnessiffran glöms i multiplikationen')

  await page.getByRole('checkbox', { name: /Jag har granskat/ }).check()
  await page.getByRole('button', { name: 'Godkänn version 1', exact: true }).click()
  await expect(page.getByText('Version 1 är godkänd.', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: /^Dela ut till 1 elev/ }).click()
  await expect(page.getByText(/1 av 1 mottagare är bekräftade/)).toBeVisible()
  const draftId = new URL(page.url()).pathname.split('/').at(-1)
  const saved = (await teacherRequest(page, `/api/teacher-material?draftId=${draftId}`)).data
  const material = saved.draft.versions[0].material
  expect(material.investigation).toBeUndefined()
  expect(material.investigations.map(plan => plan.modelId)).toEqual(['carry_forget', 'mul_carry_forgotten'])
  expect(saved.dispatches[0].receipts[0].investigationRevision).toBe(material.investigationsRevision)
  const additionTasks = new Set(material.investigations[0].taskIds)

  // The pupil sees one screening; addition answered without carrying, multiplication right.
  const pupilContext = await browser.newContext()
  const student = await pupilContext.newPage()
  await login(student, pupil)
  await student.getByRole('button', { name: 'Uppföljning', exact: true }).click()
  const heading = student.getByRole('heading', { name: /\d+ [+×·] \d+/u })
  for (;;) {
    await expect(heading).toBeVisible()
    const shown = await heading.innerText()
    const [, a, operator, b] = shown.match(/(\d+) ([+×·]) (\d+)/u).map((part, index) => index === 2 ? part : Number(part))
    const answer = operator === '+' ? withoutCarry(a, b) : a * b
    await student.getByRole('textbox', { name: 'Mitt svar', exact: true }).pressSequentially(String(answer))
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
  await expect(results).toContainText('Misstanke 1 av 2: Minnessiffran glöms')
  await expect(results).toContainText('Misstanke 2 av 2: Minnessiffran glöms i multiplikationen')
  const rows = await results.locator('table.followup-results').evaluateAll(tables => tables.map(table =>
    [...table.querySelectorAll('tbody tr')].map(row => row.innerText)))
  expect(rows).toHaveLength(2)
  expect(rows[0].length).toBe(additionTasks.size)
  expect(rows[0].every(row => row.includes('Minnessiffran glöms'))).toBe(true)
  expect(rows[1].every(row => row.includes('Rätt'))).toBe(true)
})

test('A table fact answered wrong is asked again and the same wrong answer is shown as such', async ({ page, request, browser }) => {
  test.skip(process.env.ROBOT_DEV !== '1', 'Cookie approval requires the local development origin policy; run with ROBOT_DEV=1.')
  const classId = `repeat-${Math.random().toString(36).slice(2, 8)}`
  const pupil = await createPupil(request, { classId, name: 'Repeat Pupil', operations: ['multiplication'] })
  expect((await (await request.post('/__robot/seed-practice-log', { data: { studentId: pupil.studentId,
    // Three different facts one table step off form a pattern (Simon 2026-11-12); two do not.
    rows: [mul(7, 8, 48), mul(6, 9, 48), mul(8, 8, 72), mul(6, 7, 42)] } })).json()).ok).toBe(true)
  const teacher = await createTeacher(request, { classIds: [classId], role: 'super_admin' })
  await teacherLogin(page, teacher)
  await page.goto(`/teacher/student/${pupil.studentId}`)
  const panel = page.getByRole('region', { name: 'Analys och avstämning', exact: true })
  await expect(panel.getByRole('status')).toContainText(/inlästa|Förhandsvisning/)
  const card = panel.locator('[data-hypothesis="table_off_by_one"]')
  // Simple facts are asked again; the written-multiplication contrast questions do not apply.
  await expect(card.getByRole('button', { name: 'Pröva med kontrastfrågor', exact: true })).toHaveCount(0)
  await card.getByRole('button', { name: 'Fråga igen', exact: true }).click()
  const box = card.getByRole('region', { name: 'Fråga igen', exact: true })
  await box.getByRole('button', { name: 'Skapa utkast', exact: true }).click()
  await expect(box.getByRole('status')).toContainText('Privat utkast sparat')
  await box.getByRole('link', { name: 'Öppna granskning', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Fråga igen', exact: true })).toContainText('7 · 8 = 56 · tidigare svar 48')
  await page.getByRole('checkbox', { name: /Jag har granskat/ }).check()
  await page.getByRole('button', { name: 'Godkänn version 1', exact: true }).click()
  await expect(page.getByText('Version 1 är godkänd.', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: /^Dela ut till 1 elev/ }).click()
  await expect(page.getByText(/1 av 1 mottagare är bekräftade/)).toBeVisible()

  const pupilContext = await browser.newContext()
  const student = await pupilContext.newPage()
  await login(student, pupil)
  await student.getByRole('button', { name: 'Uppföljning', exact: true }).click()
  const heading = student.getByRole('heading', { name: /\d+ · \d+/u })
  for (;;) {
    await expect(heading).toBeVisible()
    const shown = await heading.innerText()
    const [, a, b] = shown.match(/(\d+) · (\d+)/u).map(Number)
    // The same wrong answer as before on 7 · 8, everything else right.
    await student.getByRole('textbox', { name: 'Mitt svar', exact: true }).fill(String(a === 7 && b === 8 ? 48 : a * b))
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
  await expect(results).toContainText('Inlämnade svar')
  await expect(results.getByRole('row', { name: /7 · 8 = 56/ })).toContainText('Samma fel igen')
  await expect(results.getByRole('row', { name: /6 · 9 = 54/ })).toContainText('Rätt nu')
})
