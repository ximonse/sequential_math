import { test, expect } from '@playwright/test'
import { createPupil, login, readState, readServerProfile, answerText, fillAnswer, submit, next, waitForTask } from './lib/app.js'

test('Talpar: mastered pupil starts at the bottom, finishes mixed level and chooses restart', async ({ page, request }, testInfo) => {
  test.setTimeout(300000)
  const pupil = await createPupil(request, { operations: ['number_bonds'] })
  expect((await request.post('/__robot/fluency-history', { data: { studentId: pupil.studentId } })).ok()).toBe(true)
  await login(page, pupil)
  await page.goto(`/student/${pupil.studentId}/practice?mode=number_bonds`)
  let current = await waitForTask(page)
  expect(current.state.problem.level).toBe(1)
  const levels = []
  const mixedProblemIds = []
  let previousLevel = 1
  let covered = new Set()
  const requiredCount = level => level <= 6 ? 11 : level <= 8 ? 16 : level <= 10 ? 21 : 48
  for (let i = 0; i < 650; i++) {
    current = await waitForTask(page)
    expect(current.timedOut).not.toBe(true)
    const problem = current.state.problem
    expect(problem.skill).toBe('number_bonds')
    expect([previousLevel, previousLevel + 1]).toContain(problem.level)
    if (problem.level !== previousLevel) {
      expect(covered.size).toBe(requiredCount(previousLevel))
      covered = new Set()
      previousLevel = problem.level
    }
    levels.push(problem.level)
    covered.add(`${problem.values.target}:${problem.values.knownTerm}`)
    if (problem.level === 12) mixedProblemIds.push(problem.id)
    await fillAnswer(page, answerText(problem))
    await submit(page)
    await next(page)
    if (await page.getByText('Du klarade högsta nivån!').isVisible().catch(() => false)) break
  }
  await next(page)
  await expect(page.getByText('Du klarade högsta nivån!')).toBeVisible()
  expect(covered.size).toBe(48)
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
  expect(levels.length).toBeGreaterThanOrEqual(236)
  expect((await readState(page)).phase).toBe('answering')
})


test('Talpar: visar hela omgångens täckning och tidsmål', async ({ page, request }, testInfo) => {
  const pupil = await createPupil(request, { operations: ['number_bonds'] })
  await login(page, pupil)
  await page.goto(`/student/${pupil.studentId}/practice?mode=number_bonds`)
  const current = await waitForTask(page)
  await expect(page.getByText('Nivå 1 · 0/11 talpar · mål under 10 s i snitt')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('talpar-foundation.png') })
  await fillAnswer(page, answerText(current.state.problem))
  await submit(page)
  await next(page)
  await expect(page.getByText('Nivå 1 · 1/11 talpar · mål under 10 s i snitt')).toBeVisible()
})
