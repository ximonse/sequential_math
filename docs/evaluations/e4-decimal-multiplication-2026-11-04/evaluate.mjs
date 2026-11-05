import { readFile, writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { predictableCandidates, candidatesForEvidence } from '../../../src/domains/predictableErrors/index.js'
import { buildContrastSet } from '../../../src/domains/predictableErrors/contrast.js'

// Synthetic, deterministic checks with an explicit answer key. This is not a
// blind test, an empirical pupil study, or approval of the proposed didactics.
const pack = JSON.parse(await readFile(new URL('./package.json', import.meta.url)))
const problem = task => ({ domain: 'arithmetic', type: 'multiplication', skill: 'multiplication', values: { a: task.a, b: task.b },
  display: { text: `${task.a} × ${task.b}` } })
const rows = []
for (const task of pack.tasks) {
  const [whole, tenth] = String(task.b).split('.').map(Number)
  // Independent place-value arithmetic, not the production predictor.
  assert.equal(task.correct, task.a * (whole * 10 + tenth) / 10)
  assert.equal(task.componentAnswer, Number(`${task.a * whole}.${task.a * tenth}`))
  const own = predictableCandidates(problem(task), task.componentAnswer)
  const right = predictableCandidates(problem(task), task.correct)
  assert.equal(right.status, 'correct')
  const discriminating = task.componentAnswer !== task.correct
  assert.equal(own.matches.some(match => match.modelId === pack.modelId), discriminating)
  for (const status of ['partial', 'unanswered']) {
    assert.equal(candidatesForEvidence({ question: { domain: 'arithmetic', operation: 'multiplication', values: problem(task).values },
      answer: { status, studentAnswer: task.componentAnswer, correctAnswer: task.correct } }).status, 'not_applicable')
  }
  const scaling = predictableCandidates(problem(task), task.correct * 10)
  assert.equal(scaling.matches.some(match => match.modelId === pack.modelId), false)
  rows.push({ taskId: task.taskId, phase: task.phase, correct: task.correct, componentAnswer: task.componentAnswer,
    discriminating, matchedModelIds: own.matches.map(match => match.modelId), correctStatus: right.status,
    scalingMatchedModelIds: scaling.matches.map(match => match.modelId) })
}
const source = pack.tasks.find(task => task.phase === 'source_example')
const bankTasks = pack.tasks.filter(task => task.phase === 'contrast').map(task => ({
  taskId: task.taskId, taskVersion: 1, operation: 'multiplication', operands: [task.a, task.b] }))
const contrast = buildContrastSet({ modelId: pack.modelId, supportProblems: [problem(source)], bankTasks })
assert.equal(contrast.status, 'proposed')
assert.equal(contrast.items.length, 2)
const exhausted = buildContrastSet({ modelId: pack.modelId, supportProblems: [problem(source)], bankTasks: [] })
assert.equal(exhausted.status, 'unavailable')
await writeFile(new URL('./evidence.json', import.meta.url), JSON.stringify({
  packageId: pack.id, ruleVersion: predictableCandidates(problem(source), source.componentAnswer).ruleVersion,
  method: 'synthetic_deterministic_not_blind', teacherApproval: 'pending', productionIntegration: false,
  assertions: { independentlyCheckedTasks: rows.length, correctAnswerControls: rows.length,
    nonMathematicalStatusControls: rows.length * 2, scalingControls: rows.length }, rows,
  draftContrastTaskIds: contrast.items.map(task => task.taskId), unresolvedPairs: contrast.unresolved,
  exhaustedBankStatus: exhausted.status,
}, null, 2) + '\n')
console.log(`Checked ${rows.length} proposed tasks; teacher review pending. No application bank or pupil records changed.`)
