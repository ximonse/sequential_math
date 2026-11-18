import { isSpeedTrainingEntry } from './practiceModes.js'
import { ERROR_MODELS } from '../domains/predictableErrors/catalog.js'
import { answerModelIds, interpretAnswers, unexplainedReason, WRONG_BUCKETS } from './answerInterpretation.js'

export { pupilOwnEntry, unexplainedReason, WRONG_BUCKETS } from './answerInterpretation.js'

// Coverage of pupils' wrong answers (docs/STYRNING_FELFORSTAELSER.md, rules
// R-C and R-D). Every answer is counted once, by the pupil's own status.
// Every wrong answer lands in exactly one bucket; the sums are checked and a
// mismatch throws instead of returning a report that hides answers. The
// classification itself is the shared interpretation (answerInterpretation.js).
const KIND_ORDER = ['misconception', 'observation', 'input', 'gave_up']
const STATUSES = ['correct', 'incorrect', 'unanswered', 'partial']

// The bucket one answer takes by its models alone, without the pupil's other answers.
export function wrongAnswerBucket(entry) {
  const kinds = new Set(answerModelIds(entry).map(id => ERROR_MODELS[id].kind))
  return KIND_ORDER.find(kind => kinds.has(kind)) ?? 'unexplained'
}

// Where the answer belongs: the analysed domain and scope, else the question's own operation.
export function coverageArea(entry) {
  const result = entry?.interpretation?.predictable, q = entry?.question ?? {}
  const domain = result?.domain && result.domain !== 'unknown' ? result.domain : q.domain
  const part = result?.scope ?? q.operation ?? q.skill
  if (domain) return part && part !== domain ? `${domain}:${part}` : domain
  return entry?.source === 'screening' ? 'screening_without_structure' : 'unknown'
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

// One pupil's answers, each wrong answer in exactly one bucket, judged on the
// pupil's own answer (R-C). The screening cards and the pupil report use the
// same interpretation on the answer the teacher sees.
export function classifyPupilAnswers(entries = []) {
  const { analysed, rows, repeatedTasks } = interpretAnswers(entries, { answerSource: 'pupil' })
  return { analysed, rows, repeatedTasks: repeatedTasks.length }
}

// `entries` are one pupil's evidence entries as served by the evidence API,
// with or without computed candidates; a pattern is judged per pupil. `hiddenSlips` are answers the teacher hid as
// slips; they are outside `entries` and counted on their own line.
export function errorCoverage({ entries = [], hiddenSlips = [] } = {}) {
  const { analysed, rows, repeatedTasks } = classifyPupilAnswers(entries)

  const summary = { total: analysed.length, statuses: { ...Object.fromEntries(STATUSES.map(s => [s, 0])), other: 0 },
    unansweredWithWork: 0, teacherAssessed: 0, teacherChangedStatus: 0, hiddenSlips: hiddenSlips.length, repeatedTasks: 0,
    wrong: emptyWrong(), areas: {}, models: {}, unexplained: {} }
  rows.forEach(({ entry, original, status, bucket }) => {
    summary.statuses[STATUSES.includes(status) ? status : 'other']++
    if (status === 'unanswered' && entry.answer?.workWithoutAnswer) summary.unansweredWithWork++
    if (original.answer?.teacherAssessed) {
      summary.teacherAssessed++
      if (original.answer.status !== status) summary.teacherChangedStatus++
    }
    if (status !== 'incorrect') return
    const area = coverageArea(entry)
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
  summary.repeatedTasks = repeatedTasks
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
