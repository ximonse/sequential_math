// Robot 1: picks each training area and answers right until the levels stop
// climbing, checking every task against what was chosen.
import { test, expect } from '@playwright/test'
import { createPupil, login, openOtherTraining, readServerProfile } from './lib/app.js'
import { createFindings } from './lib/findings.js'
import { answerTasks, waitForServerAnswers } from './lib/session.js'
import { repetitionStats } from './lib/checks.js'

const AREAS = [
  ['addition', 'Addition'], ['subtraction', 'Subtraktion'], ['multiplication', 'Multiplikation'],
  ['division', 'Division'], ['algebra_evaluate', 'Algebra (räkna ut)'], ['algebra_simplify', 'Algebra (förenkla)'],
  ['arithmetic_expressions', 'Uttryck (prioriteringsregler)'], ['fractions', 'Bråk'], ['percentage', 'Procenträkning']
]
const MAX_TASKS = Number(process.env.ROBOT_TASKS || 150)

for (const [mode, label] of AREAS) {
  test(`Väljer ${label} och svarar rätt genom alla nivåer`, async ({ page, request }, testInfo) => {
    const findings = createFindings(testInfo)
    const pupil = await createPupil(request)
    await login(page, pupil)
    await openOtherTraining(page)
    await page.getByRole('button', { name: new RegExp(`^${label.replace(/[()]/g, '\\$&')}`) }).click()
    await page.waitForURL(/\/practice/)

    const log = await answerTasks(page, findings, {
      count: MAX_TASKS,
      choice: { mode, label },
      stopWhen: entries => {
        const levels = entries.map(e => e.level).filter(Number.isFinite)
        return levels.length >= 40 && Math.max(...levels.slice(-40)) === Math.max(...levels) && levels.at(-1) >= 12
      }
    })

    const levels = log.map(e => e.level)
    for (let i = 1; i < log.length; i++) {
      if (levels[i] < levels[i - 1] - 1 && log.slice(0, i).every(e => e.correct)) {
        findings.add('R4', 'Nivån sjönk flera steg trots bara rätt svar', { från: levels[i - 1], till: levels[i], efterUppgift: i, skäl: log[i].reason, syfte: log[i].purpose })
      }
    }
    const reps = repetitionStats(log.map(e => e.key))
    if (reps.immediate > 0) findings.add('V1', 'Samma uppgift kom två gånger i rad', { gånger: reps.immediate })
    const perLevel = {}
    for (const e of log) (perLevel[e.level] ||= []).push(e.key)
    for (const [level, keys] of Object.entries(perLevel)) {
      const s = repetitionStats(keys)
      if (keys.length >= 8 && s.distinct / keys.length < 0.5) findings.add('V1', 'Få olika uppgifter på samma nivå', { nivå: level, uppgifter: keys.length, olika: s.distinct, vanligast: s.top.slice(0, 3) })
    }

    const server = await waitForServerAnswers(request, pupil.studentId, log.length, readServerProfile)
    if (!server.ok) findings.add('R3', 'Alla svar kom inte fram till servern', { besvarade: log.length, sparade: server.count })

    findings.stat('uppgifter', log.length)
    findings.stat('nivåer', `${Math.min(...levels)}→${Math.max(...levels)}`)
    findings.stat('olika', `${reps.distinct}/${reps.total}`)
    findings.stat('avbrott', log.flatMap(e => e.interruptions).length)
    await findings.attach()
    expect.soft(findings.items.map(f => `${f.rule}: ${f.message}`)).toEqual([])
  })
}
