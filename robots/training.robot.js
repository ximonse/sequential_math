// Robot 5: free training within the class's areas, and a pupil who gets
// everything wrong. Neither may leave what was chosen or allowed.
import { test, expect } from '@playwright/test'
import { createPupil, login, openOtherTraining } from './lib/app.js'
import { createFindings } from './lib/findings.js'
import { answerTasks } from './lib/session.js'
import { repetitionStats } from './lib/checks.js'

const CLASS_SETS = [['addition', 'subtraction'], ['multiplication', 'fractions', 'percentage'], ['division']]

for (const operations of CLASS_SETS) {
  test(`Fri träning när klassen har ${operations.join('+')}`, async ({ page, request }, testInfo) => {
    const findings = createFindings(testInfo)
    const pupil = await createPupil(request, { operations })
    // Seeding a class again resets its operations for all its pupils; give each test its own class.
    await login(page, pupil)
    await openOtherTraining(page)
    await page.getByRole('button', { name: 'Fri träning', exact: true }).click()
    await page.waitForURL(/\/practice/)
    const log = await answerTasks(page, findings, { count: 60, choice: { allowedOperations: operations, label: 'Fri träning' }, strategy: i => i % 4 !== 3 })
    const seen = [...new Set(log.map(e => e.op))]
    const missing = operations.filter(op => !seen.includes(op))
    if (missing.length && log.length >= 40) findings.add('R1', 'Fri träning tog aldrig med ett aktiverat räknesätt', { saknas: missing, fick: seen })
    findings.stat('räknesätt', seen.join(','))
    findings.stat('uppgifter', log.length)
    await findings.attach()
    expect.soft(findings.items.map(f => `${f.rule}: ${f.message}`)).toEqual([])
  })
}

test('Fortsätt träna på startsidan', async ({ page, request }, testInfo) => {
  const findings = createFindings(testInfo)
  const operations = ['addition', 'fractions']
  await login(page, await createPupil(request, { operations }))
  await page.getByRole('button', { name: 'Fortsätt träna', exact: true }).click()
  await page.waitForURL(/\/practice/)
  const log = await answerTasks(page, findings, { count: 30, choice: { allowedOperations: operations, label: 'Fortsätt träna' } })
  findings.stat('räknesätt', [...new Set(log.map(e => e.op))].join(','))
  await findings.attach()
  expect.soft(findings.items.map(f => `${f.rule}: ${f.message}`)).toEqual([])
})

for (const [label, mode] of [['Subtraktion', 'subtraction'], ['Bråk', 'fractions'], ['Algebra (räkna ut)', 'algebra_evaluate']]) {
  test(`Svarar fel på allt i ${label}`, async ({ page, request }, testInfo) => {
    const findings = createFindings(testInfo)
    await login(page, await createPupil(request))
    await openOtherTraining(page)
    await page.getByRole('button', { name: new RegExp(`^${label.replace(/[()]/g, '\\$&')}`) }).click()
    await page.waitForURL(/\/practice/)
    const log = await answerTasks(page, findings, { count: 40, choice: { mode, label }, strategy: 'wrong' })
    const reps = repetitionStats(log.map(e => e.key))
    if (reps.immediate > 0) findings.add('V1', 'Samma uppgift kom två gånger i rad', { gånger: reps.immediate })
    if (reps.distinct < log.length * 0.5) findings.add('V1', 'Eleven som fastnar får samma få uppgifter om och om igen', { olika: reps.distinct, av: log.length, vanligast: reps.top.slice(0, 3) })
    findings.stat('uppgifter', log.length)
    findings.stat('nivåer', [...new Set(log.map(e => e.level))].join(','))
    findings.stat('olika', `${reps.distinct}/${reps.total}`)
    await findings.attach()
    expect.soft(findings.items.map(f => `${f.rule}: ${f.message}`)).toEqual([])
  })
}
