import { test, expect } from '@playwright/test'
import { createPupil, login, readState, readServerProfile, answerText, fillAnswer, submit, next, waitForTask } from './lib/app.js'

test('Talpar: mastered pupil starts at the bottom, finishes mixed level and chooses restart', async ({ page, request }, testInfo) => {
  test.setTimeout(180000)
  const pupil = await createPupil(request, { operations: ['number_bonds'] })
  expect((await request.post('/__robot/fluency-history', { data: { studentId: pupil.studentId } })).ok()).toBe(true)
  await login(page, pupil)
  await page.goto(`/student/${pupil.studentId}/practice?mode=number_bonds`)
  let current = await waitForTask(page)
  expect(current.state.problem.level).toBe(1)
  const levels = []
  const mixedTargets = new Set()
  for (let i = 0; i < 60; i++) {
    current = await waitForTask(page)
    expect(current.timedOut).not.toBe(true)
    const problem = current.state.problem
    expect(problem.skill).toBe('number_bonds')
    expect(problem.level).toBe(Math.min(13, Math.floor(i / 3) + 1))
    levels.push(problem.level)
    if (problem.level === 13) mixedTargets.add(problem.values.target)
    await fillAnswer(page, answerText(problem))
    await submit(page)
    if (problem.level === 13 && mixedTargets.size === 3 && i >= 38) break
  }
  await next(page)
  await expect(page.getByText('Du klarade högsta nivån!')).toBeVisible()
  expect([...mixedTargets].sort()).toEqual([10, 15, 20])
  await page.screenshot({ path: testInfo.outputPath('talpar-complete.png') })
  await page.getByRole('button', { name: 'Börja om från nivå 1', exact: true }).click()
  expect((await waitForTask(page)).state.problem.level).toBe(1)
  await page.screenshot({ path: testInfo.outputPath('talpar-restarted.png') })
  await page.getByRole('button', { name: 'Startsida', exact: true }).click()
  await page.waitForURL(/\/student\/[^/]+$/)
  await expect.poll(async () => {
    const profile = await readServerProfile(request, pupil.studentId)
    return (profile?.problemLog || []).some(row => row.operation === 'number_bonds' && row.level === 13)
  }, { timeout: 10000 }).toBe(true)
  await expect(page.getByText(/Ett eller flera svar avvisades/)).toHaveCount(0)
  await page.goto(`/student/${pupil.studentId}/practice?mode=number_bonds`)
  expect((await waitForTask(page)).state.problem.level).toBe(1)
  expect(levels.length).toBeGreaterThanOrEqual(39)
  expect((await readState(page)).phase).toBe('answering')
})
