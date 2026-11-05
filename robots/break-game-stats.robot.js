import { test, expect } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { createPupil, login, readServerProfile, answerText, fillAnswer, submit, next, waitForTask } from './lib/app.js'
import { createTeacher } from './lib/teacher.js'

test('Pause games: completed Pong and aborted Snake persist independently and expose only authorized aggregates', async ({ page, request, baseURL }) => {
  test.setTimeout(180000)
  const pupil = await createPupil(request, { operations: ['number_bonds'] })
  const teacher = await createTeacher(request, { classIds: [pupil.classId] })
  const outsider = await createPupil(request, { operations: ['addition'] })
  expect((await request.get(`/api/students?resource=break-games&classId=${pupil.classId}`)).status()).toBe(401)
  const loginResponse = await request.post('/api/teacher-login', { data: { username: teacher.username, password: teacher.password } })
  const { token } = await loginResponse.json()
  const headers = { 'x-teacher-token': token }
  expect((await request.get(`/api/students?resource=break-games&classId=${outsider.classId}`, { headers })).status()).toBe(403)
  await login(page, pupil)
  await page.goto(`/student/${pupil.studentId}/practice?mode=number_bonds`)
  for (let i = 0; i < 15; i++) {
    const current = await waitForTask(page)
    await fillAnswer(page, answerText(current.state.problem))
    await submit(page)
    await next(page)
  }
  await page.getByRole('button', { name: /Spela Pong/ }).click()
  await expect(page.locator('canvas')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Tillbaka till matten', exact: true })).toBeVisible({ timeout: 105000 })
  await page.getByRole('button', { name: 'Tillbaka till matten', exact: true }).click()
  for (let i = 0; i < 15; i++) {
    const current = await waitForTask(page)
    await fillAnswer(page, answerText(current.state.problem))
    await submit(page)
    await next(page)
  }
  await page.getByRole('button', { name: /Spela Snake/ }).click()
  await expect(page.locator('canvas')).toBeVisible()
  await page.getByRole('button', { name: 'Avsluta spelet', exact: true }).click()
  await expect.poll(async () => (await readServerProfile(request, pupil.studentId))?.breakGameResults?.length || 0).toBe(2)
  const profile = await readServerProfile(request, pupil.studentId)
  expect(profile.problemLog).toHaveLength(30)
  expect(profile.breakGameResults.find(round => round.game === 'pong')).toMatchObject({ reason: 'time_limit', durationMs: 90000 })
  expect(profile.breakGameResults.find(round => round.game === 'snake')).toMatchObject({ reason: 'aborted' })
  const response = await request.get(`/api/students?resource=break-games&classId=${pupil.classId}`, { headers })
  expect(response.ok()).toBe(true)
  const summary = await response.json()
  expect(summary.games.pong).toMatchObject({ rounds: 1, completed: 1, aborted: 0 })
  expect(summary.games.pong.wins + summary.games.pong.draws + summary.games.pong.losses).toBe(1)
  expect(summary.games.snake).toMatchObject({ rounds: 1, completed: 0, aborted: 1 })
  expect(JSON.stringify(summary)).not.toContain(pupil.studentId)
  const output = execFileSync(process.execPath, ['scripts/pause-game-stats.mjs', '--base', baseURL], {
    encoding: 'utf8', env: { ...process.env, MATH_TEACHER_USER: teacher.username, MATH_TEACHER_PASS: teacher.password }
  })
  expect(JSON.parse(output).summaries).toHaveLength(1)
  expect(JSON.parse(output).summaries[0].games.pong.rounds).toBe(1)
})
