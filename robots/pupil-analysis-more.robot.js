// Every suspicion is shown: the eight with most evidence as reviewed cards, the
// rest smaller under "Fler misstankar" (Simon 2026-11-14). R3: what I ask for is shown.
import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { createPupil } from './lib/app.js'
import { createTeacher, teacherLogin } from './lib/teacher.js'
import { stockholmDay } from '../src/lib/evidencePeriod.js'

const examples = JSON.parse(readFileSync(new URL('../src/domains/predictableErrors/catalogExamples.json', import.meta.url), 'utf8')).models
const SIGN = { addition: '+', subtraction: '−', multiplication: '·', division: '/' }

test('A pupil with many suspicions sees all of them, the weaker ones smaller below', async ({ page, request }, testInfo) => {
  const tag = Math.random().toString(36).slice(2, 8), classId = `analysis-more-${tag}`
  const pupil = await createPupil(request, { classId })
  // Three answers each from many whole-number models, more for the first ones so evidence differs.
  const models = ['smaller_minus_larger', 'carry_forget', 'borrow_forget', 'mul_carry_forgotten', 'div_remainder_ignored', 'exchange_not_decremented',
    'add_left_to_right', 'mul_carry_added_before', 'one_carry_forgotten', 'column_sums_concatenated', 'mul_partials_concatenated', 'phantom_carry']
  const rows = models.flatMap((id, index) => examples[id].hit.filter(hit => hit.problem.domain === 'arithmetic' && Number.isInteger(hit.problem.values.a))
    .slice(0, index < 4 ? 3 : 2).map(({ problem, answer }) => {
      const { a, b } = problem.values, op = problem.type
      const correct = op === 'addition' ? a + b : op === 'subtraction' ? a - b : op === 'multiplication' ? a * b : a / b
      return { operation: op, domain: 'arithmetic', skill: op, level: 4, values: { a, b }, promptText: `${a} ${SIGN[op]} ${b}`, studentAnswer: answer, correctAnswer: correct }
    }))
  expect((await (await request.post('/__robot/seed-practice-log', { data: { studentId: pupil.studentId, rows } })).json()).ok).toBe(true)
  const teacher = await createTeacher(request, { classIds: [classId] })
  await teacherLogin(page, teacher)
  await page.goto(`/teacher/student/${pupil.studentId}`)
  const panel = page.getByRole('region', { name: 'Analys och avstämning', exact: true })
  await panel.getByLabel('Analys från').fill(stockholmDay(Date.now() - 14 * 86400000))
  await panel.getByLabel('Analys till').fill(stockholmDay())
  await panel.getByRole('button', { name: 'Skapa granskningsunderlag', exact: true }).click()
  const report = panel.getByRole('region', { name: 'Analysrapport', exact: true })
  await expect(report).toBeVisible()
  const more = report.getByRole('region', { name: 'Fler misstankar med mindre underlag', exact: true })
  await expect(more).toBeVisible()
  await expect(more.locator('[data-hypothesis]').first()).toBeVisible()
  await page.waitForLoadState('networkidle')
  await more.screenshot({ path: testInfo.outputPath('report-more-suspicions.png') })
})
