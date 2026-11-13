import { addPredictableEvidence } from './evidencePredictableAnalysis.js'
import { isSpeedTrainingEntry } from './practiceModes.js'
import { ERROR_MODELS } from '../domains/predictableErrors/catalog.js'
import { meetsPattern } from './modelPattern.js'
import { repeatedlyWrongTasks } from './repeatedTasks.js'

// Coverage of pupils' wrong answers (docs/STYRNING_FELFORSTAELSER.md, rules
// R-C and R-D). Every answer is counted once, by the pupil's own status.
// Every wrong answer lands in exactly one bucket; the sums are checked and a
// mismatch throws instead of returning a report that hides answers.
//
// A wrong answer matched by several models takes the first kind in this
// order. A misconception explains more than an observation of the answer,
// an observation more than an input slip, and a slip more than giving up.
// A wrong answer on a task the pupil got wrong at least three times counts as
// repeated_task unless a misconception explains it, whatever the answer was.
export const WRONG_BUCKETS = ['misconception', 'repeated_task', 'observation', 'input', 'gave_up', 'unexplained']
const KIND_ORDER = ['misconception', 'observation', 'input', 'gave_up']
const STATUSES = ['correct', 'incorrect', 'unanswered', 'partial']

// The pupil's own answer. A teacher's judgement sits beside it and is counted separately.
export function pupilOwnEntry(entry) {
  const answer = entry?.answer
  if (!answer?.teacherAssessed) return entry
  return { ...entry, answer: { ...answer, status: answer.observed?.status, studentAnswer: answer.observed?.studentAnswer } }
}

// One model within one domain and scope, the unit a report card shows.
const groupKey = (result, modelId) => JSON.stringify([result?.domain ?? null, result?.scope ?? null, modelId])

// Model groups whose answers do not yet form a pattern across different tasks.
// The answers are one pupil's, as in the report; they then count as observations.
export function groupsBelowPattern(entries) {
  const groups = new Map()
  for (const entry of entries) {
    const result = entry?.interpretation?.predictable
    if (entry?.answer?.status !== 'incorrect') continue
    for (const id of new Set((result?.matches ?? []).map(match => match.modelId))) {
      if (!ERROR_MODELS[id]?.minDistinctTasks) continue
      const key = groupKey(result, id)
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(entry)
    }
  }
  return new Set([...groups].filter(([key, list]) => !meetsPattern(JSON.parse(key)[2], list)).map(([key]) => key))
}

export function wrongAnswerBucket(entry, belowPattern = new Set()) {
  const result = entry?.interpretation?.predictable
  const ids = [...new Set((result?.matches ?? []).map(match => match.modelId))]
  for (const id of ids) if (!ERROR_MODELS[id]) throw Error(`Model outside the catalogue: ${id}`)
  const kinds = new Set(ids.map(id => belowPattern.has(groupKey(result, id)) ? 'observation' : ERROR_MODELS[id].kind))
  return KIND_ORDER.find(kind => kinds.has(kind)) ?? 'unexplained'
}

// An approved manual screening key explains what the models could not. A key
// still awaiting review leaves the answer unexplained, with its own reason.
const KEY_REASON_BUCKET = { input: 'input', fact_retrieval: 'observation', cognitive: 'observation' }
function keyBucket(entry, modelBucket) {
  const key = entry?.interpretation?.key
  if (modelBucket !== 'unexplained' || !key || key.status !== 'approved') return modelBucket
  return key.misconception ? 'misconception' : KEY_REASON_BUCKET[key.reason] ?? 'unexplained'
}

// Where the answer belongs: the analysed domain and scope, else the question's own operation.
export function coverageArea(entry) {
  const result = entry?.interpretation?.predictable, q = entry?.question ?? {}
  const domain = result?.domain && result.domain !== 'unknown' ? result.domain : q.domain
  const part = result?.scope ?? q.operation ?? q.skill
  if (domain) return part && part !== domain ? `${domain}:${part}` : domain
  return entry?.source === 'screening' ? 'screening_without_structure' : 'unknown'
}

// Why a wrong answer is unexplained: no model gives that answer, or the answer
// never reached the models (the reason the analysis gave).
export const unexplainedReason = entry => {
  const key = entry?.interpretation?.key
  if (key) return key.status === 'approved' ? 'key_needs_review' : 'key_awaiting_review'
  const result = entry?.interpretation?.predictable
  return result?.status === 'unmatched' ? 'no_model' : result?.reason ?? result?.status ?? 'not_analysed'
}

const emptyWrong = () => ({ incorrect: 0, ...Object.fromEntries(WRONG_BUCKETS.map(bucket => [bucket, 0])),
  unexplainedNoModel: 0, unexplainedNotAnalysed: 0, speedTraining: 0, reasons: {} })

function addWrong(target, bucket, entry) {
  target.incorrect++
  target[bucket]++
  if (bucket === 'unexplained') {
    const reason = unexplainedReason(entry)
    if (reason === 'no_model') target.unexplainedNoModel++
    else target.unexplainedNotAnalysed++
    target.reasons[reason] = (target.reasons[reason] ?? 0) + 1
  }
  if (isSpeedTrainingEntry(entry)) target.speedTraining++
}

function assertSums(summary) {
  const statusSum = STATUSES.reduce((sum, status) => sum + summary.statuses[status], 0) + summary.statuses.other
  const bucketSum = target => WRONG_BUCKETS.reduce((sum, bucket) => sum + target[bucket], 0)
  const problems = []
  if (statusSum !== summary.total) problems.push(`statuses ${statusSum} != total ${summary.total}`)
  if (summary.wrong.incorrect !== summary.statuses.incorrect) problems.push('wrong answers do not match incorrect status')
  if (bucketSum(summary.wrong) !== summary.wrong.incorrect) problems.push('wrong buckets do not add up')
  if (summary.wrong.unexplainedNoModel + summary.wrong.unexplainedNotAnalysed !== summary.wrong.unexplained) problems.push('unexplained split does not add up')
  if (Object.values(summary.wrong.reasons).reduce((sum, n) => sum + n, 0) !== summary.wrong.unexplained) problems.push('unexplained reasons do not add up')
  const areaSum = Object.values(summary.areas).reduce((sum, area) => sum + area.incorrect, 0)
  if (areaSum !== summary.wrong.incorrect) problems.push('areas do not add up')
  for (const [area, counts] of Object.entries(summary.areas)) if (bucketSum(counts) !== counts.incorrect) problems.push(`area ${area} does not add up`)
  if (problems.length) throw Error(`Error coverage sums failed: ${problems.join('; ')}`)
}

// `entries` are one pupil's evidence entries as served by the evidence API,
// with or without computed candidates; a pattern is judged per pupil. `hiddenSlips` are answers the teacher hid as
// slips; they are outside `entries` and counted on their own line.
export function errorCoverage({ entries = [], hiddenSlips = [] } = {}) {
  const own = entries.map(pupilOwnEntry)
  // Reuse the served analysis, except for answers whose analysed status was the
  // teacher's: those are analysed again on the pupil's own answer.
  const needsAnalysis = own.map(entry => entry.answer?.teacherAssessed || !entry.interpretation?.predictable)
  const fresh = addPredictableEvidence(own.filter((_, index) => needsAnalysis[index])
    .map(entry => ({ ...entry, interpretation: { ...entry.interpretation, predictable: undefined } })))
  let next = 0
  const analysed = own.map((entry, index) => needsAnalysis[index] ? fresh[next++] : entry)
  const below = groupsBelowPattern(analysed)
  const repeated = new Set(repeatedlyWrongTasks(analysed).flatMap(task => task.wrong))

  const summary = { total: analysed.length, statuses: { ...Object.fromEntries(STATUSES.map(s => [s, 0])), other: 0 },
    unansweredWithWork: 0, teacherAssessed: 0, teacherChangedStatus: 0, hiddenSlips: hiddenSlips.length, repeatedTasks: 0,
    wrong: emptyWrong(), areas: {}, models: {}, unexplained: {} }
  analysed.forEach((entry, index) => {
    const status = entry.answer?.status
    summary.statuses[STATUSES.includes(status) ? status : 'other']++
    if (status === 'unanswered' && entry.answer?.workWithoutAnswer) summary.unansweredWithWork++
    if (entries[index].answer?.teacherAssessed) {
      summary.teacherAssessed++
      if (entries[index].answer.status !== status) summary.teacherChangedStatus++
    }
    if (status !== 'incorrect') return
    const modelBucket = keyBucket(entry, wrongAnswerBucket(entry, below)), area = coverageArea(entry)
    const bucket = modelBucket !== 'misconception' && repeated.has(entry) ? 'repeated_task' : modelBucket
    addWrong(summary.wrong, bucket, entry)
    addWrong(summary.areas[area] ??= emptyWrong(), bucket, entry)
    const ids = [...new Set(entry.interpretation.predictable.matches?.map(match => match.modelId) ?? [])]
    for (const id of ids) {
      const model = summary.models[id] ??= { answers: 0, onlyModel: 0 }
      model.answers++
      if (ids.length === 1) model.onlyModel++
    }
    if (bucket === 'unexplained') {
      const q = entry.question ?? {}
      const key = `${area}\u0000${q.promptText ?? q.promptSv ?? ''}\u0000${String(entry.answer.studentAnswer ?? '')}`
      const row = summary.unexplained[key] ??= { area, question: q.promptText ?? q.promptSv ?? '', answer: entry.answer.studentAnswer ?? null,
        correctAnswer: entry.answer.correctAnswer ?? null, count: 0 }
      row.count++
    }
  })
  summary.repeatedTasks = repeatedlyWrongTasks(analysed).length
  summary.unexplained = Object.values(summary.unexplained).sort((a, b) => b.count - a.count || a.area.localeCompare(b.area))
  assertSums(summary)
  return summary
}

// Adds several pupils' summaries into one, for a group or a class.
export function mergeCoverage(summaries) {
  const total = { total: 0, statuses: { ...Object.fromEntries(STATUSES.map(s => [s, 0])), other: 0 }, unansweredWithWork: 0,
    teacherAssessed: 0, teacherChangedStatus: 0, hiddenSlips: 0, repeatedTasks: 0, wrong: emptyWrong(), areas: {}, models: {}, unexplained: [] }
  const addCounts = (target, source) => {
    for (const [key, value] of Object.entries(source)) {
      if (value && typeof value === 'object') addCounts(target[key] ??= {}, value)
      else target[key] = (target[key] ?? 0) + value
    }
  }
  const rows = new Map()
  for (const summary of summaries) {
    for (const key of ['total', 'unansweredWithWork', 'teacherAssessed', 'teacherChangedStatus', 'hiddenSlips', 'repeatedTasks']) total[key] += summary[key]
    addCounts(total.statuses, summary.statuses)
    addCounts(total.wrong, summary.wrong)
    for (const [area, counts] of Object.entries(summary.areas)) addCounts(total.areas[area] ??= emptyWrong(), counts)
    for (const [id, counts] of Object.entries(summary.models)) addCounts(total.models[id] ??= { answers: 0, onlyModel: 0 }, counts)
    for (const row of summary.unexplained) {
      const key = `${row.area}\u0000${row.question}\u0000${String(row.answer ?? '')}`
      if (!rows.has(key)) rows.set(key, { ...row, count: 0, pupils: 0 })
      rows.get(key).count += row.count
      rows.get(key).pupils++
    }
  }
  total.unexplained = [...rows.values()].sort((a, b) => b.count - a.count || a.area.localeCompare(b.area))
  assertSums(total)
  return total
}
