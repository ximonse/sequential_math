import { test, expect } from '@playwright/test'
import { createPupil, login, readServerProfile } from './lib/app.js'
import { createTeacher, teacherLogin } from './lib/teacher.js'

test('Fokusresultat: bara huvudadmin ser historik, också i vanlig lärarvy', async ({ page, request }) => {
  const classId = `private-focus-${Math.random().toString(36).slice(2, 8)}`
  const pupil = await createPupil(request, { classId, operations: ['addition'] })
  await login(page, pupil)
  const result = { id: 'private-focus', version: 1, mode: 'choose', startedAt: Date.now() - 120000,
    finishedAt: Date.now(), activeMs: 120000, aborted: false,
    summary: { hits: 8, misses: 0, wrong: 0, withheld: 2, early: 0, median: 300 } }
  expect(await page.evaluate(async payload => {
    const session = await (await fetch('/api/student-session')).json()
    return (await fetch('/api/me/events', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-csrf-token': session.csrfToken },
      body: JSON.stringify({ entries: [{ id: 'private-focus-event', type: 'attention_result', timestamp: payload.finishedAt, payload }] }) })).status
  }, result)).toBe(200)
  const before = await readServerProfile(request, pupil.studentId)
  await teacherLogin(page, await createTeacher(request, { classIds: [classId] }))
  await expect(page.getByRole('button', { name: /^Fokusövningar/ })).toHaveCount(0)
  const read = async path => page.evaluate(async url => {
    const response = await fetch(url, { headers: { 'x-teacher-token': sessionStorage.getItem('mathapp_teacher_api_token') } })
    return { status: response.status, data: await response.json() }
  }, path)
  for (const path of [`/api/teacher-students/${pupil.studentId}`, `/api/student/${pupil.studentId}`]) {
    const response = await read(path)
    expect(response.status).toBe(200)
    expect(response.data.profile.studentId).toBe(pupil.studentId)
    expect(response.data.profile).not.toHaveProperty('attentionHistory')
  }
  await page.goto(`/teacher/student/${pupil.studentId}`)
  await expect(page.getByRole('region', { name: 'Fokusaktiviteter', exact: true })).toHaveCount(0)
  await page.goto('/teacher/focus')
  await expect(page.getByRole('region', { name: 'Fokusövningar', exact: true })).toHaveCount(0)
  await expect(page.getByText('Fokusresultat är endast tillgängliga för huvudadmin.')).toBeVisible()

  const admin = await (await request.post('/__robot/teacher', { data: { id: `focus-admin-${classId}`, classIds: [classId], role: 'super_admin' } })).json()
  await page.getByRole('button', { name: 'Logga ut', exact: true }).click()
  await teacherLogin(page, admin)
  await expect(page.getByRole('button', { name: /^Fokusövningar/ })).toBeVisible()
  expect((await read(`/api/teacher-students/${pupil.studentId}`)).data.profile.attentionHistory).toEqual([result])
  await page.getByRole('button', { name: /^Fokusövningar/ }).click()
  await expect(page.getByTestId(`focus-signal-${pupil.studentId}-choose-go`)).toBeVisible()
  await page.goto(`/teacher/student/${pupil.studentId}`)
  await expect(page.getByRole('region', { name: 'Fokusaktiviteter', exact: true })).toContainText('2 - KONTROLL')
  expect(await readServerProfile(request, pupil.studentId)).toEqual(before)
})
