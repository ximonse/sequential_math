import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { predictableCandidates, candidatesForEvidence } from '../../../src/domains/predictableErrors/index.js'
import { buildContrastSet } from '../../../src/domains/predictableErrors/contrast.js'
import { planFollowUp } from '../../../src/domains/predictableErrors/followUpSelection.js'
import { questionFingerprint } from '../../../src/domains/predictableErrors/questionFingerprint.js'

// Open-key mathematics checks. No pupil records, blind results or approvals.
const pack = JSON.parse(await readFile(new URL('./package.json', import.meta.url)))
const cents = text => {
  assert.match(text, /^\d+\.\d{1,2}$/u)
  const [whole, decimals] = text.split('.')
  return Number(whole) * 100 + Number(decimals.padEnd(2, '0'))
}
const problem = task => ({ domain: 'arithmetic', type: 'addition', values: { a: Number(task.a), b: Number(task.b) } })
function oracle(a, b) {
  const hundredths = a % 10 + b % 10
  const carryHundredths = hundredths >= 10 ? 1 : 0
  const tenthsWithoutCarry = Math.floor(a / 10) % 10 + Math.floor(b / 10) % 10
  const carryTenths = tenthsWithoutCarry + carryHundredths >= 10 ? 1 : 0
  const whole = Math.floor(a / 100) + Math.floor(b / 100)
  const correct = (whole + carryTenths) * 100 + ((tenthsWithoutCarry + carryHundredths) % 10) * 10 + hundredths % 10
  assert.equal(correct, a + b)
  const omitted = whole * 100 + (tenthsWithoutCarry % 10) * 10 + hundredths % 10
  const one = carryHundredths && carryTenths ? [correct - 10, correct - 100] : []
  return { correct, omitted, one, carryHundredths, carryTenths }
}
const rows = []
for (const task of pack.tasks) {
  const expected = oracle(cents(task.a), cents(task.b))
  assert.equal(cents(task.correct), expected.correct)
  assert.equal(cents(task.allCarriesOmitted), expected.omitted)
  assert.deepEqual(task.oneCarryOmitted.map(cents), expected.one)
  const result = predictableCandidates(problem(task), task.allCarriesOmitted)
  const opportunities = expected.carryHundredths + expected.carryTenths
  assert.equal(result.matches.some(m => m.modelId === 'carry_forget'), opportunities > 0)
  assert.equal(predictableCandidates(problem(task), task.correct.replace('.', ',')).status, 'correct')
  assert.equal(result.predictions.some(m => m.modelId === 'one_carry_forgotten'), false)
  if (opportunities === 2) assert.equal(new Set([expected.correct, expected.omitted, ...expected.one]).size, 4)
  for (const status of ['partial', 'unanswered']) {
    assert.equal(candidatesForEvidence({ question: { domain: 'arithmetic', operation: 'addition', values: problem(task).values },
      answer: { status, studentAnswer: task.allCarriesOmitted, correctAnswer: task.correct } }).status, 'not_applicable')
  }
  rows.push({ taskId: task.taskId, phase: task.phase, answerUnits: 'integer_hundredths', ...expected,
    currentMatches: result.matches.map(m => m.modelId),
    oneCarryAnswersInCurrentEngine: task.oneCarryOmitted.map(answer => ({ answer, modelIds: predictableCandidates(problem(task), answer).matches.map(m => m.modelId) })) })
}
for (const task of pack.boundaryCases) {
  assert.equal(cents(task.a) + cents(task.b), cents(task.correct))
  if (task.allCarriesOmitted) assert.equal(oracle(cents(task.a), cents(task.b)).omitted, cents(task.allCarriesOmitted))
  if (task.oneCarryOmitted) {
    assert.deepEqual(oracle(cents(task.a), cents(task.b)).one, task.oneCarryOmitted.map(cents))
    assert.ok(task.oneCarryOmitted.includes(task.allCarriesOmitted))
  }
}
// Exhaust independent pilot carries AND the adjacent dependent-carry frame.
// The latter is deliberately excluded: both correct carries may disappear
// after omitting only the first one, so the two rule sets overlap.
let checked = 0, pilotCases = 0, dependentCarryCases = 0
for (let aw = 0; aw <= 8; aw++) for (let bw = 0; bw <= 8 - aw; bw++) {
  for (let at = 0; at <= 9; at++) for (let bt = 0; bt <= 9; bt++) {
    if (at + bt < 9) continue
    for (let ah = 1; ah <= 9; ah++) for (let bh = 1; bh <= 9; bh++) {
      if (ah + bh < 10) continue
      const a = aw * 100 + at * 10 + ah, b = bw * 100 + bt * 10 + bh
      const o = oracle(a, b)
      if (at + bt >= 10) {
        assert.equal(o.correct - o.omitted, 110)
        assert.equal(new Set([o.correct, o.omitted, ...o.one]).size, 4)
        pilotCases++
      } else {
        assert.equal(o.correct - o.omitted, 10)
        assert.ok(o.one.includes(o.omitted))
        assert.equal(new Set([o.correct, o.omitted, ...o.one]).size, 3)
        dependentCarryCases++
      }
      assert.ok(predictableCandidates({ domain: 'arithmetic', type: 'addition', values: { a: a / 100, b: b / 100 } }, o.omitted / 100)
        .matches.some(m => m.modelId === 'carry_forget'))
      checked++
    }
  }
}
assert.equal(checked, 111375)
assert.equal(pilotCases, 91125)
assert.equal(dependentCarryCases, 20250)
const source = pack.tasks[0], contrasts = pack.tasks.filter(task => task.phase === 'contrast')
const bankTasks = contrasts.map(task => ({ taskId: task.taskId, taskVersion: 1, operation: 'addition', operands: [Number(task.a), Number(task.b)] }))
const ordinary = planFollowUp({ modelId: 'carry_forget', supportProblems: [problem(source)] })
assert.equal(ordinary.status, 'unavailable')
const proposed = buildContrastSet({ modelId: 'carry_forget', supportProblems: [problem(source)], bankTasks, models: pack.modelIds })
assert.equal(proposed.items.length, 2)
assert.ok(proposed.unresolved.some(pair => pair.includes('one_carry_forgotten')))
const seen = new Set(contrasts.map(task => questionFingerprint(problem(task))))
assert.equal(buildContrastSet({ modelId: 'carry_forget', supportProblems: [problem(source)], bankTasks, seenFingerprints: seen }).status, 'unavailable')
await writeFile(new URL('./evidence.json', import.meta.url), JSON.stringify({
  packageId: pack.id, ruleVersion: predictableCandidates(problem(source), '').ruleVersion,
  method: 'synthetic_deterministic_open_key_not_blind', teacherApproval: 'pending', applicationIntegration: false,
  productionVerification: 'not_performed_by_this_script',
  assertions: { independentlyCheckedTasks: rows.length, correctControls: rows.length, unfinishedStatusControls: rows.length * 2,
    boundaryCases: pack.boundaryCases.length, exhaustivelyCheckedPilotCases: pilotCases,
    exhaustivelyCheckedDependentCarryCases: dependentCarryCases, exhaustivelyCheckedTotalCases: checked },
  currentBankStatus: ordinary.status, proposedTaskIds: proposed.items.map(t => t.taskId),
  missingDecimalModelIds: pack.missingDecimalModelIds, unresolvedWithExplicitRival: proposed.unresolved, rows,
}, null, 2) + '\n')
console.log(`Checked ${rows.length} proposed tasks, ${pilotCases} pilot cases and ${dependentCarryCases} adjacent overlap cases. Decimal rival missing; teacher review pending; no application or pupil records changed.`)
