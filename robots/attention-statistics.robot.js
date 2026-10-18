import { test, expect } from '@playwright/test'
import { createPupil, login, readServerProfile } from './lib/app.js'
import { createAttentionAdmin, teacherLogin } from './lib/teacher.js'

test('Fokusstatistik: jämför färdiga pass med rätt nämnare, filter och tydliga avbrott', async ({ page, request, browser }, testInfo) => {
  const classId = `stats-${Math.random().toString(36).slice(2, 8)}`
  const pupil = await createPupil(request, { classId, className: 'Statistikrobot', operations: ['addition'] })
  await login(page, pupil)
  const now = Date.now() - 1000
  const pass = (id, changes = {}) => ({ id, version: 1, mode: 'choose', startedAt: now - 120000, finishedAt: now,
    activeMs: 120000, aborted: false, summary: { hits: 3, misses: 1, wrong: 1, withheld: 1, early: 3, median: 300 }, ...changes })
  const history = [
    pass('stats-a'),
    pass('stats-b', { finishedAt: now - 60000, startedAt: now - 180000, summary: { hits: 1, misses: 9, wrong: 1, withheld: 3, early: 1, median: 600 } }),
    pass('stats-abort', { aborted: true, activeMs: 30000, startedAt: now - 30000, summary: { hits: 2, misses: 0, wrong: 0, withheld: 1, early: 10, median: 100 } }),
    pass('stats-old', { finishedAt: now - 8 * 86400000, startedAt: now - 8 * 86400000 - 120000, summary: { hits: 10, misses: 0, wrong: 0, withheld: 1, early: 0, median: 250 } }),
    ...Array.from({ length: 8 }, (_, i) => pass(`stats-focus-${i}`, { mode: 'discover', finishedAt: now - (i + 2) * 60000,
      startedAt: now - (i + 4) * 60000, summary: { hits: 8, misses: 2, wrong: 0, withheld: 0, early: 0, median: 250 } })),
    pass('stats-multi', { mode: 'multi', summary: { total: 5, correct: 3, wrong: 1, missed: 1,
      repeat: { total: 2, correct: 2, median: 300 }, switch: { total: 2, correct: 1, median: 450 } } })
  ]
  const stored = await page.evaluate(async results => {
    const session = await (await fetch('/api/student-session')).json()
    const response = await fetch('/api/me/events', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-csrf-token': session.csrfToken },
      body: JSON.stringify({ entries: results.map(payload => ({ id: `event-${payload.id}`, type: 'attention_result', timestamp: payload.finishedAt, payload })) }) })
    return response.status
  }, history)
  expect(stored).toBe(200)
  const before = await readServerProfile(request, pupil.studentId)
  const context = await browser.newContext({ hasTouch: true, viewport: { width: 1024, height: 768 } })
  const teacherPage = await context.newPage()
  try {
    await teacherLogin(teacherPage, await createAttentionAdmin(request, { classIds: [classId] }))
    await teacherPage.goto(`/teacher/student/${pupil.studentId}`)
    const panel = teacherPage.getByRole('region', { name: 'Fokusaktiviteter', exact: true })
    const overview = panel.getByTestId('attention-overview-choose')
    await expect(overview).toContainText('Färdiga: 3 · Avbrutna: 1')
    await expect(overview).toContainText('14 av 24')
    await expect(panel.getByTestId('attention-history-row')).toHaveCount(10)
    await panel.getByRole('button', { name: 'Visa fler pass', exact: true }).click()
    await expect(panel.getByTestId('attention-history-row')).toHaveCount(13)
    // The summary uses all results in the period, independent of pagination.
    await expect(overview).toContainText('14 av 24')
    await panel.getByRole('combobox', { name: 'Tidsperiod för fokusaktiviteter' }).selectOption('7')
    await expect(overview).toContainText('Färdiga: 2 · Avbrutna: 1')
    await expect(overview).toContainText('29 %')
    await expect(overview).toContainText('4 av 14')
    await expect(overview).toContainText('4 av 6')
    await expect(overview).toContainText('4 tryck på 4 min')
    await panel.getByRole('combobox', { name: 'Filtrera fokusaktiviteter' }).selectOption('choose')
    await expect(panel.getByTestId('attention-history-row')).toHaveCount(3)
    await panel.getByRole('checkbox', { name: 'Visa avbrutna pass' }).uncheck()
    await expect(panel.getByTestId('attention-history-row')).toHaveCount(2)
    await expect(overview).toContainText('4 av 14')
    await panel.screenshot({ path: testInfo.outputPath('attention-stats-control.png') })
    await panel.getByRole('combobox', { name: 'Filtrera fokusaktiviteter' }).selectOption('multi')
    await expect(panel.getByTestId('attention-overview-multi')).toContainText('60 %')
    await expect(panel.getByTestId('attention-history-row')).toContainText('+150 ms')
    await expect(panel.getByTestId('attention-history-row')).toContainText('3 av 5')
    await teacherPage.setViewportSize({ width: 768, height: 1024 })
    await panel.screenshot({ path: testInfo.outputPath('attention-stats-multi-tablet.png') })
    const bounds = await panel.boundingBox()
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(768)
    const after = await readServerProfile(request, pupil.studentId)
    expect(after.attentionHistory).toEqual(before.attentionHistory)
    expect(after.problemLog).toEqual(before.problemLog)
    expect(after.stats).toEqual(before.stats)
    expect(after.masteryFacts).toEqual(before.masteryFacts)
  } finally { await context.close() }
})
