import { test, expect } from '@playwright/test'
import { createPupil, login, readServerProfile } from './lib/app.js'
import { createTeacher, createAttentionAdmin, selectOnlyClass, teacherLogin } from './lib/teacher.js'

test('Fokusmodul: gruppmatris, individer, diagram, gruppbyte, fel och oförändrad elevdata', async ({ page, request }, testInfo) => {
  const suffix = Math.random().toString(36).slice(2, 8)
  const classA = `focus-a-${suffix}`, classB = `focus-b-${suffix}`
  const pupils = []
  for (let i = 0; i < 4; i++) pupils.push(await createPupil(request, {
    classId: i === 3 ? classB : classA, className: i === 3 ? 'Fokusgrupp B' : 'Fokusgrupp A', operations: ['addition']
  }))
  const now = Date.now() - 1000
  const pass = (id, changes = {}) => ({ id, version: 1, mode: 'choose', startedAt: now - 120000, finishedAt: now,
    activeMs: 120000, aborted: false, summary: { hits: 3, misses: 1, wrong: 1, withheld: 1, early: 3, median: 300 }, ...changes })
  for (let i = 0; i < 2; i++) {
    await login(page, pupils[i])
    const results = [pass(`group-control-${i}`), pass(`group-old-${i}`, { startedAt: now - 9 * 86400000 - 120000, finishedAt: now - 9 * 86400000 }),
      pass(`group-abort-${i}`, { aborted: true }),
      pass(`group-focus-${i}`, { mode: 'discover', summary: { hits: 2, misses: 2, wrong: 0, withheld: 0, early: 1, median: 450 } }),
      pass(`group-multi-${i}`, { mode: 'multi', summary: { total: 5, correct: 3, wrong: 1, missed: 1, repeat: { total: 2, correct: 2, median: 300 }, switch: { total: 2, correct: 1, median: 450 } } })]
    expect(await page.evaluate(async entries => {
      const session = await (await fetch('/api/student-session')).json()
      return (await fetch('/api/me/events', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-csrf-token': session.csrfToken },
        body: JSON.stringify({ entries: entries.map(payload => ({ id: `event-${payload.id}`, type: 'attention_result', timestamp: payload.finishedAt, payload })) }) })).status
    }, results)).toBe(200)
  }
  const before = await Promise.all(pupils.map(pupil => readServerProfile(request, pupil.studentId)))
  await teacherLogin(page, await createAttentionAdmin(request, { classIds: [classA, classB] }))
  await selectOnlyClass(page, 'Fokusgrupp A')
  await page.getByRole('button', { name: /^Fokusövningar/ }).click()
  await expect(page).toHaveURL(/\/teacher\/focus$/)
  const panel = page.getByRole('region', { name: 'Fokusövningar', exact: true })
  await expect(panel.getByRole('status')).toHaveText('3 av 3 elever hämtade')
  await expect(panel.getByTestId('focus-group-row')).toHaveCount(3)
  await expect(panel).toContainText('Samlar underlag')
  await expect(panel.getByRole('region', { name: 'Gruppmatris för fokusövningar' })).not.toContainText('%')
  await panel.getByTestId(`focus-signal-${pupils[0].studentId}-choose-go`).tap()
  const individual = panel.getByRole('region', { name: 'Individens fokusresultat' })
  await expect(individual).toContainText(before[0].displayAlias)
  await expect(individual).toContainText('2 färdiga pass')
  await individual.getByText('Passdetaljer · 3 pass', { exact: true }).click()
  await expect(individual).toContainText('Avbrutet')
  await panel.getByRole('combobox', { name: 'Period för fokusgruppen' }).selectOption('7')
  await expect(individual).toContainText('1 färdiga pass')
  await page.setViewportSize({ width: 1280, height: 960 })
  await panel.screenshot({ path: testInfo.outputPath('focus-module-matrix.png') })
  await panel.getByRole('button', { name: 'Punktdiagram', exact: true }).click()
  await expect(panel.getByRole('img', { name: /^Gruppens punktdiagram/ })).toBeVisible()
  // Equal values are clustered; both pupils remain individually selectable.
  await expect(panel).toContainText('2 av 3 elever visas')
  await panel.getByRole('button', { name: new RegExp(`^${before[1].displayAlias}`) }).tap()
  await expect(individual).toContainText(before[1].displayAlias)
  await panel.getByRole('combobox', { name: 'Övning för fokusdiagram' }).selectOption('multi')
  await individual.getByRole('combobox', { name: 'Mått i elevens tidslinje' }).selectOption('time')
  await expect(individual.getByRole('img')).toHaveAttribute('aria-label', /millisekunder/)
  await page.setViewportSize({ width: 768, height: 1024 })
  await panel.screenshot({ path: testInfo.outputPath('focus-module-plot-tablet.png') })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  // A new group must not retain another group's selected pupil or history.
  await selectOnlyClass(page, 'Fokusgrupp B')
  await expect(panel.getByRole('status')).toHaveText('1 av 1 elever hämtade')
  await expect(individual).toHaveCount(0)
  await panel.getByRole('button', { name: 'Matris', exact: true }).press('Enter')
  await expect(panel.getByTestId('focus-group-row')).toHaveCount(1)
  await expect(panel).not.toContainText(before[0].displayAlias)
  await page.reload()
  await expect(panel.getByRole('status')).toHaveText('1 av 1 elever hämtade')
  await expect(panel.getByTestId('focus-group-row')).toHaveCount(1)
  // A failed read is an explicit error, never "no results". Retry recovers.
  await page.route(`**/api/teacher-attention?studentId=${pupils[3].studentId}*`, route => route.fulfill({ status: 503, json: { error: 'Unavailable' } }))
  await panel.getByRole('button', { name: 'Uppdatera fokusresultat' }).click()
  await expect(panel.getByRole('status')).toContainText('1 kunde inte hämtas')
  await expect(panel.getByTestId('focus-group-row')).toContainText('Kunde inte hämtas')
  await page.unroute(`**/api/teacher-attention?studentId=${pupils[3].studentId}*`)
  await panel.getByRole('button', { name: 'Uppdatera fokusresultat' }).click()
  await expect(panel.getByRole('status')).toHaveText('1 av 1 elever hämtade')
  for (let i = 0; i < pupils.length; i++) expect(await readServerProfile(request, pupils[i].studentId)).toEqual(before[i])
})

test('Fokusfärger: försiktiga dagsmönster, dolda siffror, gruppoberoende och touchdetaljer', async ({ page, request }, testInfo) => {
  const suffix = Math.random().toString(36).slice(2, 8)
  const classId = `colors-${suffix}`, otherClass = `color-peer-${suffix}`
  const pupils = []
  for (let i = 0; i < 4; i++) pupils.push(await createPupil(request, { classId, className: 'Färggruppen', operations: ['addition'] }))
  await createPupil(request, { classId: otherClass, className: 'Annan färggrupp', operations: ['addition'] })
  const now = Date.now() - 3600000
  const fixtures = [
    Array.from({ length: 3 }, (_, day) => [day, 6, 4]),
    Array.from({ length: 5 }, (_, day) => [day, 10, 0]),
    Array.from({ length: 3 }, (_, day) => [day, 0, 10]),
    [[0, 10, 0]]
  ]
  for (let i = 0; i < pupils.length; i++) {
    await login(page, pupils[i])
    const results = fixtures[i].map(([day, hits, misses]) => ({ id: `color-${i}-${day}`, version: 1, mode: 'choose',
      startedAt: now - day * 86400000 - 120000, finishedAt: now - day * 86400000, activeMs: 120000, aborted: false,
      summary: { hits, misses, wrong: 0, withheld: 0, early: 0, median: hits ? 300 : null } }))
    expect(await page.evaluate(async entries => {
      const session = await (await fetch('/api/student-session')).json()
      return (await fetch('/api/me/events', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-csrf-token': session.csrfToken },
        body: JSON.stringify({ entries: entries.map(payload => ({ id: `event-${payload.id}`, type: 'attention_result', timestamp: payload.finishedAt, payload })) }) })).status
    }, results)).toBe(200)
  }
  const before = await Promise.all(pupils.map(pupil => readServerProfile(request, pupil.studentId)))
  await teacherLogin(page, await createAttentionAdmin(request, { classIds: [classId, otherClass] }))
  await page.getByRole('button', { name: /^Fokusövningar/ }).click()
  const panel = page.getByRole('region', { name: 'Fokusövningar', exact: true })
  await expect(panel.getByRole('status')).toHaveText('5 av 5 elever hämtade')
  const colors = ['green', 'blue', 'yellow', 'white']
  for (let i = 0; i < pupils.length; i++) await expect(panel.getByTestId(`focus-signal-${pupils[i].studentId}-choose-go`)).toHaveAttribute('data-signal', colors[i])
  const matrix = panel.getByRole('region', { name: 'Gruppmatris för fokusövningar' })
  await expect(matrix).not.toContainText('%')
  await expect(panel).toContainText('Rött och orange kräver återkommande stora skillnader')
  await selectOnlyClass(page, 'Färggruppen')
  await expect(panel.getByRole('status')).toHaveText('4 av 4 elever hämtade')
  for (let i = 0; i < pupils.length; i++) await expect(panel.getByTestId(`focus-signal-${pupils[i].studentId}-choose-go`)).toHaveAttribute('data-signal', colors[i])
  await page.setViewportSize({ width: 1280, height: 960 })
  await matrix.screenshot({ path: testInfo.outputPath('focus-colors-desktop.png') })
  await panel.getByTestId(`focus-signal-${pupils[0].studentId}-choose-go`).tap()
  const individual = panel.getByRole('region', { name: 'Individens fokusresultat' })
  await individual.getByText(`Färg och underlag för ${before[0].displayAlias}`, { exact: true }).click()
  await expect(individual).toContainText('18 rätt av 30 svar')
  await expect(individual).toContainText('3 dagar')
  await page.setViewportSize({ width: 768, height: 1024 })
  await matrix.screenshot({ path: testInfo.outputPath('focus-colors-tablet.png') })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await panel.getByTestId(`focus-signal-${pupils[1].studentId}-choose-go`).press('Enter')
  await expect(individual).toContainText(before[1].displayAlias)
  for (let i = 0; i < pupils.length; i++) expect(await readServerProfile(request, pupils[i].studentId)).toEqual(before[i])
})

test('Fokusmodulen kräver lärarinloggning', async ({ page }) => {
  await page.goto('/teacher/focus')
  await expect(page).toHaveURL(/\/teacher-login$/)
})

test('Fokusgruppen döljs för lärare, även via direktlänk', async ({ page, request }) => {
  const classId = `own-focus-${Math.random().toString(36).slice(2, 8)}`
  await createPupil(request, { classId, operations: ['addition'] })
  await teacherLogin(page, await createTeacher(request, { classIds: [classId] }))
  await expect(page.getByRole('button', { name: /^Fokusövningar/ })).toHaveCount(0)
  await page.goto('/teacher/focus')
  await expect(page.getByRole('region', { name: 'Fokusövningar', exact: true })).toHaveCount(0)
  await expect(page.getByText('Fokusresultat är endast tillgängliga för huvudadmin.')).toBeVisible()
})

test('Lokal fokusjämförelse: hela lärarunderlaget, stabila gruppval, röda/orange signaler och saknade läsningar', async ({ page, request }, testInfo) => {
  const suffix = Math.random().toString(36).slice(2, 8)
  const classA = `reference-target-${suffix}`, classB = `reference-peers-${suffix}`
  const pupils = []
  for (let i = 0; i < 16; i++) pupils.push(await createPupil(request, { classId: i < 2 ? classA : classB,
    className: i < 2 ? 'Referensgrupp A' : 'Referensgrupp B', operations: ['addition'] }))
  const now = Date.now() - 3600000
  for (let i = 0; i < pupils.length; i++) {
    await login(page, pupils[i])
    const hits = i === 0 ? 0 : i === 1 ? 5 : 10
    const results = Array.from({ length: 5 }, (_, day) => ({ id: `ref-${i}-${day}`, version: 1, mode: 'choose',
      startedAt: now - day * 86400000 - 120000, finishedAt: now - day * 86400000, activeMs: 120000, aborted: false,
      summary: { hits, misses: 10 - hits, wrong: 0, withheld: 0, early: 0, median: hits ? 300 : null } }))
    expect(await page.evaluate(async entries => {
      const session = await (await fetch('/api/student-session')).json()
      return (await fetch('/api/me/events', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-csrf-token': session.csrfToken },
        body: JSON.stringify({ entries: entries.map(payload => ({ id: `event-${payload.id}`, type: 'attention_result', timestamp: payload.finishedAt, payload })) }) })).status
    }, results)).toBe(200)
  }
  const before = await Promise.all(pupils.map(pupil => readServerProfile(request, pupil.studentId)))
  await teacherLogin(page, await createAttentionAdmin(request, { classIds: [classA, classB] }))
  await selectOnlyClass(page, 'Referensgrupp A')
  await page.getByRole('button', { name: /^Fokusövningar/ }).click()
  const panel = page.getByRole('region', { name: 'Fokusövningar', exact: true })
  const red = panel.getByTestId(`focus-signal-${pupils[0].studentId}-choose-go`)
  const orange = panel.getByTestId(`focus-signal-${pupils[1].studentId}-choose-go`)
  await expect(red).toHaveAttribute('data-signal', 'red')
  await expect(orange).toHaveAttribute('data-signal', 'orange')
  await expect(panel.getByTestId('focus-reference-status')).toContainText('(16 elever)')
  const referenceText = await panel.getByTestId('focus-reference-status').innerText()
  await panel.screenshot({ path: testInfo.outputPath('focus-local-reference-desktop.png') })
  await selectOnlyClass(page, 'Referensgrupp B')
  await expect(panel.getByTestId('focus-group-row')).toHaveCount(14)
  await selectOnlyClass(page, 'Referensgrupp A')
  await expect(red).toHaveAttribute('data-signal', 'red')
  await expect(orange).toHaveAttribute('data-signal', 'orange')
  await expect(panel.getByTestId('focus-reference-status')).toHaveText(referenceText)
  await red.tap()
  const individual = panel.getByRole('region', { name: 'Individens fokusresultat' })
  await individual.locator('.focus-signal-details summary').click()
  await expect(individual).toContainText('jämförelse med 15 andra elever')
  await expect(individual).toContainText('Ingen åldersnorm eller statistiskt säkerställd avvikelse')
  await page.setViewportSize({ width: 768, height: 1024 })
  await panel.screenshot({ path: testInfo.outputPath('focus-local-reference-tablet.png') })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  // Even a hidden peer's failed read disables the comparison as a whole.
  await page.route(`**/api/teacher-attention?studentId=${pupils[15].studentId}*`, route => route.fulfill({ status: 503, json: { error: 'Unavailable' } }))
  await panel.getByRole('button', { name: 'Uppdatera fokusresultat' }).click()
  await expect(panel.getByTestId('focus-reference-status')).toContainText('Jämförelsen är avstängd')
  await expect(red).toHaveAttribute('data-signal', 'yellow')
  await expect(orange).toHaveAttribute('data-signal', 'yellow')
  await page.unroute(`**/api/teacher-attention?studentId=${pupils[15].studentId}*`)
  await panel.getByRole('button', { name: 'Uppdatera fokusresultat' }).click()
  await expect(red).toHaveAttribute('data-signal', 'red')
  await expect(orange).toHaveAttribute('data-signal', 'orange')
  for (let i = 0; i < pupils.length; i++) expect(await readServerProfile(request, pupils[i].studentId)).toEqual(before[i])
})

test('FOKUS-svarstid: röda/orange giltiga svar och signaldiagram för alla tre övningar', async ({ page, request }, testInfo) => {
  const classId = `response-${Math.random().toString(36).slice(2, 8)}`
  const pupils = []
  const now = Date.now() - 3600000
  for (let i = 0; i < 10; i++) {
    const pupil = await createPupil(request, { classId, className: 'Svarstidsgruppen', operations: ['addition'] })
    pupils.push(pupil)
    await login(page, pupil)
    const ms = i === 0 ? 1500 : i === 1 ? 1200 : 300
    const results = Array.from({ length: 5 }, (_, day) => ({ id: `rt-${i}-${day}`, version: 2, mode: 'discover',
      startedAt: now - day * 86400000 - 120000, finishedAt: now - day * 86400000, activeMs: 120000,
      aborted: false, completionReason: 'completed',
      summary: { hits: 8, misses: 0, wrong: 0, withheld: 0, early: 0, median: ms },
      trials: Array.from({ length: 8 }, (_, n) => ({ at: 3000 + n * 10000, kind: 'go', outcome: 'hit', responseMs: ms })) }))
    if (i === 0) {
      results.push({ ...results[0], id: 'rt-choose', mode: 'choose',
        summary: { hits: 4, misses: 0, wrong: 0, withheld: 2, early: 0, median: 400 },
        trials: [...Array.from({ length: 4 }, (_, n) => ({ at: 3000 + n * 10000, kind: 'go', outcome: 'hit', responseMs: 400 })),
          ...[45000, 55000].map(at => ({ at, kind: 'stop', outcome: 'withheld', responseMs: null }))] })
      results.push({ ...results[0], id: 'rt-multi', mode: 'multi',
        summary: { total: 4, correct: 4, wrong: 0, missed: 0, repeat: { total: 2, correct: 2, median: 400 }, switch: { total: 1, correct: 1, median: 900 } },
        trials: ['first', 'repeat', 'switch', 'repeat'].map((kind, n) => ({ at: 600 + n * 5000, kind, outcome: 'hit', responseMs: kind === 'switch' ? 900 : 400 })) })
    }
    expect(await page.evaluate(async entries => {
      const session = await (await fetch('/api/student-session')).json()
      return (await fetch('/api/me/events', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-csrf-token': session.csrfToken },
        body: JSON.stringify({ entries: entries.map(payload => ({ id: `event-${payload.id}`, type: 'attention_result', timestamp: payload.finishedAt, payload })) }) })).status
    }, results)).toBe(200)
  }
  const before = await Promise.all(pupils.map(pupil => readServerProfile(request, pupil.studentId)))
  await teacherLogin(page, await createAttentionAdmin(request, { classIds: [classId] }))
  await page.getByRole('button', { name: /^Fokusövningar/ }).click()
  const panel = page.getByRole('region', { name: 'Fokusövningar', exact: true })
  const red = panel.getByTestId(`focus-signal-${pupils[0].studentId}-discover-go`)
  await expect(red).toHaveAttribute('data-signal', 'red')
  await expect(panel.getByTestId(`focus-signal-${pupils[1].studentId}-discover-go`)).toHaveAttribute('data-signal', 'orange')
  await red.tap()
  const individual = panel.getByRole('region', { name: 'Individens fokusresultat' })
  await individual.locator('.focus-signal-details summary').click()
  await expect(individual).toContainText('1500 ms')
  for (const mode of ['discover', 'choose', 'multi']) {
    await panel.getByRole('combobox', { name: 'Övning för fokusdiagram' }).selectOption(mode)
    const endurance = panel.getByRole('region', { name: 'Utveckling under passet', exact: true })
    await expect(endurance.getByRole('img')).toBeVisible()
    await endurance.getByText(/^Signaler under passet/).click()
    await expect(endurance.getByRole('table')).toBeVisible()
    if (mode === 'choose') await expect(endurance).toContainText('Korrekt avstått')
    if (mode === 'multi') await expect(endurance).toContainText('Bytt regel')
  }
  await page.setViewportSize({ width: 768, height: 1024 })
  await panel.getByRole('region', { name: 'Gruppmatris för fokusövningar' }).screenshot({ path: testInfo.outputPath('focus-response-colors-tablet.png') })
  await panel.getByRole('region', { name: 'Utveckling under passet', exact: true }).screenshot({ path: testInfo.outputPath('multi-endurance-tablet.png') })
  for (let i = 0; i < pupils.length; i++) expect(await readServerProfile(request, pupils[i].studentId)).toEqual(before[i])
})
