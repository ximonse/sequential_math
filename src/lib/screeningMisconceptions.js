import { classifyPupilAnswers, WRONG_BUCKETS } from './errorCoverage.js'
import { approvedMisconception, misconceptionsForModel } from '../domains/predictableErrors/misconceptions.js'
import { ERROR_MODELS, SCREENING_SINGLE_MODELS } from '../domains/predictableErrors/catalog.js'

// Misconceptions in a screening's results (docs/STYRNING_FELFORSTAELSER.md,
// step 4). The server classifies each pupil's answers with the same function as
// the coverage count and the pupil report; the view lays the pupils' results
// side by side, so a class shows exactly what its pupils show (rule R-E).

// One pupil's answers in one screening, for the teacher view.
export function screeningPupilAnswers(entries) {
  return classifyPupilAnswers(entries).rows.map(withSingleOccurrence).map(({ entry, original, status, bucket, reason, misconceptionIds = [], modelIds = [], teacherMisconceptionIds, singleOccurrence }) => ({
    assignmentItemId: entry.reference?.assignmentItemId ?? null, taskId: entry.question?.taskId ?? null,
    promptSv: entry.question?.promptSv ?? entry.question?.promptText ?? '',
    studentAnswer: entry.answer?.studentAnswer ?? null, correctAnswer: entry.answer?.correctAnswer ?? null, status,
    workWithoutAnswer: entry.answer?.workWithoutAnswer === true,
    // The teacher's verdict, shown in the matrix, decides whether the answer counts as wrong here.
    ...(original.answer?.teacherAssessed ? { teacherStatus: original.answer.status } : {}),
    ...(bucket ? { bucket, misconceptionIds, modelTitlesSv: modelIds.map(id => ERROR_MODELS[id]?.titleSv).filter(Boolean) } : {}),
    ...(reason ? { reason } : {}),
    ...(teacherMisconceptionIds ? { teacherMisconceptionIds } : {}),
    ...(singleOccurrence ? { singleOccurrence } : {}),
    ...(entry.interpretation?.key?.status === 'approved' ? { keyNoteSv: entry.interpretation.key.noteSv } : {}) }))
}

// A wrong operation is clear even once (Simon 2026-11-14): in a screening it goes
// on its card, marked as one occurrence, instead of waiting for three tasks.
function withSingleOccurrence(row) {
  if (row.bucket !== 'observation') return row
  const ids = row.modelIds.filter(id => SCREENING_SINGLE_MODELS.has(id))
  const misconceptionIds = [...new Set(ids.flatMap(id => misconceptionsForModel(id).map(m => m.id)))]
  return misconceptionIds.length ? { ...row, bucket: 'misconception', misconceptionIds, singleOccurrence: true } : row
}

const OTHER = ['gave_up', 'repeated_task', 'observation', 'input', 'without_link', 'unexplained']

// `pupils` are [{ studentId, answers }] for the pupils the teacher chose to see.
export function screeningMisconceptionView(pupils) {
  const counts = { wrong: 0, ...Object.fromEntries(WRONG_BUCKETS.map(bucket => [bucket, 0])), unanswered: 0, unansweredWithWork: 0, teacherMarkedNotWrong: 0 }
  const cards = new Map(), other = Object.fromEntries([...OTHER, 'unanswered'].map(key => [key, []]))
  for (const { studentId, answers } of pupils) {
    for (const answer of answers) {
      const row = { studentId, ...answer, key: `${studentId}:${answer.position ?? answer.assignmentItemId}` }
      if (answer.status === 'unanswered') {
        counts.unanswered++
        if (answer.workWithoutAnswer) { counts.unansweredWithWork++; other.unanswered.push(row) }
        continue
      }
      if (answer.status !== 'incorrect') continue
      if ((answer.teacherStatus ?? 'incorrect') !== 'incorrect') { counts.teacherMarkedNotWrong++; continue }
      counts.wrong++
      counts[answer.bucket]++
      if (answer.bucket !== 'misconception') { other[answer.bucket].push(row); continue }
      // An answer no approved card takes is still listed (rule R-C).
      const approved = (answer.misconceptionIds ?? []).map(approvedMisconception).filter(Boolean)
      if (!approved.length) other.without_link.push(row)
      for (const m of approved) {
        if (!cards.has(m.id)) cards.set(m.id, { id: m.id, titleSv: m.titleSv, areaSv: m.areaSv, logicSv: m.logicSv, criticalAspectSv: m.criticalAspectSv, answers: [] })
        cards.get(m.id).answers.push(row)
      }
    }
  }
  const pupilCount = card => new Set(card.answers.map(answer => answer.studentId)).size
  const sorted = [...cards.values()].map(card => ({ ...card, pupils: pupilCount(card) }))
    .sort((a, b) => b.pupils - a.pupils || b.answers.length - a.answers.length || a.titleSv.localeCompare(b.titleSv, 'sv'))
  const bucketSum = WRONG_BUCKETS.reduce((sum, bucket) => sum + counts[bucket], 0)
  if (bucketSum !== counts.wrong) throw Error(`Screening misconception sums failed: ${bucketSum} != ${counts.wrong}`)
  return { counts, cards: sorted, other }
}
