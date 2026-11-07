import { test, expect } from '@playwright/test'
import { createPupil, login, readServerProfile } from './lib/app.js'

test('Warm activity changes remain usable while background sync is held, then safely acknowledge it', async ({ page, request }) => {
  test.setTimeout(30000)
  const pupil = await createPupil(request, { name: 'Transition Pupil' })
  await login(page, pupil)
  const start = page.getByRole('button', { name: 'Fortsätt träna', exact: true })
  await expect(start).toBeEnabled()
  const before = await readServerProfile(request, pupil.studentId)
  let release, heldCount = 0, confirmed = 0, profileReads = 0
  const heldRequests = new Set()
  const held = new Promise(resolve => { release = resolve })
  await page.route('**/api/me/events', async route => {
    heldCount++
    heldRequests.add(route.request())
    await held
    await route.continue()
  })
  page.on('request', entry => { if (new URL(entry.url()).pathname === '/api/me/profile') profileReads++ })
  page.on('response', response => {
    if (heldRequests.has(response.request()) && response.ok()) confirmed++
  })
  try {
    for (let i = 0; i < 3; i++) {
      await start.click()
      await expect(page.locator('input[placeholder="?"]')).toBeEditable()
      await expect(page).toHaveURL(new RegExp(`/student/${pupil.studentId}/practice`))
      await expect.poll(() => heldCount).toBeGreaterThan(0)
      await page.getByRole('button', { name: 'Startsida', exact: true }).click()
      await expect(start).toBeEnabled()
    }
    // These are dependency contracts, not wall-clock performance assertions.
    expect(confirmed).toBe(0)
    expect(profileReads).toBe(0)
    release()
    await expect.poll(() => confirmed).toBeGreaterThan(0)
    const after = await readServerProfile(request, pupil.studentId)
    expect(after.problemLog).toEqual(before.problemLog)
    expect(after.masteryFacts).toEqual(before.masteryFacts)
  } finally { release() }
})
