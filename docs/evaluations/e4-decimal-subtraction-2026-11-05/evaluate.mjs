import { readFile, writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { predictableCandidates, candidatesForEvidence } from '../../../src/domains/predictableErrors/index.js'
import { decimalSubtractionPackage, decimalSubtractionTasks } from '../../../src/domains/arithmetic/decimalSubtractionPackage.js'
import { buildContrastSet } from '../../../src/domains/predictableErrors/contrast.js'

// Open-key synthetic mathematics checks, not a blind test or teacher approval.
const pack = JSON.parse(await readFile(new URL('./package.json', import.meta.url)))
const cents = text => {
  assert.match(text, /^\d\.\d{2}$/)
  const [whole, decimals] = text.split('.')
  return Number(whole) * 100 + Number(decimals)
}
const problem = task => ({ domain: 'arithmetic', type: 'subtraction', skill: 'subtraction',
  values: { a: Number(task.a), b: Number(task.b) } })
const oracle = task => {
  const a = cents(task.a), b = cents(task.b)
  const ad = [Math.floor(a / 100), Math.floor(a / 10) % 10, a % 10]
  const bd = [Math.floor(b / 100), Math.floor(b / 10) % 10, b % 10]
  const weighted = fn => ad.reduce((sum, digit, i) => sum + fn(digit, bd[i]) * [100, 10, 1][i], 0)
  const exchange = ad[2] < bd[2]
  if (exchange) assert.ok(ad[0] > bd[0] && ad[1] - 1 >= bd[1] && ad[1] > 0)
  return { correct: a - b, absoluteColumns: weighted((x, y) => Math.abs(x - y)),
    zeroColumn: weighted((x, y) => Math.max(0, x - y)),
    undecrementedDonor: a - b + (exchange ? 10 : 0), exchange }
}
const rows = []
for (const task of pack.tasks) {
  const expected = oracle(task)
  for (const key of ['correct', 'absoluteColumns', 'zeroColumn', 'undecrementedDonor']) assert.equal(cents(task[key]), expected[key])
  const right = predictableCandidates(problem(task), task.correct.replace('.', ','))
  assert.equal(right.status, 'correct')
  const known = [['absoluteColumns', 'smaller_minus_larger'], ['zeroColumn', 'borrow_forget'], ['undecrementedDonor', 'exchange_not_decremented']]
  for (const [key, modelId] of known) {
    const result = predictableCandidates(problem(task), task[key])
    assert.equal(result.matches.some(match => match.modelId === modelId), expected.exchange)
    if (!expected.exchange) assert.ok(result.nonDiscriminatingModelIds.includes(modelId))
  }
  // The approved v8 decimal rival must now be calculated alongside the old rules.
  const rival = predictableCandidates(problem(task), task.undecrementedDonor)
  assert.equal(rival.matches.some(p => p.modelId === pack.implementedRival), expected.exchange)
  for (const status of ['partial', 'unanswered']) {
    assert.equal(candidatesForEvidence({ question: { domain: 'arithmetic', operation: 'subtraction', values: problem(task).values },
      answer: { status, studentAnswer: task.absoluteColumns, correctAnswer: task.correct } }).status, 'not_applicable')
  }
  rows.push({ taskId: task.taskId, phase: task.phase, ...expected,
    sourceRivalOverlap: expected.exchange && expected.absoluteColumns === expected.undecrementedDonor,
    implementedRivalMatchedModelIds: rival.matches.map(match => match.modelId) })
}
assert.equal(decimalSubtractionTasks.length, pack.tasks.length)
for (const [index, task] of decimalSubtractionTasks.entries()) {
  assert.deepEqual(task.operands, [Number(pack.tasks[index].a), Number(pack.tasks[index].b)])
  assert.equal(task.didacticPackageId, decimalSubtractionPackage.id)
}
const source = pack.tasks.find(task => task.phase === 'source_example')
assert.equal(oracle(source).absoluteColumns, oracle(source).undecrementedDonor)
const contrasts = pack.tasks.filter(task => task.phase === 'contrast')
for (const task of contrasts) {
  const { exchange: _exchange, ...answers } = oracle(task)
  assert.equal(new Set(Object.values(answers)).size, 4)
}
const bankTasks = contrasts.map(task => ({ taskId: task.taskId, taskVersion: 1,
  operation: 'subtraction', operands: [Number(task.a), Number(task.b)] }))
const selections = pack.modelIds.map(modelId => {
  const result = buildContrastSet({ modelId, supportProblems: [problem(source)], bankTasks })
  assert.equal(result.status, 'proposed')
  assert.equal(result.items.length, 2)
  return { modelId, taskIds: result.items.map(item => item.taskId), unresolved: result.unresolved }
})
await writeFile(new URL('./evidence.json', import.meta.url), JSON.stringify({
  packageId: pack.id, ruleVersion: predictableCandidates(problem(source), source.absoluteColumns).ruleVersion,
  method: 'synthetic_deterministic_not_blind', teacherApproval: 'approved_2026-11-05', applicationIntegration: true, productionIntegration: false,
  assertions: { independentIntegerHundredthsTasks: rows.length, correctAnswerControls: rows.length,
    nonMathematicalStatusControls: rows.length * 2, fourWayDistinctContrasts: contrasts.length },
  answerUnits: 'integer_hundredths', implementedDecimalRival: pack.implementedRival, rows, selections,
}, null, 2) + '\n')
console.log(`Checked ${rows.length} approved tasks, two four-way contrasts and the implemented decimal rival. Application catalog matches; no production or pupil records changed.`)
