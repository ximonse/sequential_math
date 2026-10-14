import { test, expect } from '@playwright/test'
import { createPupil, login, readServerProfile, readState, next } from './lib/app.js'
import { answerTasks, waitForServerAnswers } from './lib/session.js'
import { createFindings } from './lib/findings.js'

const focusButton = page => page.getByRole('button', { name: /^Fokuspunkten – 2 min/ })
const trialView = page => page.getByTestId('multi-trial')
const mathData = profile => Object.fromEntries(Object.entries(profile || {}).filter(([key]) => /problem|mastery|level|abilit|stats|subitizing/i.test(key)))

async function openMulti(page) {
  await focusButton(page).tap()
  await page.getByRole('button', { name: /^MULTI/ }).tap()
}

async function answerCurrent(page, keyboard = false) {
  const view = trialView(page)
  const rule = await view.getAttribute('data-rule')
  const shape = await view.getAttribute('data-shape')
  const dots = await view.getAttribute('data-dots')
  const side = rule === 'shape' ? (shape === 'diamond' ? 'vänster' : 'höger') : dots === '2' ? 'vänster' : 'höger'
  if (keyboard) await page.keyboard.press(side === 'vänster' ? 'ArrowLeft' : 'ArrowRight')
  else await page.getByRole('button', { name: `Svara ${side}`, exact: true }).tap()
  return rule
}

async function practiceMulti(page) {
  await page.getByRole('button', { name: 'Öva reglerna', exact: true }).tap()
  const rules = []
  for (let i = 0; i < 16; i++) {
    await page.clock.runFor(600)
    rules.push(await answerCurrent(page))
    await expect(page.getByText('Rätt!', { exact: true })).toBeVisible()
    await page.clock.runFor(1200)
  }
  expect(rules.slice(0, 4)).toEqual(['shape', 'shape', 'shape', 'shape'])
  expect(rules.slice(4, 8)).toEqual(['count', 'count', 'count', 'count'])
  expect(new Set(rules.slice(8)).size).toBe(2)
  await page.getByRole('button', { name: 'Starta MULTI', exact: true }).tap()
}

test('MULTI: svenska regler, touch, rätt jämförelser och ingen matematikdata', async ({ page, request }, testInfo) => {
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.clock.install()
  const pupil = await createPupil(request)
  await login(page, pupil)
  const before = mathData(await readServerProfile(request, pupil.studentId))
  await openMulti(page)
  await expect(page.getByText('Överst: titta på formen', { exact: true })).toBeVisible()
  await expect(page.getByText('Nederst: räkna prickarna', { exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('multi-tablet-instructions.png') })
  await practiceMulti(page)
  for (let i = 0; i < 4; i++) {
    await page.clock.runFor(600)
    await page.clock.runFor(250)
    if (i === 0) await page.screenshot({ path: testInfo.outputPath('multi-tablet-trial.png') })
    await answerCurrent(page)
    await page.getByRole('button', { name: 'Svara höger', exact: true }).tap()
    await expect(trialView(page)).toHaveCount(0)
    await page.clock.runFor(500)
  }
  await page.getByRole('button', { name: 'Avsluta', exact: true }).tap()
  await expect(page.getByText('MULTI avbröts', { exact: true })).toBeVisible()
  await expect(page.getByText('100 % rätt av 4 uppgifter.', { exact: true })).toBeVisible()
  await expect(page.locator('section').filter({ has: page.getByRole('heading', { name: 'Upprepad regel', exact: true }) }).last()).toContainText('2 rätt av 2')
  await expect(page.locator('section').filter({ has: page.getByRole('heading', { name: 'Bytt regel', exact: true }) }).last()).toContainText('1 rätt av 1')
  await page.screenshot({ path: testInfo.outputPath('multi-tablet-result.png') })
  expect(mathData(await readServerProfile(request, pupil.studentId))).toEqual(before)
  await page.getByRole('button', { name: 'Tillbaka', exact: true }).last().tap()
  await expect(page.getByText(`Hej ${pupil.loginCode}`)).toBeVisible()
})

test('MULTI: tangentbord, pausad tid, återupptagen figur och automatisk avslutning', async ({ page, request }) => {
  await page.clock.install()
  await login(page, await createPupil(request))
  await openMulti(page)
  await practiceMulti(page)
  await page.clock.runFor(600)
  const before = await trialView(page).getAttribute('data-shape')
  const visibility = hidden => page.evaluate(value => {
    Object.defineProperty(document, 'hidden', { value, configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
  }, hidden)
  await visibility(true); await page.clock.runFor(180000); await visibility(false)
  await expect(page.getByText('MULTI är pausat', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Fortsätt', exact: true }).tap()
  await page.clock.runFor(600)
  await expect(trialView(page)).toHaveAttribute('data-shape', before)
  await answerCurrent(page, true)
  await page.clock.runFor(120000)
  await expect(page.getByText('MULTI är klart', { exact: true })).toBeVisible()
})

test('MULTI: mjuka fasta färger och former i samtliga sidteman', async ({ page, request }, testInfo) => {
  await page.clock.install()
  await page.setViewportSize({ width: 390, height: 844 })
  await login(page, await createPupil(request))
  for (const label of ['Ljust', 'Mörkt', 'Mörkt gulgrön', 'Psykadelisk', 'Real psycadelic']) {
    await page.getByRole('combobox', { name: 'Välj tema' }).selectOption({ label })
    await openMulti(page)
    await expect(page.getByRole('dialog', { name: 'MULTI', exact: true })).toHaveCSS('background-color', 'rgb(16, 21, 22)')
    await expect(page.getByRole('button', { name: 'Öva reglerna', exact: true })).toHaveCSS('background-color', 'rgb(163, 203, 187)')
    await page.getByRole('button', { name: 'Öva reglerna', exact: true }).tap()
    await page.clock.runFor(600)
    await expect(trialView(page).locator('rect')).toHaveCSS('stroke', 'rgb(163, 203, 187)')
    await expect(trialView(page).locator('circle').first()).toHaveCSS('fill', 'rgb(165, 189, 206)')
    const overflow = await page.evaluate(() => document.querySelector('[aria-label="MULTI"]').scrollWidth > innerWidth)
    expect(overflow).toBe(false)
    if (label === 'Real psycadelic') await page.screenshot({ path: testInfo.outputPath('multi-mobile-fixed-colours.png') })
    await page.getByRole('button', { name: 'Avsluta', exact: true }).tap()
    await page.getByRole('button', { name: 'Tillbaka', exact: true }).last().tap()
  }
})

test('MULTI: tillåten aktivitetspaus återgår till samma läraruppdrag', async ({ page, request }, testInfo) => {
  const findings = createFindings(testInfo)
  const pupil = await createPupil(request)
  await login(page, pupil)
  const assignment = Buffer.from(JSON.stringify({ v: 1, id: 'multi-break-robot', title: 'MULTI pausrobot', kind: 'standard', problemTypes: ['multiplication'], minLevel: 3, maxLevel: 3, targetCount: 40, breakGames: true, createdAt: Date.now() })).toString('base64')
  await page.goto(`/student/${pupil.studentId}/practice?${new URLSearchParams({ assignment: 'multi-break-robot', assignment_payload: assignment })}`)
  await answerTasks(page, findings, { count: 20, choice: { mode: 'multiplication' } })
  await next(page)
  await expect(page.getByText('Dags för en paus?')).toBeVisible()
  const saved = await waitForServerAnswers(request, pupil.studentId, 20, readServerProfile)
  expect(saved.ok).toBe(true)
  // Answer events and the following statistics checkpoint are synced separately.
  await expect.poll(async () => (await readServerProfile(request, pupil.studentId)).stats?.totalProblems).toBe(20)
  const before = mathData(await readServerProfile(request, pupil.studentId))
  const url = page.url()
  await page.clock.install()
  await openMulti(page)
  await practiceMulti(page)
  await page.clock.runFor(600)
  await answerCurrent(page)
  await page.getByRole('button', { name: 'Avsluta', exact: true }).tap()
  await page.getByRole('button', { name: 'Tillbaka', exact: true }).last().tap()
  expect(page.url()).toBe(url)
  await expect(page.getByRole('button', { name: 'Svara', exact: true })).toBeVisible()
  expect((await readState(page)).problem.skill).toBe('multiplication')
  expect((await readState(page)).problem.difficulty.conceptual_level).toBe(3)
  expect(mathData(await readServerProfile(request, pupil.studentId))).toEqual(before)
  expect(findings.items).toEqual([])
})
