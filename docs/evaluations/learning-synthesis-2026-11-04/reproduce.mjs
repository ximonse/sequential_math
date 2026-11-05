// Read-only audit evidence. Run from any directory; JSON goes to stdout.
// This finite search demonstrates availability, never full didactic coverage.
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { predictableCandidates } from '../../../src/domains/predictableErrors/index.js'
import { buildContrastSet } from '../../../src/domains/predictableErrors/contrast.js'
import { predictableProbes, selectPredictableProbe, questionFingerprint } from '../../../src/domains/predictableErrors/probes.js'
import { followUpSignal } from '../../../src/lib/followUpSignal.js'
import { buildRuleHypotheses, comparableRuleCounter } from '../../../src/lib/pupilRuleHypotheses.js'
import { addPredictableEvidence } from '../../../src/lib/evidencePredictableAnalysis.js'

const root = new URL('../../../', import.meta.url)
const read = path => readFile(new URL(path, root), 'utf8')
const bank = JSON.parse(await read('src/domains/arithmetic/diagnosticTasks.v1.json'))
const sources = {
  arithmetic: ['src/domains/predictableErrors/arithmetic.js', 'src/domains/arithmetic/subtractionCandidates.js', 'src/domains/predictableErrors/core.js'],
  fractions: ['src/domains/predictableErrors/fractions.js'],
  percentage: ['src/domains/predictableErrors/percentage.js'],
  algebra: ['src/domains/predictableErrors/algebra.js'],
  arithmetic_expressions: ['src/domains/predictableErrors/expressions.js'],
  number_fluency: ['src/domains/predictableErrors/fluency.js', 'src/domains/predictableErrors/core.js'],
}
const legacy = JSON.parse(await read('docs/NCM_RULE_READINESS.json'))
const legacySignals = []
for (const domain of legacy.domains) for (const signal of domain.signals) {
  const source = await read(signal.file)
  legacySignals.push({ domain: domain.id, signal: signal.signal, kind: signal.kind, file: signal.file,
    literalStillPresent: source.includes(signal.signal),
    hashMatchesHistoricalInventory: createHash('sha256').update(source).digest('hex') === signal.sourceSha256 })
}
const hashes = {}, inventory = []
const samples = predictableProbes.map(p => p.problem)
const arithmetic = (operation, a, b) => ({ domain: 'arithmetic', skill: operation, type: operation, values: { a, b } })
const numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 15, 23, 28, 34, 38, 41, 46, 47, 57, 62, 68, 78, 81, 84, 90, 100, 125, 128, 145, 146, 168, 217, 268, 357, 371, 402, 428, 503, 621, 642, 648, 652, 753, 804, 936]
for (const operation of ['addition', 'subtraction', 'multiplication', 'division']) {
  for (const a of numbers) for (const b of numbers) samples.push(arithmetic(operation, a, b))
}
samples.push(arithmetic('multiplication', 7, 6.7), arithmetic('addition', 3.48, 2.67), arithmetic('subtraction', 6.42, 2.17))
for (const text of ['2/5 + 1/3', '3/4 - 1/3', '2/3 * 3/5', '3/7 * 4']) samples.push({ domain: 'fractions', skill: 'fractions', values: { text } })

const observed = new Map()
for (const problem of samples) {
  const result = predictableCandidates(problem, '')
  for (const prediction of result.predictions) {
    const key = `${problem.domain}:${prediction.modelId}`
    const hit = observed.get(key) ?? { scopes: new Set(), example: null, probe: null, contrast: null }
    hit.scopes.add(result.scope)
    const probe = hit.probe ? null : selectPredictableProbe({ ...result, matches: [prediction] }, new Set([questionFingerprint(problem)]))
    const contrast = !hit.contrast && problem.domain === 'arithmetic' ? buildContrastSet({ modelId: prediction.modelId, supportProblems: [problem], bankTasks: bank.tasks }) : null
    hit.example ??= { problem, modelAnswer: prediction.predictedAnswer, correct: result.computedCorrect }
    if (probe?.status === 'proposed') hit.probe ??= probe.taskId
    if (contrast?.status === 'proposed') hit.contrast ??= { taskIds: contrast.items.map(i => i.taskId), unresolved: contrast.unresolved, displayExample: contrast.items[0] }
    observed.set(key, hit)
  }
}
for (const [domain, paths] of Object.entries(sources)) {
  const ids = new Set()
  for (const path of paths) {
    const source = await read(path)
    hashes[path] = createHash('sha256').update(source).digest('hex')
    for (const m of source.matchAll(/(?:prediction|add|push)\('([a-z_]+)'/g)) ids.add(m[1])
    for (const m of source.matchAll(/\['(expression_[a-z_]+)', (?:true|false)/g)) ids.add(m[1])
  }
  for (const modelId of [...ids].sort()) {
    const hit = observed.get(`${domain}:${modelId}`)
    inventory.push({ domain, modelId, sourcePaths: paths, observedScopes: [...(hit?.scopes ?? [])].sort(),
      example: hit?.example ?? null, singletonProbeExample: hit?.probe ?? null,
      reviewedArithmeticBankExample: hit?.contrast ?? null,
      limitation: 'Finite constructed search; does not establish coverage of all scopes, rival sets, unseen history, or teacher access.' })
  }
}
const entry = (ref, status, modelIds = [], extra = {}) => ({ ref, source: 'screening', timestamp: 1,
  reference: { attemptId: ref }, question: {}, context: { evidenceClass: 'diagnostic_only' },
  answer: { status }, interpretation: { predictable: { status: status === 'correct' ? 'correct' : 'matched',
    domain: 'arithmetic', scope: 'subtraction', ruleVersion: 'predictable-errors-v7',
    matches: modelIds.map(modelId => ({ modelId, reasonSv: 'Constructed audit example.' })), testedModelIds: ['smaller_minus_larger'] } }, ...extra })
const incompleteBatch = [entry('answered', 'correct'), entry('waiting', 'unanswered')]
const tie = [entry('a', 'incorrect', ['smaller_minus_larger', 'exchange_not_decremented']), entry('b', 'incorrect', ['smaller_minus_larger', 'exchange_not_decremented'])]
const correct = entry('counter', 'correct')
const support = entry('support', 'incorrect', ['smaller_minus_larger'])
const multiplicationSet = buildContrastSet({ modelId: 'mul_carry_forgotten', supportProblems: [arithmetic('multiplication', 46, 7)], bankTasks: bank.tasks })
const fractionSet = buildContrastSet({ modelId: 'fraction_components_separately', supportProblems: [{ domain: 'fractions', skill: 'fractions', values: { text: '2/5 + 1/3' } }], bankTasks: bank.tasks })
const enriched = addPredictableEvidence([entry('sub', 'incorrect', [], { question: { operation: 'subtraction', operands: [47, 29] }, answer: { status: 'incorrect', studentAnswer: 22, correctAnswer: 18 } })])
const examples = {
  partialBatchAgainst: { input: incompleteBatch.map(e => ({ ref: e.ref, status: e.answer.status })), actual: followUpSignal(incompleteBatch) },
  tiedRivals: { inputModelIds: tie.map(e => e.interpretation.predictable.matches.map(m => m.modelId)), actual: followUpSignal(tie) },
  unrelatedModel: { intendedModelNotPassedToFunction: 'exchange_not_decremented', actual: followUpSignal([entry('x', 'incorrect', ['carry_forget']), entry('y', 'incorrect', ['carry_forget'])]) },
  screeningCounter: { context: correct.context, modelTested: true, actualComparable: comparableRuleCounter(correct, [support], 'smaller_minus_larger'),
    practiceWithKnownContentComparable: comparableRuleCounter({ ...correct, context: { contentLevel: 4, contentSkill: 'subtraction' } }, [{ ...support, context: { contentLevel: 4, contentSkill: 'subtraction' } }], 'smaller_minus_larger') },
  multiplicationDisplay: { status: multiplicationSet.status, first: multiplicationSet.items[0] },
  fractionsBank: { status: fractionSet.status, reason: fractionSet.reasonSv },
  reportProbe: { nextProbe: enriched[0].interpretation.predictable.nextProbe, reportNextCheck: buildRuleHypotheses(enriched)[0]?.nextCheckSv },
}
for (const path of ['src/domains/predictableErrors/contrast.js', 'src/domains/predictableErrors/probes.js',
  'src/lib/followUpSignal.js', 'src/lib/pupilRuleHypotheses.js', 'src/lib/evidencePredictableAnalysis.js',
  'api/_pupilScreeningEvidence.js', 'api/_teacherMaterialPreview.js', 'src/components/teacher/FollowUpResults.jsx',
  'src/components/teacher/sections/ContrastFollowUp.jsx', 'src/domains/arithmetic/diagnosticTasks.v1.json',
  'src/components/teacher/sections/SupportPriorityPanel.jsx', 'src/components/teacher/sections/dashboardAssignmentActions.js',
  'src/components/teacher/sections/dashboardAssignmentRiskHelpers.js']) {
  hashes[path] = createHash('sha256').update(await read(path)).digest('hex')
}
if (examples.partialBatchAgainst.actual.kind !== 'against' || examples.tiedRivals.actual.kind !== 'supports'
  || examples.screeningCounter.actualComparable !== false || examples.screeningCounter.practiceWithKnownContentComparable !== true
  || fractionSet.status !== 'unavailable' || multiplicationSet.status !== 'proposed') throw Error('Audit baseline changed; reassess findings before publishing evidence.')
console.log(JSON.stringify({ date: '2026-11-04', inspectedCommit: '82ab3325f8d475885381fe5db85c019834faf5c5',
  ruleVersion: 'predictable-errors-v7', bankVersion: bank.manifestVersion,
  sampleProblems: samples.length, inventoryCount: inventory.length, sourceHashes: hashes, legacySignals, inventory, examples }, null, 2))
