import { test, expect } from '@playwright/test'
import { answerText, createPupil, fillAnswer, login, next, readState, submit } from './lib/app.js'

test('a pupil can leave an already mastered level for adaptive practice', async ({ page, request }) => {
  const pupil = await createPupil(request, { operations: ['addition'] })
  await login(page, pupil)
  await page.goto(`/student/${pupil.studentId}/practice?mode=addition&level=1`)

  for (let index = 0; index < 5; index += 1) {
    await expect.poll(async () => (await readState(page)).phase).toBe('answering')
    const { problem } = await readState(page)
    await fillAnswer(page, answerText(problem))
    await submit(page)
    if (index < 4) await next(page)
  }

  await expect(page.getByRole('button', { name: 'Fortsätt', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Fortsätt', exact: true }).click()
  await expect(page).toHaveURL(/mode=addition&level=2/)

  await page.goto(`/student/${pupil.studentId}`)
  await page.getByText('Se mina framsteg').click()
  await page.getByRole('button', { name: /1\s+5\/5/ }).click()
  await expect(page).toHaveURL(/mode=addition.*level=1/)
  await expect(page.getByText('Du har redan klarat nivå 1. Här tränar du bara den nivån.')).toBeVisible()
  await page.getByRole('button', { name: 'Fortsätt med Addition' }).click()
  await expect(page).toHaveURL(/mode=addition(?!.*level=)/)
  await expect(page.getByText('Du har redan klarat nivå 1. Här tränar du bara den nivån.')).toHaveCount(0)
  let level = (await readState(page)).problem?.level
  for (let index = 0; index < 4 && level !== 2; index += 1) {
    const { problem } = await readState(page)
    await fillAnswer(page, answerText(problem))
    await submit(page)
    await next(page)
    level = (await readState(page)).problem?.level
  }
  expect(level).toBe(2)
})

test('wrong answers do not lower a selected level', async ({ page, request }) => {
  const pupil = await createPupil(request, { operations: ['addition'] })
  await login(page, pupil)
  await page.goto(`/student/${pupil.studentId}/practice?mode=addition&level=10`)

  for (let index = 0; index < 3; index += 1) {
    await expect.poll(async () => (await readState(page)).problem?.level).toBe(10)
    const { problem } = await readState(page)
    await fillAnswer(page, String(Number(answerText(problem).replace(',', '.')) + 1))
    await submit(page)
    await next(page)
  }

  await expect(page).toHaveURL(/mode=addition&level=10/)
  await expect.poll(async () => (await readState(page)).problem?.level).toBe(10)
})
