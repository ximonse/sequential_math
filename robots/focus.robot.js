import { test, expect } from '@playwright/test'
import { createPupil, login, readServerProfile, readState, next } from './lib/app.js'
import { createFindings } from './lib/findings.js'
import { answerTasks } from './lib/session.js'

const FOCUS = 'Fokuspunkten – 2 min'
const point = page => page.getByTestId('focus-point')
const mathData = profile => JSON.stringify(Object.fromEntries(Object.entries(profile || {}).filter(([key]) => /problem|mastery|level|abilit|stats|subitizing/i.test(key))))
const payload = assignment => Buffer.from(JSON.stringify({ v: 1, id: 'focus-robot', kind: 'standard', title: 'Focus robot assignment', problemTypes: ['multiplication'], minLevel: 3, maxLevel: 3, targetCount: 40, createdAt: Date.now(), ...assignment })).toString('base64')

async function practice(page, mode = 'Upptäck') {
  await page.getByRole('button', { name: new RegExp(`^${mode}`) }).click()
  for (let i = 0; i < 3; i++) {
    await page.clock.runFor(1000)
    if (await point(page).getAttribute('data-signal') === 'go') await page.getByRole('button', { name: 'Dutta', exact: true }).tap()
    await page.clock.runFor(3800)
  }
  await page.getByRole('button', { name: 'Starta passet' }).click()
}

async function untilSignal(page) {
  for (let i = 0; i < 85; i++) {
    await page.clock.runFor(250)
    if (await point(page).getAttribute('data-signal') !== 'waiting') return
  }
  throw Error('No focus signal within the configured wait range')
}

test('Fokus: svart yta, vit punkt och läsbar text behålls i alla teman', async ({ page, request }) => {
  await page.clock.install()
  await login(page, await createPupil(request))
  for (const label of ['Ljust', 'Mörkt', 'Mörkt gulgrön', 'Psykadelisk', 'Real psycadelic']) {
    await page.getByRole('combobox', { name: 'Välj tema' }).selectOption({ label })
    await page.getByRole('button', { name: new RegExp(`^${FOCUS}`) }).click()
    const text = page.getByText('En stund att vänta, upptäcka och välja.', { exact: true })
    const color = await text.evaluate(element => getComputedStyle(element).color)
    // A fixed light instruction colour prevents the global theme from making it dark on black.
    expect(color).toBe('rgb(148, 163, 184)')
    await page.getByRole('button', { name: /^Upptäck/ }).click()
    await expect(point(page)).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    await expect(page.getByRole('dialog')).toHaveCSS('background-color', 'rgb(0, 0, 0)')
    await page.clock.runFor(1000)
    await expect(point(page)).toHaveCSS('background-color', 'rgb(74, 222, 128)')
    await page.getByRole('button', { name: 'Avsluta', exact: true }).click()
    await page.getByRole('button', { name: 'Tillbaka', exact: true }).last().click()
    await page.getByRole('button', { name: new RegExp(`^${FOCUS}`) }).click()
    await page.getByRole('button', { name: /^Välj/ }).click()
    await page.clock.runFor(5800)
    await expect(point(page)).toHaveAttribute('data-signal', 'red')
    await expect(point(page)).toHaveCSS('background-color', 'rgb(248, 113, 113)')
    await page.clock.runFor(4800)
    await expect(point(page)).toHaveAttribute('data-signal', 'square')
    await expect(point(page)).toHaveCSS('border-radius', '0px')
    await expect(point(page)).toHaveCSS('background-color', 'rgb(74, 222, 128)')
    await page.getByRole('button', { name: 'Avsluta', exact: true }).click()
    await page.getByRole('button', { name: 'Tillbaka', exact: true }).last().click()
  }
})

test('Fokus: touch, övningssignaler, pausad tid och resultat utan matematikdata', async ({ page, request }, testInfo) => {
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.clock.install()
  const pupil = await createPupil(request)
  await login(page, pupil)
  await page.getByRole('button', { name: new RegExp(`^${FOCUS}`) }).tap()
  await page.screenshot({ path: testInfo.outputPath('focus-tablet-setup.png') })
  await practice(page, 'Välj')
  const before = mathData(await readServerProfile(request, pupil.studentId))
  await untilSignal(page)
  const signal = await point(page).getAttribute('data-signal')
  await page.screenshot({ path: testInfo.outputPath('focus-tablet-signal.png') })
  if (signal === 'go') {
    await page.getByRole('button', { name: 'Dutta', exact: true }).tap()
    await page.getByRole('button', { name: 'Dutta', exact: true }).tap()
    await expect(page.getByText('Tryck registrerat', { exact: true })).toBeVisible()
  }
  const visibility = hidden => page.evaluate(value => {
    Object.defineProperty(document, 'hidden', { value, configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
  }, hidden)
  await visibility(true)
  await page.clock.runFor(300000)
  await visibility(false)
  await expect(page.getByText('Passet är pausat')).toBeVisible()
  await page.getByRole('button', { name: 'Fortsätt', exact: true }).tap()
  await expect(point(page)).toHaveAttribute('data-signal', 'waiting')
  await page.clock.runFor(120000)
  await expect(page.getByText('Passet är klart', { exact: true })).toBeVisible()
  await expect(page.getByText('Rätt avstådda signaler', { exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('focus-tablet-result.png') })
  expect(mathData(await readServerProfile(request, pupil.studentId))).toBe(before)
  await page.getByRole('button', { name: 'Tillbaka', exact: true }).last().tap()
  await expect(page.getByText(`Hej ${pupil.loginCode}`)).toBeVisible()
})

test('Fokus: tangentbord fungerar och tabbfokus stannar i aktiviteten', async ({ page, request }) => {
  await page.clock.install()
  await login(page, await createPupil(request))
  await page.getByRole('button', { name: new RegExp(`^${FOCUS}`) }).click()
  await practice(page)
  await page.getByRole('button', { name: 'Dutta', exact: true }).tap()
  await page.keyboard.press('Space')
  await untilSignal(page)
  await page.getByRole('button', { name: 'Dutta', exact: true }).focus()
  await page.keyboard.press('Space')
  await expect(page.getByText('Tryck registrerat', { exact: true })).toBeVisible()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Avsluta', exact: true })).toBeFocused()
  await page.clock.runFor(2000)
  await page.getByRole('button', { name: 'Avsluta', exact: true }).click()
  await expect(page.getByText('Passet avbröts')).toBeVisible()
  await expect(page.locator('dd').first()).toHaveText('1')
  await expect(page.locator('dl > div').filter({ hasText: 'För tidiga tryck' }).locator('dd')).toHaveText('2')
})

test('Fokus: inväntar klassvillkor, respekterar uppdrag och håller stängt vid laddningsfel', async ({ page, request }) => {
  const pupil = await createPupil(request)
  let release
  const gate = new Promise(resolve => { release = resolve })
  await page.route('**/api/class-config?*', async route => {
    const response = await route.fetch()
    await gate
    await route.fulfill({ response, json: { ...await response.json(), activeAssignmentPayload: payload({ breakGames: false }) } })
  })
  await login(page, pupil)
  await expect(page.getByRole('button', { name: new RegExp(`^${FOCUS}`) })).toHaveCount(0)
  release()
  await expect(page.getByText('Focus robot assignment', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: new RegExp(`^${FOCUS}`) })).toHaveCount(0)
  await page.unroute('**/api/class-config?*')
  await page.route('**/api/class-config?*', async route => {
    const response = await route.fetch()
    await route.fulfill({ response, json: { ...await response.json(), activeAssignmentPayload: payload({ breakGames: true }) } })
  })
  await page.reload()
  await expect(page.getByRole('button', { name: new RegExp(`^${FOCUS}`) })).toBeVisible()
  await page.unroute('**/api/class-config?*')
  await page.route('**/api/class-config?*', route => route.fulfill({ status: 503, body: '{}' }))
  await page.reload()
  await expect(page.getByRole('alert')).toContainText('Kunde inte läsa klassens räknesätt')
  await expect(page.getByRole('button', { name: new RegExp(`^${FOCUS}`) })).toHaveCount(0)
})

test('Fokus: vanlig paus behåller uppdrag och räknesätt utan nya matematiksvar', async ({ page, request }, testInfo) => {
  const findings = createFindings(testInfo)
  const pupil = await createPupil(request)
  await login(page, pupil)
  await page.goto(`/student/${pupil.studentId}/practice?${new URLSearchParams({ assignment: 'focus-robot', assignment_payload: payload({ breakGames: true }) })}`)
  await answerTasks(page, findings, { count: 20, choice: { mode: 'multiplication' } })
  await next(page)
  await expect(page.getByText('Dags för en paus?')).toBeVisible()
  const url = page.url()
  const before = mathData(await readServerProfile(request, pupil.studentId))
  await page.getByRole('button', { name: FOCUS, exact: true }).tap()
  await page.getByRole('button', { name: 'Tillbaka', exact: true }).tap()
  expect(page.url()).toBe(url)
  await expect(page.getByRole('button', { name: 'Svara', exact: true })).toBeVisible()
  expect((await readState(page)).problem.skill).toBe('multiplication')
  expect(mathData(await readServerProfile(request, pupil.studentId))).toBe(before)
  await findings.attach()
  expect(findings.items).toEqual([])
})

test('Fokus: spärrat uppdrag erbjuder ingen fokusaktivitet i vanlig paus', async ({ page, request }, testInfo) => {
  const findings = createFindings(testInfo)
  const pupil = await createPupil(request)
  await login(page, pupil)
  await page.goto(`/student/${pupil.studentId}/practice?${new URLSearchParams({ assignment: 'focus-robot', assignment_payload: payload({ breakGames: false }) })}`)
  await answerTasks(page, findings, { count: 20, choice: { mode: 'multiplication' } })
  await next(page)
  await expect(page.getByText('Dags för en paus?')).toBeVisible()
  await expect(page.getByRole('button', { name: FOCUS, exact: true })).toHaveCount(0)
})

test('Fokus: talbildspaus återgår till samma uppdrag, spärrat uppdrag saknar aktiviteten', async ({ page, request }) => {
  const pupil = await createPupil(request)
  await login(page, pupil)
  for (const allowed of [true, false]) {
    await page.goto(`/student/${pupil.studentId}/subitizing?${new URLSearchParams({ assignment_payload: payload({ kind: 'subitizing', breakGames: allowed }) })}`)
    for (let i = 0; i < 15; i++) {
      await page.getByRole('button', { name: '1', exact: true }).tap()
      await page.waitForTimeout(350)
    }
    await expect(page.getByText('Dags för en paus?')).toBeVisible()
    if (!allowed) {
      await expect(page.getByRole('button', { name: FOCUS, exact: true })).toHaveCount(0)
      continue
    }
    const url = page.url()
    const before = mathData(await readServerProfile(request, pupil.studentId))
    await page.getByRole('button', { name: FOCUS, exact: true }).tap()
    await page.getByRole('button', { name: 'Tillbaka', exact: true }).tap()
    expect(page.url()).toBe(url)
    await expect(page.getByRole('button', { name: '1', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Focus robot assignment' })).toBeVisible()
    expect(mathData(await readServerProfile(request, pupil.studentId))).toBe(before)
  }
})
