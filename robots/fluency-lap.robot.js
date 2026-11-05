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
  const mixedProblemIds = []
  let expectedLevel = 1
  let levelAnswers = 0
  for (let i = 0; i < 90; i++) {
    current = await waitForTask(page)
    expect(current.timedOut).not.toBe(true)
    const problem = current.state.problem
    expect(problem.skill).toBe('number_bonds')
    expect(problem.level).toBe(expectedLevel)
    levels.push(problem.level)
    levelAnswers++
    if (problem.level >= 10) mixedTargets.add(problem.values.target)
    if (problem.level === 12) mixedProblemIds.push(problem.id)
    await fillAnswer(page, answerText(problem))
    await submit(page)
    if (levelAnswers >= 3 && (expectedLevel < 10 || mixedTargets.size === 3)) {
      if (expectedLevel === 12) break
      expectedLevel++
      levelAnswers = 0
      mixedTargets.clear()
    }
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
    return (profile?.problemLog || []).some(row => row.operation === 'number_bonds' && row.level === 12 && mixedProblemIds.includes(row.problemId))
  }, { timeout: 10000 }).toBe(true)
  await expect(page.getByText(/Ett eller flera svar avvisades/)).toHaveCount(0)
  await page.goto(`/student/${pupil.studentId}/practice?mode=number_bonds`)
  expect((await waitForTask(page)).state.problem.level).toBe(1)
  expect(levels.length).toBeGreaterThanOrEqual(36)
  expect((await readState(page)).phase).toBe('answering')
})
