import { test, expect } from '@playwright/test'
import { writeFile } from 'node:fs/promises'
import { createPupil, login, readServerProfile } from './lib/app.js'
import { createTeacher, teacherLogin } from './lib/teacher.js'

test('Transition matrix measures usable views and preserves screening work with delayed storage', async ({ page, request, browser }, info) => {
  test.skip(process.env.ROBOT_MEASURE_TRANSITIONS !== '1', 'Explicit isolated performance run; do not mix load with the normal suite.')
  const tag = Math.random().toString(36).slice(2, 8), classId = `latency-${tag}`
  const pupil = await createPupil(request, { name: 'Speed Pupil', classId, className: `Latency ${tag}` })
  const other = await createPupil(request, { name: 'Order Pupil', classId: `${classId}-b`, className: `Other ${tag}` })
  const teacher = await createTeacher(request, { classIds: [classId, `${classId}-b`], role: 'super_admin' })
  const samples = [], requests = []
  async function measure(target, name, action, ready, budgetMs) {
    const started = await target.evaluate(() => performance.timeOrigin + performance.now())
    await action(); await ready()
    const ms = await target.evaluate(start => Math.round(performance.timeOrigin + performance.now() - start), started)
    expect(ms).toBeGreaterThanOrEqual(0)
    samples.push({ name, ms, budgetMs, withinBudget: budgetMs === undefined ? null : ms <= budgetMs })
  }
  const watch = target => target.on('response', async response => {
    const url = new URL(response.url())
    if (!url.pathname.startsWith('/api/')) return
    requests.push({ path: url.pathname.replace(/[A-F0-9]{32}/g, ':pupil'), status: response.status(), serverTiming: response.headers()['server-timing'] || null })
  })
  watch(page)
  await measure(page, 'teacher-login-to-class-picker', () => teacherLogin(page, teacher),
    () => expect(page.locator('.dashboard-class-filter').getByRole('button', { name: `Latency ${tag}`, exact: true })).toBeVisible())
  const created = await page.evaluate(async input => {
    const r = await fetch('/api/teacher-diagnostic-assignments', { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-teacher-token': sessionStorage.getItem('mathapp_teacher_api_token') }, body: JSON.stringify(input) })
    return { status: r.status }
  }, { classId, studentIds: [pupil.studentId], titleSv: 'Latency screening', taskIds: ['add-no-carry-001', 'add-carry-001', 'sub-exchange-001'] })
  expect(created.status).toBe(201)
  const context = await browser.newContext(), student = await context.newPage()
  await student.addInitScript(() => {
    const realNow = Date.now
    window.transitionClockOffset = 0
    Date.now = () => realNow() + window.transitionClockOffset
  })
  watch(student)
  try {
    await measure(student, 'pupil-login-to-home', () => login(student, pupil),
      () => expect(student.getByRole('region', { name: 'Fri träning', exact: true }).getByRole('button', { name: 'Fri träning', exact: true })).toBeEnabled())
    const home = student.getByRole('button', { name: 'Startsida', exact: true })
    const practice = student.getByRole('region', { name: 'Fri träning', exact: true }).getByRole('button', { name: 'Fri träning', exact: true })
    const answer = student.locator('input[placeholder="?"]')
    for (let i = 0; i < 10; i++) {
      await measure(student, 'warm-home-to-practice', () => practice.click(), () => expect(answer).toBeEditable(), 1000)
      if (i === 0) {
        await measure(student, 'practice-answer-to-feedback', async () => {
          await answer.fill('0'); await student.getByRole('button', { name: 'Svara', exact: true }).click()
        }, () => expect(student.getByRole('button', { name: 'Nästa', exact: true })).toBeVisible(), 1000)
        await measure(student, 'practice-next-question', () => student.getByRole('button', { name: 'Nästa', exact: true }).click(),
          () => expect(answer).toBeEditable(), 1000)
      }
      await measure(student, 'warm-practice-to-home', () => home.click(), () => expect(practice).toBeEnabled(), 1000)
    }
    // Expire the existing 60-second reuse window without changing the timing clock.
    await student.evaluate(() => { window.transitionClockOffset = 61000 })
    const beforeRevalidation = requests.length
    await measure(student, 'revalidated-home-to-practice', () => practice.click(), () => expect(answer).toBeEditable())
    expect(requests.slice(beforeRevalidation).some(r => r.path === '/api/student-session')).toBe(process.env.ROBOT_TRANSITION_BASELINE === '1')
    expect(requests.slice(beforeRevalidation).some(r => r.path === '/api/me/profile')).toBe(true)
    await home.click(); await expect(practice).toBeEnabled()
    const tables = student.locator('section', { hasText: 'Tabellträning' })
    await tables.getByRole('button', { name: '7', exact: true }).click()
    await measure(student, 'home-to-table-practice', () => tables.getByRole('button', { name: 'Kör', exact: true }).click(),
      () => expect(answer).toBeEditable(), 1000)
    expect(new URL(student.url()).searchParams.get('tables')).toBe('7')
    await home.click(); await expect(practice).toBeEnabled()
    const beforeDiagnostic = await readServerProfile(request, pupil.studentId)
    await measure(student, 'screening-open', () => student.getByRole('button', { name: 'Latency screening', exact: true }).click(),
      () => expect(student.getByRole('textbox', { name: 'Mitt svar', exact: true })).toBeVisible())
    await student.locator('input[data-cell="0:0"]').press('5')
    for (let i = 0; i < 10; i++) {
      await measure(student, 'screening-next-including-save', () => student.getByRole('button', { name: 'Nästa fråga', exact: true }).click(),
        () => expect(student.getByText('Fråga 2 av 3', { exact: true })).toBeVisible())
      await measure(student, 'screening-previous', () => student.getByRole('button', { name: '← Förra frågan', exact: true }).click(),
        () => expect(student.locator('input[data-cell="0:0"]')).toHaveAttribute('aria-label', /stor siffra 5/))
    }
    student.once('dialog', dialog => dialog.accept())
    await measure(student, 'screening-submit-collection', () => student.getByRole('button', { name: 'Lämna in svaren', exact: true }).click(),
      () => expect(student).toHaveURL(new RegExp(`/student/${pupil.studentId}$`)))
    const afterDiagnostic = await readServerProfile(request, pupil.studentId)
    expect(afterDiagnostic.masteryFacts).toEqual(beforeDiagnostic.masteryFacts)
    expect(afterDiagnostic.problemLog).toEqual(beforeDiagnostic.problemLog)
    const panel = page.locator('.dashboard-class-filter')
    for (let i = 0; i < 10; i++) {
      const clear = page.getByRole('button', { name: 'Rensa klassurval', exact: true })
      if (await clear.isVisible()) await clear.click()
      const name = i % 2 ? `Other ${tag}` : `Latency ${tag}`
      await measure(page, 'teacher-class-change-to-results', () => panel.getByRole('button', { name, exact: true }).click(),
        () => expect(page.locator('[data-history-state="ready"]')).toBeAttached())
    }
    // Screening results became a tab inside Screening (2026-11-07); the old
    // measurement names are kept so earlier evidence stays comparable.
    const screening = page.getByRole('region', { name: 'Screening', exact: true })
    for (const [label, open, ready] of [
      ['Screening: skapa', () => page.getByRole('navigation', { name: 'Lärarvy' }).getByRole('button', { name: /^Screening/ }).click(), () => expect(screening).toBeVisible()],
      ['Screening: resultat', () => screening.getByRole('tab', { name: 'Resultat', exact: true }).click(),
        () => expect(page.getByRole('region', { name: 'Resultat av screening', exact: true })).toBeVisible()],
      ['Framsteg', () => page.getByRole('button', { name: 'Framsteg', exact: true }).click(), () => expect(page.locator('[data-admin-panel="overview"]')).toBeVisible()],
    ]) await measure(page, `teacher-workspace-${label}`, open, ready)
    // Catalog may be present before detailed pupil history is usable.
    for (const selected of [pupil, other]) {
      await measure(page, 'teacher-open-pupil-detail', () => page.goto(`/teacher/student/${selected.studentId}`),
        () => expect(page.getByRole('region', { name: 'Analys och avstämning', exact: true })).toBeVisible())
      const analysis = page.getByRole('region', { name: 'Analys och avstämning', exact: true })
      // The analysis opens by itself; measure until its first answer is in view.
      await measure(page, 'teacher-open-analysis-history', async () => {},
        () => expect(analysis.getByRole('status')).toContainText(/inlästa|Förhandsvisning/))
      await analysis.getByLabel('Underlag', { exact: true }).selectOption('screening')
      await measure(page, 'teacher-read-screening-evidence', () => analysis.getByRole('button', { name: 'Skapa granskningsunderlag', exact: true }).click(),
        () => expect(analysis.getByRole('region', { name: 'Analysrapport', exact: true })).toBeVisible())
    }
    await page.screenshot({ path: info.outputPath('teacher-transition-final.png') })
  } finally {
    const result = { environment: 'isolated-memory-storage', readDelayMs: Number(process.env.ROBOT_KV_READ_DELAY_MS) || 0,
      samples, requests, remainingOverBudget: samples.filter(s => s.withinBudget === false) }
    const file = info.outputPath('transition-matrix.json')
    await writeFile(file, JSON.stringify(result, null, 2))
    await info.attach('transition-matrix', { path: file, contentType: 'application/json' })
    await context.close()
  }
  if (process.env.ROBOT_TRANSITION_BASELINE !== '1') {
    expect(samples.filter(s => s.withinBudget === false), 'Warm transitions still exceed the local budget').toEqual([])
  }
})
