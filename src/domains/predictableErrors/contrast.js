import { predictableCandidates, matchesComputedCorrect } from './index.js'
import { questionFingerprint } from './questionFingerprint.js'
import { DECIMAL_ADDITION_CARRY_FAMILY, MODEL_FAMILIES, MODEL_TITLES_SV, NOT_METHOD_MODELS } from './catalog.js'

// Directed follow-up (practice-modes, mode 4): choose reviewed bank tasks on
// which the suspected error rule and its rivals give different answers.
// Answers are computed here; nothing is assigned or stored.

export const CONTRAST_MAX_ITEMS = 5
// A single matching answer is weak; ask for a repeated observation.
export const CONTRAST_MIN_ITEMS = 2

// Rival families, the models that are not method explanations and the plain
// titles all come from the model catalogue.
const FAMILIES = MODEL_FAMILIES
export const NOT_RIVALS = NOT_METHOD_MODELS
export const CONTRAST_LABELS_SV = MODEL_TITLES_SV

const symbols = { addition: '+', subtraction: '−', multiplication: '×', division: '÷' }
const bankProblem = task => task.domain === 'fractions'
  ? { domain: 'fractions', type: 'fractions', skill: 'fractions',
    values: task.values, display: { text: task.values?.text } }
  : { domain: 'arithmetic', type: task.operation, skill: task.operation,
    values: { a: task.operands?.[0], b: task.operands?.[1] }, display: { text: `${task.operands?.[0]} ${symbols[task.operation] ?? '?'} ${task.operands?.[1]}` } }

export function modelPredictions(result, modelId) {
  const values = result.predictions.filter(prediction => prediction.modelId === modelId).map(prediction => prediction.predictedAnswer)
  if (result.nonDiscriminatingModelIds.includes(modelId)) values.push(result.computedCorrect)
  return values.filter((value, index) => !values.slice(0, index).some(previous => matchesComputedCorrect({ ...result, computedCorrect: previous }, value)))
}

function predictionMap(problem, models) {
  const result = predictableCandidates(problem, '')
  if (result.status === 'not_applicable') return null
  const values = { correct: result.computedCorrect }
  for (const model of models) {
    const variants = modelPredictions(result, model)
    values[model] = variants.length > 1 ? variants : variants[0]
  }
  return { result, values }
}

const same = (result, x, y) => (Array.isArray(x) ? x : [x]).some(left =>
  (Array.isArray(y) ? y : [y]).some(right => matchesComputedCorrect({ ...result, computedCorrect: left }, right)))

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
    const own = result.predictions?.filter(p => p.modelId === modelId) || []
    if (!own.length) continue
    for (const p of result.predictions) {
      if (p.modelId !== modelId && !NOT_RIVALS.has(p.modelId) && own.some(candidate => same(result, p.predictedAnswer, candidate.predictedAnswer))) rivals.add(p.modelId)
    }
  }
  // A family member is a rival only if it predicts a wrong answer on at least one of
  // the pupil's own tasks; a rule that gives the right answer there cannot explain the errors.
  const wrongSomewhere = m => supportProblems.some(problem => predictableCandidates(problem, '').predictions?.some(p => p.modelId === m))
  for (const family of FAMILIES) if (family.includes(modelId)) family.forEach(m => m !== modelId && wrongSomewhere(m) && rivals.add(m))
  // The approved decimal package compares all omitted carries with either
  // omitted position. Preserve the integer families' previous routing.
  if (DECIMAL_ADDITION_CARRY_FAMILY.includes(modelId) && supportProblems.some(problem => predictableCandidates(problem, '').scope === 'decimal_addition')) {
    DECIMAL_ADDITION_CARRY_FAMILY.forEach(m => m !== modelId && wrongSomewhere(m) && rivals.add(m))
  }
  return [...rivals]
}

export function buildContrastSet({ modelId, supportProblems, bankTasks, seenFingerprints = new Set(), maxItems = CONTRAST_MAX_ITEMS, models: selectedModels, analysis }) {
  const supportAnalysis = analysis ?? predictableCandidates(supportProblems[0], '')
  const models = selectedModels ?? [modelId, ...rivalModels(modelId, supportProblems)]
  const labels = ['correct', ...models]
  const pairs = labels.flatMap((x, i) => labels.slice(i + 1).map(y => [x, y]))
  const supportKeys = new Set(supportProblems.map(questionFingerprint))
  const supportZero = supportProblems.some(hasInnerZero)
  const candidates = []
  for (const task of bankTasks) {
    const problem = task.problem ?? bankProblem(task)
    const key = questionFingerprint(problem)
    if (seenFingerprints.has(key) || supportKeys.has(key)) continue
    const computed = predictionMap(problem, models)
    if (!computed) continue
    const { result, values } = computed
    if (result.domain !== supportAnalysis.domain || result.scope !== supportAnalysis.scope) continue
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
  if (!chosen.length) return { status: 'unavailable', models, items: [], discriminated: [], unresolved: pairs,
    reasonSv: 'Ingen granskad kontrastfråga i banken skiljer den här felmodellen från rätt svar.' }
  return { status: 'proposed', models, items: chosen.map(c => ({ taskId: c.task.taskId, taskVersion: c.task.taskVersion,
    promptSv: c.task.promptSv, text: c.problem.display.text, problem: c.problem, correct: c.values.correct,
    predictions: Object.fromEntries(models.map(m => [m, c.values[m]])) })),
    discriminated: pairs.filter(p => !open.has(p.join('|'))),
    unresolved: pairs.filter(p => open.has(p.join('|'))) }
}
