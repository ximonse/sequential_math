import { test, expect } from '@playwright/test'
import { createPupil, login, readServerProfile, readState, next } from './lib/app.js'
import { createFindings } from './lib/findings.js'
import { answerTasks, waitForServerAnswers } from './lib/session.js'
import { createAttentionAdmin, teacherLogin } from './lib/teacher.js'

const FOCUS = 'Fokuspunkten – 2 min'
const point = page => page.getByTestId('focus-point')
const mathData = profile => JSON.stringify(Object.fromEntries(Object.entries(profile || {}).filter(([key]) => /problem|mastery|level|abilit|stats|subitizing/i.test(key))))
const payload = assignment => Buffer.from(JSON.stringify({ v: 1, id: 'focus-robot', kind: 'standard', title: 'Focus robot assignment', problemTypes: ['multiplication'], minLevel: 3, maxLevel: 3, targetCount: 40, createdAt: Date.now(), ...assignment })).toString('base64')

const surface = page => page.getByRole('dialog', { name: 'Fokuspunkten', exact: true })
const tapScreen = page => page.touchscreen.tap(25, 400)

test('FOKUS: fem sekunder ger omstartsfråga och separat försök utan miss eller fokusnivå', async ({ page, request, browser }, testInfo) => {
  const classId = `focus-timeout-${Math.random().toString(36).slice(2, 8)}`
  const pupil = await createPupil(request, { classId, operations: ['addition'] })
  await page.clock.install(); await login(page, pupil)
  const before = mathData(await readServerProfile(request, pupil.studentId))
  await page.getByRole('button', { name: new RegExp(`^${FOCUS}`) }).tap()
  await practice(page)
  await untilSignal(page)
  await page.clock.runFor(3000)
  await tapScreen(page)
  await expect(point(page)).toHaveAttribute('data-signal', 'waiting')
  await untilSignal(page)
  await page.clock.runFor(5000)
  await expect(page.getByRole('heading', { name: 'Ska vi starta om?', exact: true })).toBeVisible()
  await expect(page.getByRole('dialog').getByRole('status')).toContainText('Resultatet är sparat')
  const after = await readServerProfile(request, pupil.studentId)
  expect(after.attentionHistory).toHaveLength(1)
  expect(after.attentionHistory[0]).toMatchObject({ version: 3, protocolId: 'focus-targets-1', mode: 'discover', aborted: true, completionReason: 'no_response', summary: { hits: 1, misses: 0 } })
  expect(after.attentionHistory[0].summary.median).toBeGreaterThanOrEqual(3000)
  expect(after.attentionHistory[0].activeMs).toBeLessThan(120000)
  expect(mathData(after)).toBe(before)
  const context = await browser.newContext()
  try {
    const teacher = await context.newPage()
    await teacherLogin(teacher, await createAttentionAdmin(request, { classIds: [classId] }))
    await teacher.getByRole('button', { name: /^Fokusövningar/ }).click()
    const panel = teacher.getByRole('region', { name: 'Fokusövningar', exact: true })
    const cell = panel.getByTestId(`focus-signal-${pupil.studentId}-discover-go`)
    await expect(cell).toContainText('Ej fullföljt')
    await expect(cell).toHaveAttribute('data-signal', 'white')
    await cell.click()
    const individual = panel.getByRole('region', { name: 'Individens fokusresultat' })
    await expect(individual).toContainText('Inga färdiga pass')
    await individual.getByText('Passdetaljer · 1 pass', { exact: true }).click()
    await expect(individual).toContainText('Ej fullföljt')
    await expect(individual.getByRole('region', { name: 'Utveckling under passet' })).toContainText('omstart erbjöds')
    await individual.screenshot({ path: testInfo.outputPath('endurance-incomplete.png') })
  } finally { await context.close() }
  await page.getByRole('button', { name: 'Ja, starta om', exact: true }).tap()
  await expect(point(page)).toHaveAttribute('data-signal', 'waiting')
  await untilSignal(page); await tapScreen(page)
  await page.getByRole('button', { name: 'Avsluta', exact: true }).tap()
  await expect(page.getByRole('dialog').getByRole('status')).toContainText('Resultatet är sparat')
  const restarted = await readServerProfile(request, pupil.studentId)
  expect(restarted.attentionHistory).toHaveLength(2)
  expect(new Set(restarted.attentionHistory.map(pass => pass.id)).size).toBe(2)
  expect(restarted.attentionHistory.find(pass => pass.id !== after.attentionHistory[0].id).summary.hits).toBe(1)
  expect(restarted.attentionHistory.find(pass => pass.id === after.attentionHistory[0].id)).toEqual(after.attentionHistory[0])
  expect(mathData(restarted)).toBe(before)
})

async function practice(page, mode = '1 - FOKUS') {
  await page.getByRole('button', { name: new RegExp(`^${mode}`) }).click()
  for (let i = 0; i < 3; i++) {
    await page.clock.runFor(1000)
    if (await point(page).getAttribute('data-signal') === 'go') {
      await tapScreen(page)
      await page.clock.runFor(1800)
    } else await page.clock.runFor(3800)
  }
  await page.getByRole('button', { name: 'Starta passet' }).click()
}

test('FOKUS: läraren ser längre svar efter en minut i fullföljt pass', async ({ page, request, browser }, testInfo) => {
  const classId = `endurance-${Math.random().toString(36).slice(2, 8)}`
  const pupil = await createPupil(request, { classId, operations: ['addition'] })
  await page.clock.install(); await login(page, pupil)
  const before = mathData(await readServerProfile(request, pupil.studentId))
  await page.evaluate(() => { Math.random = () => 0 })
  await page.getByRole('button', { name: new RegExp(`^${FOCUS}`) }).tap()
  await practice(page)
  const start = await page.evaluate(() => performance.now())
  while (await point(page).count()) {
    await page.clock.runFor(250)
    if (!await point(page).count()) break
    if (await point(page).getAttribute('data-signal') === 'go') {
      const elapsed = await page.evaluate(() => performance.now()) - start
      await page.clock.runFor(elapsed < 60000 ? 300 : 1300)
      if (await point(page).count()) await tapScreen(page)
    }
  }
  await expect(page.getByRole('heading', { name: 'Passet är klart', exact: true })).toBeVisible()
  await expect(page.getByRole('dialog').getByRole('status')).toContainText('Resultatet är sparat')
  const profile = await readServerProfile(request, pupil.studentId)
  expect(profile.attentionHistory[0]).toMatchObject({ version: 3, aborted: false, activeMs: 120000 })
  expect(profile.attentionHistory[0].trials.some(trial => trial.at >= 60000 && trial.responseMs >= 1300)).toBe(true)
  expect(mathData(profile)).toBe(before)
  const context = await browser.newContext()
  try {
    const teacher = await context.newPage()
    await teacherLogin(teacher, await createAttentionAdmin(request, { classIds: [classId] }))
    await teacher.getByRole('button', { name: /^Fokusövningar/ }).click()
    await teacher.getByTestId(`focus-signal-${pupil.studentId}-discover-go`).click()
    const endurance = teacher.getByRole('region', { name: 'Utveckling under passet', exact: true })
    await expect(endurance).toContainText('Längre svar från cirka 60 s')
    await expect(endurance.getByRole('img', { name: 'Svar för svar under två minuter' })).toBeVisible()
    await endurance.screenshot({ path: testInfo.outputPath('endurance-desktop.png') })
    await teacher.setViewportSize({ width: 768, height: 1024 })
    await endurance.screenshot({ path: testInfo.outputPath('endurance-tablet.png') })
    await endurance.getByText(/^Signaler under passet/).press('Enter')
    await expect(endurance.getByRole('table')).toBeVisible()
    await teacher.reload()
    await teacher.getByTestId(`focus-signal-${pupil.studentId}-discover-go`).click()
    await expect(teacher.getByRole('region', { name: 'Utveckling under passet', exact: true })).toContainText('Längre svar från cirka 60 s')
  } finally { await context.close() }
})

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
    await page.getByRole('button', { name: /^1 - FOKUS/ }).click()
    await expect(point(page)).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    await expect(page.getByRole('dialog')).toHaveCSS('background-color', 'rgb(0, 0, 0)')
    await page.clock.runFor(1000)
    await expect(point(page)).toHaveCSS('background-color', 'rgb(74, 222, 128)')
    await page.getByRole('button', { name: 'Avsluta', exact: true }).click()
    await page.getByRole('button', { name: 'Tillbaka', exact: true }).last().click()
    await page.getByRole('button', { name: new RegExp(`^${FOCUS}`) }).click()
    await page.getByRole('button', { name: /^2 - KONTROLL/ }).click()
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

test('Fokus: hela skärmen återställer en halvstor prick direkt och skyddar mot dubbeltryck', async ({ page, request }, testInfo) => {
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.clock.install()
  await login(page, await createPupil(request))
  await page.getByRole('button', { name: new RegExp(`^${FOCUS}`) }).tap()
  await practice(page)
  await expect(surface(page)).toHaveText('Avsluta')
  await expect(point(page)).toHaveCSS('width', '14px')
  await expect(point(page)).toHaveCSS('height', '14px')
  await expect(page.getByRole('button', { name: 'Avsluta', exact: true })).toHaveCSS('color', 'rgb(148, 163, 184)')
  await expect(page.getByRole('button', { name: 'Dutta', exact: true })).toHaveCount(0)
  await untilSignal(page)
  await tapScreen(page)
  await expect(point(page)).toHaveAttribute('data-signal', 'waiting')
  await expect(point(page)).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await page.clock.runFor(120)
  await page.touchscreen.tap(740, 960)
  await page.screenshot({ path: testInfo.outputPath('focus-minimal-tablet.png') })
  await page.getByRole('button', { name: 'Avsluta', exact: true }).tap()
  await expect(page.locator('dl > div').filter({ hasText: 'Träffar' }).locator('dd')).toHaveText('1')
  await expect(page.locator('dl > div').filter({ hasText: 'För tidiga tryck' }).locator('dd')).toHaveText('0')
})

test('KONTROLL: själva passet visar båda stoppsignalerna även när slumpen alltid väljer grönt', async ({ page, request }) => {
  await page.clock.install()
  await login(page, await createPupil(request))
  await page.evaluate(() => { Math.random = () => 0 })
  await page.getByRole('button', { name: new RegExp(`^${FOCUS}`) }).tap()
  await practice(page, '2 - KONTROLL')
  const seen = new Set()
  for (let elapsed = 0; elapsed < 30000; elapsed += 250) {
    await page.clock.runFor(250)
    const signal = await point(page).getAttribute('data-signal')
    if (signal !== 'waiting') seen.add(signal)
    if (signal === 'go') await tapScreen(page)
  }
  expect([...seen].sort()).toEqual(['go', 'red', 'square'])
})

test('Fokus: touch, övningssignaler, pausad tid och resultat utan matematikdata', async ({ page, request }, testInfo) => {
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.clock.install()
  const pupil = await createPupil(request)
  await login(page, pupil)
  await page.getByRole('button', { name: new RegExp(`^${FOCUS}`) }).tap()
  await page.screenshot({ path: testInfo.outputPath('focus-tablet-setup.png') })
  await practice(page, '2 - KONTROLL')
  const before = mathData(await readServerProfile(request, pupil.studentId))
  await untilSignal(page)
  const signal = await point(page).getAttribute('data-signal')
  await page.screenshot({ path: testInfo.outputPath('focus-tablet-signal.png') })
  if (signal === 'go') {
    await tapScreen(page)
    await tapScreen(page)
    await expect(point(page)).toHaveAttribute('data-signal', 'waiting')
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
  await tapScreen(page)
  await page.clock.runFor(400)
  await page.keyboard.press('Space')
  await untilSignal(page)
  await surface(page).focus()
  await page.keyboard.press('Space')
  await expect(point(page)).toHaveAttribute('data-signal', 'waiting')
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
  // Active assignments come from every class and group through /api/me/assignments.
  const assignments = breakGames => ({ assignments: [{ payload: payload({ breakGames }), activatedAt: 1, source: { type: 'class', id: 'x' } }] })
  await page.route('**/api/me/assignments', async route => {
    await gate
    await route.fulfill({ json: assignments(false) })
  })
  await login(page, pupil)
  await expect(page.getByRole('button', { name: new RegExp(`^${FOCUS}`) })).toHaveCount(0)
  release()
  await expect(page.getByRole('button', { name: 'Starta nästa: Focus robot assignment', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: new RegExp(`^${FOCUS}`) })).toHaveCount(0)
  await page.unroute('**/api/me/assignments')
  await page.route('**/api/me/assignments', route => route.fulfill({ json: assignments(true) }))
  await page.reload()
  await expect(page.getByRole('button', { name: new RegExp(`^${FOCUS}`) })).toBeVisible()
  await page.unroute('**/api/me/assignments')
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
  const saved = await waitForServerAnswers(request, pupil.studentId, 20, readServerProfile)
  expect(saved.ok, 'All twenty math answers must reach the server before the focus-data comparison').toBe(true)
  await expect.poll(async () => (await readServerProfile(request, pupil.studentId)).stats?.totalProblems).toBe(20)
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
