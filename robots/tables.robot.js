// Robot 2: picks different table combinations and answers several rounds.
// Every task must come from the chosen tables, and each round should cover
// every fact of those tables once.
import { test, expect } from '@playwright/test'
import { createPupil, login } from './lib/app.js'
import { createFindings } from './lib/findings.js'
import { answerTasks } from './lib/session.js'

const SELECTIONS = [[7], [3, 4], [2, 5, 10], [6, 7, 8, 9], [11, 12], [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]]

for (const tables of SELECTIONS) {
  test(`Tabellträning ${tables.join('+')}`, async ({ page, request }, testInfo) => {
    const findings = createFindings(testInfo)
    const pupil = await createPupil(request)
    await login(page, pupil)
    const start = async () => {
      const section = page.locator('section', { hasText: 'Tabellträning' })
      for (const table of tables) await section.getByRole('button', { name: String(table), exact: true }).click()
      await section.getByRole('button', { name: 'Kör', exact: true }).click()
      await page.waitForURL(/\/practice/)
    }
    await start()
    const params = new URL(page.url()).searchParams
    const chosenInUrl = (params.get('tables') || '').split(',').map(Number).filter(Boolean).sort((a, b) => a - b)
    if (chosenInUrl.join(',') !== [...tables].sort((a, b) => a - b).join(',')) findings.add('R1', 'Tabellerna jag valde är inte de som startade', { valda: tables, startade: chosenInUrl })

    const round = tables.length * 10
    const rounds = tables.length > 6 ? 1 : 3
    const facts = []
    const log = await answerTasks(page, findings, {
      count: round * rounds,
      choice: { tables, label: `tabell ${tables.join('+')}` },
      // A finished round of all chosen tables ends at the start page; start the next round.
      onLeave: async entries => {
        if (entries.length % round !== 0) { findings.add('R4', 'Tabellträningen avbröts mitt i en runda', { efter: entries.length, runda: round }); return false }
        const selected = await page.locator('section', { hasText: 'Tabellträning' }).locator('button.border-orange-500').allTextContents()
        if (selected.length) findings.add('R2', 'Tabellerna var fortfarande förvalda på startsidan (inget fel om det är meningen)', { förvalda: selected })
        await start(); return true
      },
      onTask: async (entry, problem) => { const t = problem?.metadata?.table; facts.push(t ? `${t}x${problem?.metadata?.factor}` : `annat:${entry.key}`) }
    })
    for (let r = 0; r * round < facts.length; r++) {
      const slice = facts.slice(r * round, (r + 1) * round)
      if (slice.length < round) break
      const distinct = new Set(slice).size
      if (distinct < round) findings.add('V1', 'En tabellrunda upprepade vissa gångerfakta och hoppade över andra', { runda: r + 1, olika: distinct, av: round, dubbletter: slice.filter((f, i) => slice.indexOf(f) !== i).slice(0, 5) })
    }
    findings.stat('uppgifter', log.length)
    findings.stat('olikaFakta', new Set(facts).size)
    await findings.attach()
    expect.soft(findings.items.map(f => `${f.rule}: ${f.message}`)).toEqual([])
  })
}
