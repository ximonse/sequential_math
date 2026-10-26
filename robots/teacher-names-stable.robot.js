// R2/R4: the teacher's private pupil names stay on screen through every refresh.
// A refresh must never show code names, not even for a moment, and a slow or
// failing label request must not bring them back.
import { test, expect } from '@playwright/test'
import { createPupil } from './lib/app.js'
import { createTeacher, rowFor, selectOnlyClass, tableUnder, teacherLogin } from './lib/teacher.js'

async function setup(page, request) {
  const tag = Math.random().toString(36).slice(2, 7)
  const classId = `stable-${tag}`
  const className = `Stabilklass ${tag}`
  const creationName = `Stina ${tag}`
  const pupil = await createPupil(request, { name: `Röd Bok Hare ${tag}`, creationName, classId, className, operations: ['addition'] })
  const teacher = await createTeacher(request, { classIds: [classId] })
  await teacherLogin(page, teacher)
  await selectOnlyClass(page, className)
  const reveal = page.getByRole('button', { name: 'Visa tilltalsnamn' })
  if (await reveal.isVisible().catch(() => false)) await reveal.click()
  await expect.poll(async () => Boolean(rowFor(await tableUnder(page, 'Klass/gruppvy'), creationName))).toBe(true)
  return { pupil, creationName }
}

// Watches the whole page for the code name while the refresh runs.
async function codeNameSeenDuring(page, codeName, refreshes) {
  await page.evaluate(code => {
    window.__codeNameSeen = false
    const check = () => { if (document.body.innerText.includes(code)) window.__codeNameSeen = true }
    window.__codeNameObserver = new MutationObserver(check)
    window.__codeNameObserver.observe(document.body, { childList: true, subtree: true, characterData: true })
    window.__codeNameTimer = setInterval(check, 20)
  }, codeName)
  for (let i = 0; i < refreshes; i++) {
    await page.evaluate(() => window.dispatchEvent(new Event('teacher-groups-updated')))
    await page.waitForTimeout(700)
  }
  return page.evaluate(() => {
    window.__codeNameObserver.disconnect(); clearInterval(window.__codeNameTimer)
    return window.__codeNameSeen
  })
}

test('Refreshing the dashboard never flips pupil names back to code names', async ({ page, request }) => {
  const { pupil, creationName } = await setup(page, request)
  expect(await codeNameSeenDuring(page, pupil.loginCode, 4)).toBe(false)
  expect(rowFor(await tableUnder(page, 'Klass/gruppvy'), creationName)).not.toBeNull()
})

test('A slow or failing name request does not bring code names back', async ({ page, request }) => {
  const { pupil, creationName } = await setup(page, request)
  await page.route('**/api/teacher-pupil-labels', async route => {
    await new Promise(resolve => setTimeout(resolve, 1500))
    await route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"down"}' })
  })
  expect(await codeNameSeenDuring(page, pupil.loginCode, 3)).toBe(false)
  expect(rowFor(await tableUnder(page, 'Klass/gruppvy'), creationName)).not.toBeNull()
})

test('Pupil names show on their own, and the button switches to code names and back', async ({ page, request }) => {
  const tag = Math.random().toString(36).slice(2, 7)
  const classId = `auto-${tag}`
  const className = `Autoklass ${tag}`
  const creationName = `Alva ${tag}`
  const pupil = await createPupil(request, { name: `Gul Fisk Räv ${tag}`, creationName, classId, className, operations: ['addition'] })
  const teacher = await createTeacher(request, { classIds: [classId] })
  await teacherLogin(page, teacher)
  await selectOnlyClass(page, className)
  // No click: a teacher who never pressed anything still sees real names.
  await expect.poll(async () => Boolean(rowFor(await tableUnder(page, 'Klass/gruppvy'), creationName))).toBe(true)
  await expect(page.getByRole('button', { name: 'Byt till kodnamn' })).toBeVisible()
  await page.getByRole('button', { name: 'Byt till kodnamn' }).click()
  await expect.poll(async () => Boolean(rowFor(await tableUnder(page, 'Klass/gruppvy'), pupil.loginCode))).toBe(true)
  // The chosen code names also survive a refresh.
  expect(await codeNameSeenDuring(page, creationName, 3)).toBe(false)
  await page.getByRole('button', { name: 'Visa tilltalsnamn' }).click()
  await expect.poll(async () => Boolean(rowFor(await tableUnder(page, 'Klass/gruppvy'), creationName))).toBe(true)
})
