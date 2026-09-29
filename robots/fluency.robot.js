// Robot 8: Talpar, Dubblor and Talbild the way a teacher hands them out and a
// pupil works them: cap set by the teacher, countdown, breaks, praise, the
// finish screen, and Talbild's speed-based harder layouts.
import { test, expect } from '@playwright/test'
import { createPupil, next, readState } from './lib/app.js'
import { createFindings } from './lib/findings.js'
import { answerTasks } from './lib/session.js'
import { createTeacher, openTab, selectOnlyClass, teacherLogin } from './lib/teacher.js'

const OPERATIONS = ['addition', 'subtraction', 'multiplication', 'division', 'number_bonds', 'doubles']
const PRAISE = /Starkt jobbat|Snyggt! Fortsätt så|Du är på gång|Riktigt bra kämpat|Wow, vad snabb|Kämpa på/

async function setupClass(request) {
  const tag = Math.random().toString(36).slice(2, 6)
  const klass = { id: `klass-f-${tag}`, name: `Flyt ${tag}` }
  const pupils = []
  for (let i = 0; i < 3; i++) pupils.push(await createPupil(request, { name: `Elev${i} ${tag}`, classId: klass.id, className: klass.name, operations: OPERATIONS }))
  const teacher = await createTeacher(request, { classIds: [klass.id] })
  return { klass, pupils, teacher }
}

async function teacherPage(browser, teacher, klass) {
  const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] })
  const page = await context.newPage()
  await teacherLogin(page, teacher)
  await selectOnlyClass(page, klass.name)
  await openTab(page, 'Uppdrag & tickets')
  return { context, page }
}

async function copyLatestLink(page) {
  await page.waitForTimeout(500)
  const row = page.locator('div.rounded.border', { hasText: 'asg_' }).first()
  await row.getByRole('button', { name: 'Kopiera länk', exact: true }).click()
  await page.waitForTimeout(300)
  return page.evaluate(() => navigator.clipboard.readText()).catch(() => '')
}

async function presetLink(browser, teacher, klass, label, cap) {
  const { context, page } = await teacherPage(browser, teacher, klass)
  if (cap !== undefined) await page.getByLabel(/Max antal uppgifter för Talpar/).fill(String(cap))
  await page.getByRole('button', { name: label, exact: true }).click()
  const link = await copyLatestLink(page)
  await context.close()
  return link
}

async function talbildLink(browser, teacher, klass, cap) {
  const { context, page } = await teacherPage(browser, teacher, klass)
  await page.getByRole('button', { name: 'Talbild', exact: true }).click()
  await page.getByPlaceholder(/Talbild vecka 1/).fill('Robot Talbild')
  await page.locator('div.fixed').getByRole('spinbutton').fill(String(cap))
  await page.getByRole('button', { name: 'Skapa övning', exact: true }).click()
  const link = await copyLatestLink(page)
  await context.close()
  return link
}

async function openAsPupil(browser, link, pupil, viewport) {
  const context = await browser.newContext(viewport ? { viewport } : {})
  const page = await context.newPage()
  const url = new URL(link)
  await page.goto(`${url.pathname}${url.search}`)
  await page.getByPlaceholder(/Gul Fyr Katt/).fill(pupil.loginCode)
  await page.locator('input').nth(2).fill(pupil.pin)
  await page.getByRole('button', { name: 'Logga in', exact: true }).click()
  await page.waitForURL(/\/student\//)
  return { context, page }
}

const bodyText = page => page.locator('body').innerText()

async function fluencyRun(browser, request, testInfo, { label, skill, cap, strategy = 'correct', teacherCap = cap }) {
  const findings = createFindings(testInfo)
  const { klass, pupils, teacher } = await setupClass(request)
  const link = await presetLink(browser, teacher, klass, label, teacherCap)
  if (!link) {
    findings.add('R3', 'Kopiera länk gav ingen länk', { uppdrag: label })
    await findings.attach()
    expect.soft(findings.items.map(f => `${f.rule}: ${f.message}`)).toEqual([])
    return
  }
  const { context, page } = await openAsPupil(browser, link, pupils[0])
  if (!/\/practice/.test(page.url())) findings.add('R1', 'Länken ledde inte in i övningen', { url: page.url() })
  else {
    const log = await answerTasks(page, findings, {
      count: cap + 5,
      choice: {},
      strategy,
      stopWhen: entries => entries.length >= cap,
      onTask: async (entry) => {
        const answered = entry.i + 1
        const text = await bodyText(page)
        // A level celebration covers the countdown; only the plain answer screen can be checked.
        const covered = /Du har klarat nivå [0-9]+ i/.test(text)
        if (entry.op !== skill && entry.type !== skill) findings.add('R1', `${label} gav fel sorts uppgift`, { fick: entry.op, uppgift: entry.key })
        if (!covered && !new RegExp(`\\b${cap - answered} kvar`).test(text) && answered < cap) findings.add('R3', 'Nedräkningen visar fel antal kvar', { svarade: answered, förväntat: cap - answered, text: text.replace(/\s+/g, ' ').slice(0, 160) })
        const praiseExpected = answered % 15 === 8 && answered < cap
        if (!covered && praiseExpected && !PRAISE.test(text)) findings.add('R3', 'Uppmuntran saknas halvvägs mellan pauserna', { svarade: answered })
        if (!praiseExpected && PRAISE.test(text)) findings.add('R4', 'Uppmuntran visas när den inte ska', { svarade: answered })
        if (/undefined|NaN|\[object/.test(text)) findings.add('T1', 'Trasig text i övningen', { svarade: answered })
      }
    })
    findings.stat('svar', String(log.length))
    const expectedBreaks = Math.floor((cap - 1) / 15)
    const breaks = log.filter(entry => entry.interruptions.includes('Fortsätt räkna')).length
    if (log.length < cap) findings.add('R3', 'Övningen tog slut före taket', { svarade: log.length, tak: cap })
    else {
      if (breaks !== expectedBreaks) findings.add('R3', 'Fel antal pausförslag', { fick: breaks, förväntat: expectedBreaks, tak: cap })
      let end = ''
      for (let step = 0; step < 4; step++) {
        await next(page)
        await page.getByRole('button', { name: 'Fortsätt', exact: true }).click({ timeout: 500 }).catch(() => {})
        await page.waitForTimeout(300)
        end = await bodyText(page)
        if (/Övningen är klar/.test(end)) break
      }
      if (!/Övningen är klar/.test(end)) findings.add('R3', 'Ingen avslutsskärm när taket nåddes', { skärm: end.replace(/\s+/g, ' ').slice(0, 200), url: page.url() })
      else {
        await page.getByRole('button', { name: 'Till startsidan', exact: true }).click()
        await page.waitForURL(/\/student\/[^/]+$/)
      }
      const state = await readState(page)
      if (state.phase === 'answering') findings.add('R4', 'En ny uppgift visades efter taket')
    }
  }
  await context.close()
  await findings.attach()
  expect.soft(findings.items.map(f => `${f.rule}: ${f.message}`)).toEqual([])
}

for (const [label, skill] of [['Talpar', 'number_bonds'], ['Dubblor', 'doubles']]) {
  for (const cap of [5, 15, 16, 32]) {
    test(`${label}: tak ${cap}, rätt svar`, async ({ browser, request }, testInfo) => {
      test.setTimeout(5 * 60 * 1000)
      await fluencyRun(browser, request, testInfo, { label, skill, cap })
    })
  }
  test(`${label}: tak 10, bara fel svar räknas också`, async ({ browser, request }, testInfo) => {
    test.setTimeout(5 * 60 * 1000)
    await fluencyRun(browser, request, testInfo, { label, skill, cap: 10, strategy: 'wrong' })
  })
  test(`${label}: tomt fält ger tak 20`, async ({ browser, request }, testInfo) => {
    test.setTimeout(5 * 60 * 1000)
    await fluencyRun(browser, request, testInfo, { label, skill, cap: 20, teacherCap: '' })
  })
}

test('Talpar/Dubblor: uppgiftstexten är stor på dator och liten på mobil', async ({ browser, request }, testInfo) => {
  test.setTimeout(3 * 60 * 1000)
  const findings = createFindings(testInfo)
  const { klass, pupils, teacher } = await setupClass(request)
  for (const [label, index] of [['Talpar', 0], ['Dubblor', 1]]) {
    const link = await presetLink(browser, teacher, klass, label, 10)
    for (const [device, viewport, test_] of [['dator', { width: 1280, height: 800 }, size => size >= 40], ['mobil', { width: 375, height: 812 }, size => size <= 22]]) {
      const { context, page } = await openAsPupil(browser, link, pupils[index], viewport)
      const { state } = await import('./lib/app.js').then(m => m.waitForTask(page))
      const prompt = String(state?.problem?.metadata?.promptText || '')
      const size = prompt
        ? await page.evaluate(text => {
          const el = [...document.querySelectorAll('div')].find(d => d.children.length === 0 && d.textContent.trim() === text)
          return el ? parseFloat(getComputedStyle(el).fontSize) : -1
        }, prompt.trim())
        : -1
      if (size < 0) findings.add('T1', `Hittade inte uppgiftstexten (${label}, ${device})`, { prompt })
      else if (!test_(size)) findings.add('T1', `Fel textstorlek för ${label} på ${device}`, { px: size })
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      if (overflow > 1) findings.add('T1', `Sidan scrollar i sidled (${label}, ${device})`, { px: overflow })
      await context.close()
    }
  }
  await findings.attach()
  expect.soft(findings.items.map(f => `${f.rule}: ${f.message}`)).toEqual([])
})

test('Länkuppdrag utan eget tak (Bara addition) får pausförslag', async ({ browser, request }, testInfo) => {
  test.setTimeout(5 * 60 * 1000)
  const findings = createFindings(testInfo)
  const { klass, pupils, teacher } = await setupClass(request)
  const link = await presetLink(browser, teacher, klass, 'Bara addition')
  const { context, page } = await openAsPupil(browser, link, pupils[0])
  const log = await answerTasks(page, findings, { count: 26, choice: {}, strategy: 'correct', onLeave: async () => false })
  const breakAt = log.findIndex(entry => entry.interruptions.includes('Fortsätt räkna'))
  findings.stat('paus efter svar nr', String(breakAt))
  if (breakAt < 0) findings.add('R3', 'Inget pausförslag i ett länkuppdrag efter 26 svar', { svar: log.length })
  await context.close()
  await findings.attach()
  expect.soft(findings.items.map(f => `${f.rule}: ${f.message}`)).toEqual([])
})

// ---- Talbild ----

async function readDice(page) {
  return page.evaluate(() => [...document.querySelectorAll('div.relative.bg-white.shadow-lg')].map(die => {
    const box = die.getBoundingClientRect()
    return {
      left: box.left + 3, top: box.top + 3, right: box.right - 3, bottom: box.bottom - 3,
      dots: [...die.querySelectorAll('.bg-red-600')].map(dot => {
        const rect = dot.getBoundingClientRect()
        return { cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2, d: rect.width, x: dot.style.left }
      })
    }
  }))
}

function checkDice(findings, dice, context) {
  for (const die of dice) {
    die.dots.forEach((dot, index) => {
      const half = dot.d / 2
      if (dot.cx - half < die.left - 0.5 || dot.cx + half > die.right + 0.5 || dot.cy - half < die.top - 0.5 || dot.cy + half > die.bottom + 0.5) findings.add('C1', 'En prick ligger utanför tärningen', context)
      die.dots.slice(index + 1).forEach(other => {
        const gap = Math.hypot(dot.cx - other.cx, dot.cy - other.cy) - (dot.d + other.d) / 2
        if (gap < 4) findings.add('C1', 'Två prickar ligger på eller för nära varandra', { ...context, mellanrum: Math.round(gap) })
      })
    })
  }
}

async function talbildAnswer(page, findings, { answerFor, strategy = 'correct', delayMs = 0 }) {
  const dice = await readDice(page)
  const value = dice.reduce((sum, die) => sum + die.dots.length, 0)
  if (value < 1 || value > 10) findings.add('C1', 'Talbilden visar ett tal utanför 1–10', { antal: value })
  const press = strategy === 'wrong' ? (value === 10 ? 1 : value + 1) : value
  if (delayMs) await page.waitForTimeout(delayMs)
  await page.getByRole('button', { name: String(press), exact: true }).click()
  await page.waitForTimeout(450)
  return { value, dice, answeredWrong: press !== value }
}

// The app ignores a second tap until the next die appears (300 ms), so every
// answer is followed by a wait longer than that before the next die is read.
async function waitForDice(page) {
  for (let i = 0; i < 60; i++) {
    const dice = await readDice(page)
    if (dice.length > 0) return { dice }
    await page.waitForTimeout(100)
  }
  return null
}

async function dismissTalbildBreak(page) {
  const button = page.getByRole('button', { name: 'Fortsätt räkna', exact: true })
  if (await button.isVisible().catch(() => false)) { await button.click(); return true }
  return false
}

test('Talbild: tak, nedräkning, paus, uppmuntran och avslut', async ({ browser, request }, testInfo) => {
  test.setTimeout(5 * 60 * 1000)
  const findings = createFindings(testInfo)
  const { klass, pupils, teacher } = await setupClass(request)
  const cap = 32
  const link = await talbildLink(browser, teacher, klass, cap)
  if (!link) { findings.add('R3', 'Kopiera länk gav ingen länk för Talbild'); await findings.attach(); expect.soft(findings.items.map(f => `${f.rule}: ${f.message}`)).toEqual([]); return }
  const { context, page } = await openAsPupil(browser, link, pupils[0])
  if (!/\/subitizing/.test(page.url())) findings.add('R1', 'Talbild-länken ledde inte till Talbild', { url: page.url() })
  else {
    let breaks = 0
    for (let n = 1; n <= cap; n++) {
      const seen = await waitForDice(page)
      if (!seen) { findings.add('R3', 'Ingen ny tärning kom fram', { efter: n - 1, skärm: (await bodyText(page)).replace(/\s+/g, ' ').slice(0, 160) }); break }
      checkDice(findings, seen.dice, { svar: n })
      const before = await bodyText(page)
      const remaining = cap - (n - 1)
      if (!new RegExp(`\\b${remaining} kvar`).test(before)) findings.add('R3', 'Nedräkningen visar fel antal kvar i Talbild', { innan: n, förväntat: remaining, visar: (before.match(/\d+ kvar/g) || []).join(' | ') })
      const shot = await talbildAnswer(page, findings, {})
      await page.waitForTimeout(80)
      if (n <= 5) findings.stat(`n${n}`, `värde ${shot.value}, före: ${(before.match(/\d+ kvar/g) || []).join('|')}, efter: ${((await bodyText(page)).match(/\d+ kvar/g) || []).join('|')}`)
      const after = await bodyText(page)
      const praiseExpected = n % 15 === 8 && n < cap
      if (praiseExpected && !PRAISE.test(after)) findings.add('R3', 'Uppmuntran saknas i Talbild', { svarade: n })
      if (!praiseExpected && n % 15 !== 9 && PRAISE.test(after)) findings.add('R4', 'Uppmuntran visas i Talbild när den inte ska', { svarade: n })
      if (/undefined|NaN|\[object/.test(after)) findings.add('T1', 'Trasig text i Talbild', { svarade: n })
      if (n % 15 === 0 && n < cap) {
        await page.waitForTimeout(500)
        if (!/Dags för en paus/.test(await bodyText(page))) findings.add('R3', 'Ingen paus i Talbild', { svarade: n })
        else if (await dismissTalbildBreak(page)) breaks++
      }
    }
    if (breaks !== Math.floor((cap - 1) / 15)) findings.add('R3', 'Fel antal pauser i Talbild', { fick: breaks, förväntat: Math.floor((cap - 1) / 15) })
    await page.waitForURL(/\/student\/[^/]+$/, { timeout: 8000 }).catch(() => findings.add('R3', 'Talbild avslutades inte vid taket', { url: page.url() }))
    if (/\/student\/[^/]+$/.test(page.url())) {
      const profile = await request.post('/__robot/student', { data: { studentId: pupils[0].studentId } }).then(r => r.json()).then(d => d.profile)
      const lifetime = Number(JSON.stringify(profile || {}).match(/"lifetimeProblems":(\d+)/)?.[1] || 0)
      findings.stat('livstidsuppgifter i elevens profil', String(lifetime))
      if (lifetime < cap) findings.add('L1', 'Talbild-svaren räknades inte in i elevens profil', { väntade: cap, fick: lifetime })
    }
  }
  await context.close()
  await findings.attach()
  expect.soft(findings.items.map(f => `${f.rule}: ${f.message}`)).toEqual([])
})

test('Talbild: snabb elev får svårare bilder, långsam eller felande får lättare', async ({ browser, request }, testInfo) => {
  test.setTimeout(5 * 60 * 1000)
  const findings = createFindings(testInfo)
  const { klass, pupils, teacher } = await setupClass(request)
  const link = await talbildLink(browser, teacher, klass, 120)
  const { context, page } = await openAsPupil(browser, link, pupils[1])
  const observed = { level1: false, level2: false, level3: false, back: false }
  await page.waitForTimeout(3200) // a slow start must not count against the pupil's speed
  let sizesVary = false
  const record = async (n, strategy) => {
    const seen = await waitForDice(page)
    if (!seen) { findings.add('R3', 'Ingen ny tärning kom fram', { efter: n }); return null }
    checkDice(findings, seen.dice, { svar: n })
    return seen
  }
  const classic = dice => {
    const counts = dice.map(die => die.dots.length)
    const total = counts.reduce((a, b) => a + b, 0)
    const expected = total <= 5 ? [total] : [5, total - 5]
    return JSON.stringify(counts) === JSON.stringify(expected) && dice.every(die => die.dots.every(dot => /^(\d+(\.0+)?)%$/.test(dot.x)))
  }
  let n = 0
  const play = async (count, strategy, tag) => {
    for (let i = 0; i < count; i++) {
      // Answers 1–5 are level 0, 6–10 level 1, 11–15 level 2, 16–20 level 3.
      if (i > 0 && (i + 1) % 15 === 1 && n % 15 === 0) await dismissTalbildBreak(page)
      const seen = await record(++n, strategy)
      if (!seen) return
      const total = seen.dice.reduce((s, die) => s + die.dots.length, 0)
      if (tag === 'up' && n > 5 && n <= 10 && total >= 2 && seen.dice.length === 2 && seen.dice[0].dots.length !== Math.min(total, 5)) observed.level1 = true
      if (tag === 'up' && n > 10 && n <= 15 && seen.dice.some(die => die.dots.some(dot => /\.\d/.test(dot.x)))) observed.level2 = true
      if (tag === 'up' && n > 15 && new Set(seen.dice.flatMap(die => die.dots.map(dot => Math.round(dot.d)))).size > 1) { observed.level3 = true; sizesVary = true }
      if (tag === 'down' && classic(seen.dice)) observed.back = true
      await talbildAnswer(page, findings, { strategy })
      if (n % 15 === 0) { await page.waitForTimeout(500); await dismissTalbildBreak(page) }
    }
  }
  await play(20, 'correct', 'up')
  findings.stat('svårare bilder', JSON.stringify(observed))
  if (!observed.level1) findings.add('R3', 'Ingen ojämn fördelning (t.ex. 3+5) efter fem snabba rätt')
  if (!observed.level2) findings.add('R3', 'Inga slumpade prickar efter tio snabba rätt')
  if (!observed.level3 || !sizesVary) findings.add('R3', 'Inga olika prickstorlekar efter femton snabba rätt')
  await play(18, 'wrong', 'down')
  if (!observed.back) findings.add('R3', 'Bilderna blev inte lättare efter en följd av fel svar')
  await context.close()
  await findings.attach()
  expect.soft(findings.items.map(f => `${f.rule}: ${f.message}`)).toEqual([])
})

test('Talbild: knapparna ligger 5 och 5 i två rader och inget scrollar i sidled', async ({ browser, request }, testInfo) => {
  test.setTimeout(2 * 60 * 1000)
  const findings = createFindings(testInfo)
  const { klass, pupils, teacher } = await setupClass(request)
  const link = await talbildLink(browser, teacher, klass, 20)
  for (const [device, viewport] of [['mobil', { width: 375, height: 812 }], ['iPad', { width: 820, height: 1180 }], ['dator', { width: 1440, height: 900 }]]) {
    const { context, page } = await openAsPupil(browser, link, pupils[2], viewport)
    await waitForDice(page)
    const rows = await page.evaluate(() => {
      const tops = [...document.querySelectorAll('button')].filter(b => /^([1-9]|10)$/.test(b.textContent.trim())).map(b => Math.round(b.getBoundingClientRect().top))
      return tops.reduce((acc, top) => { acc[top] = (acc[top] || 0) + 1; return acc }, {})
    })
    const counts = Object.values(rows)
    if (counts.length !== 2 || counts[0] !== 5 || counts[1] !== 5) findings.add('C1', `Talbild-knapparna ligger inte 5+5 på ${device}`, { rader: JSON.stringify(rows) })
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    if (overflow > 1) findings.add('T1', `Talbild scrollar i sidled på ${device}`, { px: overflow })
    checkDice(findings, await readDice(page), { enhet: device })
    await context.close()
  }
  await findings.attach()
  expect.soft(findings.items.map(f => `${f.rule}: ${f.message}`)).toEqual([])
})
