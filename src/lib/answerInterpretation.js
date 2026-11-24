import { addPredictableEvidence } from './evidencePredictableAnalysis.js'
import { isSpeedTrainingEntry } from './practiceModes.js'
import { arithmeticContentSignature } from './arithmeticContentSignature.js'
import { evidenceProblem } from './evidenceProblem.js'
import { ERROR_MODELS, YIELDS_TO_SPECIFIC_MODELS } from '../domains/predictableErrors/catalog.js'
import { approvedMisconception, misconceptionsForModel } from '../domains/predictableErrors/misconceptions.js'
import { questionFingerprint } from '../domains/predictableErrors/questionFingerprint.js'

// One interpretation of a pupil's answers for every teacher view
// (docs/FORSLAG_EN_TOLKNING_PER_SVAR.md, decisions B1-B7 in
// docs/STYRNING_FELFORSTAELSER.md section 10). The screening cards, the
// coverage count and the pupil report all judge answers here, so the same
// answers get the same verdict wherever the teacher reads them.
export const INTERPRETATION_VERSION = 1

// Every wrong answer lands in exactly one bucket (rule R-C). A wrong answer
// matched by several models takes the first kind in this order.
export const WRONG_BUCKETS = ['misconception', 'repeated_task', 'observation', 'input', 'gave_up', 'unexplained']
const KIND_ORDER = ['misconception', 'observation', 'input', 'gave_up']

// Speed training answers (tables and number fluency) become a suspicion only
// when they repeat (Simon 2026-11-18, B6/B7), as does the same wrong answer.
export const REPEAT_MINIMUM = 3

const current = entry => entry?.interpretation?.predictable
const unit = entry => entry?.reference?.observationId ?? entry?.reference?.attemptId ?? entry?.ref
const units = list => new Set(list.map(unit)).size
const level = entry => entry.context?.contentLevel ?? entry.context?.level

// The pupil's own answer. A teacher's judgement sits beside it.
export function pupilOwnEntry(entry) {
  const answer = entry?.answer
  if (!answer?.teacherAssessed) return entry
  return { ...entry, answer: { ...answer, status: answer.observed?.status, studentAnswer: answer.observed?.studentAnswer } }
}

// How many different tasks a set of answers covers. The same fact three times is one task.
export const distinctTasks = entries => new Set(entries.map(entry => questionFingerprint(evidenceProblem(entry)))).size

// A right answer on comparable content where the model would have shown.
export function comparableRuleCounter(entry, supports, modelId) {
  const value = current(entry)
  if (entry.answer.status !== 'correct' || value?.status !== 'correct' || !value.testedModelIds?.includes(modelId)) return false
  const work = entry.interpretation?.work
  if ([work?.visibleResult, work?.visibleResultWithExchangeMarks].some(result => result?.status === 'observed' && result.consistency === 'different')) return false
  return supports.some(support => {
    const other = current(support), left = level(entry), right = level(support)
    if (value.domain !== other?.domain || value.scope !== other?.scope) return false
    const knownLeft = typeof left === 'number' && left >= 1, knownRight = typeof right === 'number' && right >= 1
    if (knownLeft && knownRight) return left === right && Boolean(entry.context?.contentSkill)
      && entry.context.contentSkill === support.context?.contentSkill
    if (entry.source !== 'screening' && support.source !== 'screening') return false
    const signature = arithmeticContentSignature(evidenceProblem(entry))
    return signature !== null && signature === arithmeticContentSignature(evidenceProblem(support))
  })
}

// How strongly a model's wrong answers speak for it, among all of the pupil's answers.
// below: a requirement the catalogue sets is not met (B1), or speed training
//   that has not repeated (B6/B7). Counted as an observation, never as a slip.
// contradicted: more comparable right answers than wrong ones (B2). Still shown.
// single: one answer. pattern: more than one, nothing against it.
export function modelGroupStatus(modelId, supports, entries) {
  const counters = entries.filter(entry => comparableRuleCounter(entry, supports, modelId))
  const supportUnits = units(supports), counterUnits = units(counters)
  const minimum = ERROR_MODELS[modelId]?.minDistinctTasks
  const below = (minimum && distinctTasks(supports) < minimum)
    || (supports.length > 0 && supports.every(isSpeedTrainingEntry) && supportUnits < REPEAT_MINIMUM)
  // Right answers speak against a way of thinking, not against giving up, a slip or
  // an observation of the answer: only misconception models can be contradicted (B2).
  const contradicted = ERROR_MODELS[modelId]?.kind === 'misconception' && counterUnits > supportUnits
  const status = below ? 'below' : contradicted ? 'contradicted' : supportUnits > 1 ? 'pattern' : 'single'
  return { status, supports, counters, supportUnits, counterUnits }
}

// Model ids on one wrong answer, the generic ones dropped when a specific model explains it.
export function answerModelIds(entry) {
  const ids = [...new Set((current(entry)?.matches ?? []).map(match => match.modelId))]
  for (const id of ids) if (!ERROR_MODELS[id]) throw Error(`Model outside the catalogue: ${id}`)
  return ids.some(id => !YIELDS_TO_SPECIFIC_MODELS.has(id)) ? ids.filter(id => !YIELDS_TO_SPECIFIC_MODELS.has(id)) : ids
}

const groupKey = (result, modelId) => JSON.stringify([result?.domain ?? null, result?.scope ?? null, modelId])

// Each model's wrong answers within one domain and scope, with their status.
export function modelGroups(entries) {
  const groups = new Map()
  for (const entry of entries) {
    if (entry?.answer?.status !== 'incorrect') continue
    for (const id of answerModelIds(entry)) {
      const key = groupKey(current(entry), id)
      if (!groups.has(key)) groups.set(key, { key, modelId: id, supports: [] })
      groups.get(key).supports.push(entry)
    }
  }
  for (const group of groups.values()) Object.assign(group, modelGroupStatus(group.modelId, group.supports, entries))
  return groups
}

// Tasks where the pupil gave the same wrong answer at least three times
// (Simon 2026-11-18, B7): likely a fact learnt wrong. Different wrong answers
// on one task, or a single one, are counted but do not form this signal.
export function repeatedWrongAnswers(entries, { minimum = REPEAT_MINIMUM } = {}) {
  const tasks = new Map()
  for (const entry of entries) {
    if (!['correct', 'incorrect'].includes(entry?.answer?.status)) continue
    const q = entry.question ?? {}
    const key = q.taskId ? JSON.stringify(['task', q.taskId, q.taskVersion ?? null]) : questionFingerprint(evidenceProblem(entry))
    if (!tasks.has(key)) tasks.set(key, { key, wrong: [], correct: [] })
    tasks.get(key)[entry.answer.status === 'incorrect' ? 'wrong' : 'correct'].push(entry)
  }
  const repeated = []
  for (const task of tasks.values()) {
    const byAnswer = new Map()
    for (const entry of task.wrong) {
      const answer = String(entry.answer.studentAnswer ?? '').trim()
      if (!byAnswer.has(answer)) byAnswer.set(answer, [])
      byAnswer.get(answer).push(entry)
    }
    for (const [answer, wrong] of byAnswer) {
      if (answer && wrong.length >= minimum) repeated.push({ key: task.key, answer, wrong, correct: task.correct, allWrong: task.wrong })
    }
  }
  return repeated.sort((a, b) => b.wrong.length - a.wrong.length || a.key.localeCompare(b.key))
}

// An approved manual screening key explains what the models could not.
const KEY_REASON_BUCKET = { input: 'input', fact_retrieval: 'observation', cognitive: 'observation' }
function keyBucket(entry, modelBucket) {
  const key = entry?.interpretation?.key
  if (modelBucket !== 'unexplained' || !key || key.status !== 'approved') return modelBucket
  return key.misconception ? 'misconception' : KEY_REASON_BUCKET[key.reason] ?? 'unexplained'
}

export const unexplainedReason = entry => {
  const key = entry?.interpretation?.key
  if (key) return key.status === 'approved' ? 'key_needs_review' : 'key_awaiting_review'
  const result = current(entry)
  return result?.status === 'unmatched' ? 'no_model' : result?.reason ?? result?.status ?? 'not_analysed'
}

const STRENGTH_ORDER = ['pattern', 'single', 'contradicted']

// One pupil's answers, each wrong answer in exactly one bucket.
// answerSource 'shown' analyses what the teacher sees, including an answer the
// teacher typed in from the notebook (B4); 'pupil' keeps the pupil's own answer,
// as the coverage count does (R-C).
export function interpretAnswers(entries = [], { answerSource = 'shown' } = {}) {
  const own = answerSource === 'pupil' ? entries.map(pupilOwnEntry) : entries
  // Reuse the served analysis, which is of the shown answer; the pupil's own
  // answer is analysed again where the teacher's judgement replaced it.
  const needsAnalysis = own.map(entry => !entry.interpretation?.predictable
    || (answerSource === 'pupil' && entry.answer?.teacherAssessed))
  const fresh = addPredictableEvidence(own.filter((_, index) => needsAnalysis[index])
    .map(entry => ({ ...entry, interpretation: { ...entry.interpretation, predictable: undefined } })))
  let next = 0
  const analysed = own.map((entry, index) => needsAnalysis[index] ? fresh[next++] : entry)
  const groups = modelGroups(analysed)
  const repeated = new Set(repeatedWrongAnswers(analysed).flatMap(task => task.wrong))
  const rows = analysed.map((entry, index) => {
    const status = entry.answer?.status
    if (status !== 'incorrect') return { entry, original: entries[index], status }
    const result = current(entry), ids = answerModelIds(entry)
    const judged = ids.map(id => groups.get(groupKey(result, id)))
    const kinds = new Set(judged.map(group => group.status === 'below' ? 'observation' : ERROR_MODELS[group.modelId].kind))
    const modelBucket = keyBucket(entry, KIND_ORDER.find(kind => kinds.has(kind)) ?? 'unexplained')
    const appBucket = modelBucket !== 'misconception' && repeated.has(entry) ? 'repeated_task' : modelBucket
    // A misconception the teacher picked from the approved list makes the answer one (Simon 2026-11-13).
    const teacherIds = (entries[index]?.teacherReview?.assessment?.misconceptionIds ?? []).filter(id => approvedMisconception(id))
    const bucket = teacherIds.length ? 'misconception' : appBucket
    const counted = judged.filter(group => ERROR_MODELS[group.modelId].kind === 'misconception' && group.status !== 'below')
    const appIds = appBucket !== 'misconception' ? [] : [...new Set([...counted.flatMap(group => misconceptionsForModel(group.modelId).map(m => m.id)),
      ...(entry.interpretation?.key?.status === 'approved' && entry.interpretation.key.misconception ? [entry.interpretation.key.misconception] : [])])]
    const strength = teacherIds.length ? 'pattern'
      : STRENGTH_ORDER.find(value => counted.some(group => group.status === value)) ?? (bucket === 'misconception' ? 'single' : null)
    const strongest = counted.find(group => group.status === strength)
    return { entry, original: entries[index], status, bucket, misconceptionIds: [...new Set([...appIds, ...teacherIds])],
      ...(teacherIds.length ? { teacherMisconceptionIds: teacherIds } : {}),
      ...(strength ? { strength } : {}),
      ...(strongest ? { supportUnits: strongest.supportUnits, counterUnits: strongest.counterUnits } : {}),
      modelIds: ids,
      ...(bucket === 'unexplained' ? { reason: unexplainedReason(entry) } : {}) }
  })
  return { analysed, rows, groups, repeatedTasks: repeatedWrongAnswers(analysed) }
}
