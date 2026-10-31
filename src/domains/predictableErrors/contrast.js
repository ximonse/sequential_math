import { predictableCandidates, matchesComputedCorrect } from './index.js'
import { questionFingerprint } from './probes.js'

// Directed follow-up (practice-modes, mode 4): choose reviewed bank tasks on
// which the suspected error rule and its rivals give different answers.
// Answers are computed here; nothing is assigned or stored.

export const CONTRAST_MAX_ITEMS = 5
// A single matching answer is weak; ask for a repeated observation.
export const CONTRAST_MIN_ITEMS = 2

// Explanations that compete for the same column-subtraction answers.
const FAMILIES = [['smaller_minus_larger', 'exchange_not_decremented', 'borrow_forget']]
// Observations that are not method explanations.
const NOT_RIVALS = new Set(['operation_swap', 'place_value_scaling', 'partial_answer_entry', 'answer_off_by_one'])

export const CONTRAST_LABELS_SV = {
  smaller_minus_larger: 'Större minus mindre i varje kolumn',
  exchange_not_decremented: 'Växlar men minskar inte kolumnen till vänster',
  borrow_forget: 'Skriver 0 där växling behövs',
  zero_donor_not_decremented: 'Växling genom noll: hundratalet minskas inte',
  zero_intermediate_ten: 'Växling genom noll: tio tiotal behålls',
  carry_forget: 'Minnessiffran glöms',
  column_sums_concatenated: 'Kolumnsummor skrivs efter varandra',
}

const bankProblem = task => ({ domain: 'arithmetic', type: task.operation, skill: task.operation,
  values: { a: task.operands?.[0], b: task.operands?.[1] }, display: { text: `${task.operands?.[0]} ${task.operation === 'subtraction' ? '−' : '+'} ${task.operands?.[1]}` } })

function predictionMap(problem, models) {
  const result = predictableCandidates(problem, '')
  if (result.status === 'not_applicable') return null
  const values = { correct: result.computedCorrect }
  for (const model of models) {
    const hit = result.predictions.find(p => p.modelId === model)
    // A rule that gives the right answer here cannot be told apart from it.
    values[model] = hit ? hit.predictedAnswer : result.nonDiscriminatingModelIds.includes(model) ? result.computedCorrect : undefined
  }
  return { result, values }
}

const same = (result, x, y) => matchesComputedCorrect({ ...result, computedCorrect: x }, y)

// Inner zeros add their own difficulty (exchange through zero). Keep the
// follow-up on the structure the pupil actually met unless nothing else exists.
const hasInnerZero = problem => {
  const digits = String(Math.abs(Math.round(Number(problem.values?.a))))
  return digits.length > 2 && digits.slice(1, -1).includes('0')
}

export function rivalModels(modelId, supportProblems) {
  const rivals = new Set()
  for (const problem of supportProblems) {
    const result = predictableCandidates(problem, '')
    const own = result.predictions?.find(p => p.modelId === modelId)
    if (!own) continue
    for (const p of result.predictions) {
      if (p.modelId !== modelId && !NOT_RIVALS.has(p.modelId) && same(result, p.predictedAnswer, own.predictedAnswer)) rivals.add(p.modelId)
    }
  }
  for (const family of FAMILIES) if (family.includes(modelId)) family.forEach(m => m !== modelId && rivals.add(m))
  return [...rivals]
}

export function buildContrastSet({ modelId, supportProblems, bankTasks, seenFingerprints = new Set(), maxItems = CONTRAST_MAX_ITEMS }) {
  const models = [modelId, ...rivalModels(modelId, supportProblems)]
  const labels = ['correct', ...models]
  const pairs = labels.flatMap((x, i) => labels.slice(i + 1).map(y => [x, y]))
  const supportKeys = new Set(supportProblems.map(questionFingerprint))
  const supportZero = supportProblems.some(hasInnerZero)
  const candidates = []
  for (const task of bankTasks) {
    const problem = bankProblem(task)
    const key = questionFingerprint(problem)
    if (seenFingerprints.has(key) || supportKeys.has(key)) continue
    const computed = predictionMap(problem, models)
    if (!computed) continue
    const { result, values } = computed
    if (values[modelId] === undefined || same(result, values[modelId], values.correct)) continue
    const separates = pairs.filter(([x, y]) => values[x] !== undefined && values[y] !== undefined && !same(result, values[x], values[y]))
    // How many rival explanations this task tells apart from the suspected rule.
    const rivalSplits = separates.filter(([x, y]) => [x, y].includes(modelId) && ![x, y].includes('correct')).length
    candidates.push({ task, problem, values, separates, rivalSplits, structureMatch: hasInnerZero(problem) === supportZero })
  }
  const open = new Set(pairs.map(p => p.join('|'))), chosen = []
  const pick = pool => {
    let best = null, bestGain = 0
    for (const c of pool) {
      if (chosen.includes(c)) continue
      const gain = c.separates.filter(p => open.has(p.join('|'))).length
      if (gain > bestGain) { best = c; bestGain = gain }
    }
    return best
  }
  const matching = candidates.filter(c => c.structureMatch)
  while (chosen.length < maxItems) {
    const best = pick(matching) ?? pick(candidates)
    if (!best) break
    best.separates.forEach(p => open.delete(p.join('|')))
    chosen.push(best)
  }
  // Repeat the observation: prefer a same-structure task that also splits rivals.
  const byRivals = pool => [...pool].sort((x, y) => y.rivalSplits - x.rivalSplits)
  for (const c of [...byRivals(matching), ...byRivals(candidates)]) {
    if (chosen.length >= Math.min(CONTRAST_MIN_ITEMS, maxItems)) break
    if (!chosen.includes(c)) chosen.push(c)
  }
  if (!chosen.length) return { status: 'unavailable', models, items: [], unresolved: pairs,
    reasonSv: 'Ingen granskad kontrastfråga i banken skiljer den här felmodellen från rätt svar.' }
  return { status: 'proposed', models, items: chosen.map(c => ({ taskId: c.task.taskId, taskVersion: c.task.taskVersion,
    promptSv: c.task.promptSv, text: c.problem.display.text, correct: c.values.correct,
    predictions: Object.fromEntries(models.map(m => [m, c.values[m]])) })),
    unresolved: pairs.filter(p => open.has(p.join('|'))) }
}
