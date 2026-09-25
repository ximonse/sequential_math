// Robot 3: takes breaks the way pupils do: pause game, going idle, going to
// the start page and back, reloading the page. None of it may lower the
// level or change what was chosen while every answer has been right.
import { test, expect } from '@playwright/test'
import { createPupil, goHomeFromPractice, login, openOtherTraining } from './lib/app.js'
import { createFindings } from './lib/findings.js'
import { answerTasks } from './lib/session.js'

const AREA = { mode: 'multiplication', label: 'Multiplikation' }

async function startArea(page) {
  await openOtherTraining(page)
  await page.getByRole('button', { name: new RegExp(`^${AREA.label}`) }).click()
  await page.waitForURL(/\/practice/)
}

function compareAfter(findings, what, before, after) {
  const peak = Math.max(...before.slice(-5).map(e => e.level))
  const first = after[0]
  if (!first) { findings.add('R3', `Ingen uppgift kom efter: ${what}`); return }
  if (first.op !== AREA.mode) findings.add('R2', `Räknesättet byttes efter: ${what}`, { före: AREA.mode, efter: first.op })
  if (first.level < peak - 1) findings.add('R4', `Nivån sjönk efter: ${what}`, { före: peak, efter: first.level, skäl: first.reason, syfte: first.purpose })
  if (['recover', 'support'].includes(first.purpose)) findings.add('R4', `Appen gick in i återhämtning efter: ${what}`, { före: peak, efter: first.level, skäl: first.reason })
  const lowest = Math.min(...after.slice(0, 5).map(e => e.level))
  if (lowest < peak - 1) findings.add('R4', `Nivån sjönk under uppgifterna direkt efter: ${what}`, { före: peak, lägst: lowest, skäl: after.map(e => e.reason).slice(0, 5) })
}

async function warmUp(page, request, findings) {
  const pupil = await createPupil(request)
  await login(page, pupil)
  await startArea(page)
  const before = await answerTasks(page, findings, { count: 14, choice: AREA })
  return { pupil, before }
}

test('Paus: spelar Pong och kommer tillbaka', async ({ page, request }, testInfo) => {
  const findings = createFindings(testInfo)
  const { before } = await warmUp(page, request, findings)
  const more = await answerTasks(page, findings, { count: 10, choice: AREA, breakChoice: /Spela Pong/ })
  const all = [...before, ...more]
  const breakAt = all.findIndex(e => e.interruptions.some(i => /Pong/.test(i)))
  if (breakAt < 0) findings.add('R3', 'Pausförslaget med spel kom aldrig', { besvarade: all.length })
  else compareAfter(findings, 'pausspel', all.slice(0, breakAt), all.slice(breakAt))
  await findings.attach()
  expect.soft(findings.items.map(f => `${f.rule}: ${f.message}`)).toEqual([])
})

test('Paus: tackar nej till paus och räknar vidare', async ({ page, request }, testInfo) => {
  const findings = createFindings(testInfo)
  const { before } = await warmUp(page, request, findings)
  const more = await answerTasks(page, findings, { count: 10, choice: AREA, breakChoice: 'Fortsätt räkna' })
  const all = [...before, ...more]
  const breakAt = all.findIndex(e => e.interruptions.includes('Fortsätt räkna'))
  if (breakAt < 0) findings.add('R3', 'Pausförslaget kom aldrig', { besvarade: all.length })
  else compareAfter(findings, 'nej tack till paus', all.slice(0, breakAt), all.slice(breakAt))
  await findings.attach()
  expect.soft(findings.items.map(f => `${f.rule}: ${f.message}`)).toEqual([])
})

test('Paus: går till startsidan via pausförslaget och tillbaka', async ({ page, request }, testInfo) => {
  const findings = createFindings(testInfo)
  const { before } = await warmUp(page, request, findings)
  await answerTasks(page, findings, { count: 10, choice: AREA, breakChoice: 'Till startsidan', onLeave: async () => false })
  if (/\/practice/.test(page.url())) { findings.add('R3', 'Pausförslaget med Till startsidan kom aldrig'); await goHomeFromPractice(page) }
  await startArea(page)
  const after = await answerTasks(page, findings, { count: 6, choice: AREA })
  compareAfter(findings, 'startsidan och tillbaka', before, after)
  await findings.attach()
  expect.soft(findings.items.map(f => `${f.rule}: ${f.message}`)).toEqual([])
})

test('Paus: är borta 10 minuter mitt i en uppgift', async ({ page, request }, testInfo) => {
  const findings = createFindings(testInfo)
  await page.clock.install()
  const { before } = await warmUp(page, request, findings)
  await page.clock.fastForward('10:00')
  await page.waitForTimeout(300)
  if (!/\/practice/.test(page.url())) findings.add('R2', 'Eleven åkte ut ur övningen efter 10 minuters paus', { url: page.url() })
  const after = await answerTasks(page, findings, { count: 6, choice: AREA })
  compareAfter(findings, '10 minuter borta', before, after)
  await findings.attach()
  expect.soft(findings.items.map(f => `${f.rule}: ${f.message}`)).toEqual([])
})

test('Paus: låser surfplattan och låser upp igen', async ({ page, request }, testInfo) => {
  const findings = createFindings(testInfo)
  const { pupil, before } = await warmUp(page, request, findings)
  const setHidden = hidden => page.evaluate(value => {
    Object.defineProperty(document, 'visibilityState', { value: value ? 'hidden' : 'visible', configurable: true })
    Object.defineProperty(document, 'hidden', { value, configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
  }, hidden)
  await setHidden(true)
  await page.waitForTimeout(1500)
  await setHidden(false)
  const after = await answerTasks(page, findings, { count: 6, choice: AREA })
  compareAfter(findings, 'låst och upplåst surfplatta', before, after)
  await page.waitForTimeout(1500)
  const profile = await (await request.post('/__robot/student', { data: { studentId: pupil.studentId } })).json()
  const today = Object.values(profile.profile?.telemetry?.daily || {}).at(-1) || {}
  if (Number(today.practice_sessions_ended || 0) < 1) findings.add('L1', 'Ett låst pass räknades inte som avslutat', { idag: today })
  if (Number(today.practice_sessions_started || 0) < 2) findings.add('L1', 'Att låsa upp igen startade inget nytt pass', { idag: today })
  await findings.attach()
  expect.soft(findings.items.map(f => `${f.rule}: ${f.message}`)).toEqual([])
})

test('Paus: laddar om sidan mitt i en uppgift', async ({ page, request }, testInfo) => {
  const findings = createFindings(testInfo)
  const { before } = await warmUp(page, request, findings)
  const urlBefore = page.url()
  await page.reload()
  await page.waitForTimeout(1500)
  if (page.url() !== urlBefore) findings.add('R2', 'Omladdning tog eleven någon annanstans', { före: urlBefore, efter: page.url() })
  if (!/\/practice/.test(page.url())) {
    findings.add('R2', 'Omladdning loggade ut eller lämnade övningen', { url: page.url() })
  } else {
    const after = await answerTasks(page, findings, { count: 6, choice: AREA })
    compareAfter(findings, 'omladdning', before, after)
  }
  await findings.attach()
  expect.soft(findings.items.map(f => `${f.rule}: ${f.message}`)).toEqual([])
})

test('Paus: stänger fliken och loggar in igen', async ({ page, request, context }, testInfo) => {
  const findings = createFindings(testInfo)
  const { pupil, before } = await warmUp(page, request, findings)
  await page.waitForTimeout(1500)
  await page.close()
  const again = await context.newPage()
  await again.goto(`/student/${pupil.studentId}`)
  await again.waitForTimeout(1500)
  if (!new RegExp(`/student/${pupil.studentId}$`).test(again.url())) {
    findings.add('R2', 'Eleven var utloggad efter att ha stängt och öppnat fliken', { url: again.url() })
    await login(again, pupil)
  }
  await startArea(again)
  const after = await answerTasks(again, findings, { count: 6, choice: AREA })
  compareAfter(findings, 'ny flik', before, after)
  await findings.attach()
  expect.soft(findings.items.map(f => `${f.rule}: ${f.message}`)).toEqual([])
})
