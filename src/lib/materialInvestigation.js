import { predictableCandidates, matchesComputedCorrect } from '../domains/predictableErrors/index.js'
import { PREDICTABLE_RULE_VERSION } from '../domains/predictableErrors/core.js'
import { rivalModels, modelPredictions, CONTRAST_MAX_ITEMS } from '../domains/predictableErrors/contrast.js'
import { evidenceProblem } from './evidencePredictableAnalysis.js'
import { INPUT_SIGNAL_MODELS, isSpeedTrainingEntry } from './practiceModes.js'
import { followUpSignal } from './followUpSignal.js'

const fail = message => { throw Object.assign(new Error(message), { status: 400, code: 'invalid_investigation' }) }
const same = (question, left, right) => matchesComputedCorrect({ ...question, computedCorrect: left }, right)

// Called only with access-checked, revision-bound evidence and prepared tasks.
// Clients name the target; every rival, prediction and unresolved pair is derived.
export function buildMaterialInvestigation(input, { kind, mode, audience, classContexts, records, items, reportReview }) {
  if (!input || typeof input !== 'object' || Array.isArray(input)
    || Object.keys(input).some(key => !['schemaVersion', 'modelId', 'ruleVersion', 'reportReview'].includes(key))
    || input.schemaVersion !== 1 || typeof input.modelId !== 'string' || INPUT_SIGNAL_MODELS.has(input.modelId)) fail('Ogiltig prövningsavsikt.')
  if (input.ruleVersion !== PREDICTABLE_RULE_VERSION) fail('Prövningens regelversion har ändrats. Skapa ett nytt granskningsunderlag.')
  if (input.reportReview && (!reportReview || reportReview.studentId !== input.reportReview.studentId)) fail('Rapportreferensen behöver kontrolleras på servern.')
  if (kind !== 'screening' || mode !== 'specific') fail('Prövningsavsikt stöds bara för analysspecifik screening.')
  if (!Array.isArray(items) || !items.length || items.length > CONTRAST_MAX_ITEMS) fail('Prövningen behöver en till fem granskade frågor.')
  const pupils = audience.pupils.map(pupil => {
    const sources = records.filter(record => record.basis.studentId === pupil.studentId)
    if (!sources.length) fail('Varje mottagare behöver eget analysunderlag för prövningen.')
    if (sources.some(record => record.basis.classId !== classContexts[pupil.studentId])) fail('Prövningens klass stämmer inte med analysunderlaget.')
    const supports = sources.flatMap(({ basis, evidence }) => basis.supportRefs.map(ref => evidence.entries.find(entry => entry.ref === ref)))
    if (supports.some(entry => !entry || entry.answer.status !== 'incorrect'
      || entry.interpretation?.predictable?.ruleVersion !== input.ruleVersion
      || !entry.interpretation.predictable.matches.some(model => model.modelId === input.modelId))) fail('Målmodellen måste vara beräknad i varje stödsvar.')
    if (supports.every(isSpeedTrainingEntry)) fail('Snabbhetsträning ger inte automatiskt kontrastfrågor. Granska underlaget och välj screening separat.')
    const problems = supports.map(evidenceProblem)
    const scope = supports[0].interpretation.predictable
    if (supports.some(entry => entry.interpretation.predictable.domain !== scope.domain
      || entry.interpretation.predictable.scope !== scope.scope)) fail('Stödsvaren måste pröva samma avgränsade innehåll.')
    const rivals = rivalModels(input.modelId, problems).sort(), models = [input.modelId, ...rivals]
    const questions = items.map(({ task }) => {
      const result = predictableCandidates(evidenceProblem({ question: task }), '')
      const predictions = Object.fromEntries(models.flatMap(modelId => {
        const variants = modelPredictions(result, modelId)
        return variants.length ? [[modelId, variants]] : []
      }))
      if (result.status === 'not_applicable' || result.domain !== scope.domain || result.scope !== scope.scope || predictions[input.modelId] === undefined
        || predictions[input.modelId].some(answer => same(result, answer, result.computedCorrect))) fail('Vald fråga skiljer inte målmodellen från rätt svar.')
      return { taskId: task.taskId, taskVersion: task.taskVersion, answerType: result.answerType,
        correct: result.computedCorrect, predictions }
    })
    const labels = ['correct', ...models]
    const pairs = labels.flatMap((left, index) => labels.slice(index + 1).map(right => [left, right]))
    const value = (question, model) => model === 'correct' ? [question.correct] : question.predictions[model]
    const unresolvedPairs = pairs.filter(([left, right]) => !questions.some(question => value(question, left) !== undefined
      && value(question, right) !== undefined && !value(question, left).some(a => value(question, right).some(b => same(question, a, b)))))
    return { studentId: pupil.studentId, classId: classContexts[pupil.studentId],
      sources: sources.map(({ basis }) => ({ snapshotRevision: basis.snapshotRevision, source: basis.source || 'practice',
        from: basis.from, to: basis.to, supportRefs: basis.supportRefs, counterRefs: basis.counterRefs || [] })),
      ...(reportReview?.studentId === pupil.studentId ? { reportReview } : {}),
      rivalModelIds: rivals, questions, unresolvedPairs }
  })
  return { schemaVersion: 1, ruleVersion: input.ruleVersion, modelId: input.modelId, pupils }
}

// Result reads use the saved predictions, even if today's rule engine changes.
export function investigationMatches(question, answer) {
  return same(question, question.correct, answer) ? []
    : Object.entries(question.predictions).filter(([, predicted]) => predicted.some(value => same(question, value, answer))).map(([modelId]) => modelId)
}

export function investigationObservations(plan, entries) {
  let compatible = true
  const matchesByRef = new Map()
  const projected = entries.map(entry => {
    const question = plan.questions.find(question => question.taskId === entry.question.taskId && question.taskVersion === entry.question.taskVersion)
    const assessed = ['correct', 'incorrect'].includes(entry.answer.status)
    if (!question || (assessed && (!same(question, question.correct, entry.answer.correctAnswer)
      || (entry.answer.status === 'correct') !== same(question, question.correct, entry.answer.studentAnswer)))) compatible = false
    const matches = question && assessed ? investigationMatches(question, entry.answer.studentAnswer) : []
    matchesByRef.set(entry.ref, matches)
    return { ...entry, interpretation: { predictable: { matches: matches.map(modelId => ({ modelId })) } } }
  })
  const models = new Set(plan.questions.flatMap(question => Object.keys(question.predictions)))
  return { compatible, matchesByRef, observations: compatible ? followUpSignal(projected) : null,
    newModels: followUpSignal(entries).models.filter(model => !models.has(model.modelId)) }
}
