import { test, expect } from '@playwright/test'
import { createPupil, login } from './lib/app.js'
import { createTeacher, teacherLogin } from './lib/teacher.js'

// Simon 2026-11-03: changing question and activity was slow because every page
// started over (session check, full profile, collection list). Now a page change
// within a minute reuses the start and the collection list.
test('Changing question loads neither the profile nor the collection list again', async ({ page, request, browser }) => {
  const tag = Math.random().toString(36).slice(2, 8)
  const classId = `speed-${tag}`
  const pupil = await createPupil(request, { name: 'Speed Pupil', classId })
  const teacher = await createTeacher(request, { classIds: [classId], role: 'super_admin' })
  await teacherLogin(page, teacher)
  await page.evaluate(async data => {
    const response = await fetch('/api/teacher-diagnostic-assignments', { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-teacher-token': sessionStorage.getItem('mathapp_teacher_api_token') },
      body: JSON.stringify(data) })
    if (!response.ok) throw new Error(`Could not create screening: ${response.status}`)
  }, { classId, studentIds: [pupil.studentId], titleSv: 'Snabb', taskIds: ['add-no-carry-001', 'add-carry-001', 'sub-exchange-001'] })

  const context = await browser.newContext({ viewport: { width: 820, height: 1180 }, hasTouch: true })
  const student = await context.newPage()
  await login(student, pupil)
  await student.getByRole('button', { name: 'Snabb', exact: true }).click()
  await expect(student.getByText('Fråga 1 av 3', { exact: true })).toBeVisible()
  // Let the first load finish before counting.
  await student.waitForLoadState('networkidle')
  const calls = []
  student.on('request', req => { const url = new URL(req.url()); if (url.pathname.startsWith('/api/')) calls.push(`${req.method()} ${url.pathname}`) })
  await student.locator('input[data-cell="0:0"]').tap()
  await student.getByRole('button', { name: 'Skriv 5', exact: true }).tap()
  await student.getByRole('button', { name: 'Nästa fråga', exact: true }).click()
  await expect(student.getByText('Fråga 2 av 3', { exact: true })).toBeVisible()
  expect(calls.filter(call => call.includes('/api/me/profile'))).toEqual([])
  expect(calls.filter(call => call.includes('/api/student-session'))).toEqual([])
  expect(calls.filter(call => call.includes('/api/me/diagnostic-assignments'))).toEqual([])
  // The answer was saved before the change; going back shows it.
  await student.getByRole('button', { name: '← Förra frågan', exact: true }).click()
  await expect(student.getByText('Fråga 1 av 3', { exact: true })).toBeVisible()
  await expect(student.locator('input[data-cell="0:0"]')).toHaveAttribute('aria-label', /stor siffra 5/)
  await context.close()
})
