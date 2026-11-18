import { interpretAnswers, WRONG_BUCKETS } from './answerInterpretation.js'
import { slipExclusionKey } from './slipExclusionKey.js'
import { approvedMisconception } from '../domains/predictableErrors/misconceptions.js'
import { ERROR_MODELS } from '../domains/predictableErrors/catalog.js'

// Misconceptions in a screening's results (docs/STYRNING_FELFORSTAELSER.md,
// step 4). The server judges each pupil's answers with the shared
// interpretation (answerInterpretation.js), the same as the pupil report; the
// view lays the pupils' results side by side, so a class shows exactly what
// its pupils show (rule R-E).

// One pupil's answers in one screening, for the teacher view. The answers are
// what the teacher sees: an answer the teacher typed in from the notebook is
// judged as the pupil's (B4), with the pupil's own answer kept beside it.
export function screeningPupilAnswers(entries) {
  return interpretAnswers(entries, { answerSource: 'shown' }).rows.map(({ entry, original, status, bucket, reason, strength, supportUnits, counterUnits,
    misconceptionIds = [], modelIds = [], teacherMisconceptionIds }) => {
    const assessed = original.answer?.teacherAssessed === true
    return {
      assignmentItemId: entry.reference?.assignmentItemId ?? null, taskId: entry.question?.taskId ?? null,
      promptSv: entry.question?.promptSv ?? entry.question?.promptText ?? '',
      studentAnswer: entry.answer?.studentAnswer ?? null, correctAnswer: entry.answer?.correctAnswer ?? null, status,
      workWithoutAnswer: entry.answer?.workWithoutAnswer === true,
      ...(assessed ? { teacherAssessed: true, pupilStatus: original.answer.observed?.status ?? null,
        pupilAnswer: original.answer.observed?.studentAnswer ?? null } : {}),
      ...(bucket ? { bucket, misconceptionIds, modelTitlesSv: modelIds.map(id => ERROR_MODELS[id]?.titleSv).filter(Boolean) } : {}),
      ...(strength ? { strength, supportUnits, counterUnits } : {}),
      ...(reason ? { reason } : {}),
      ...(teacherMisconceptionIds ? { teacherMisconceptionIds } : {}),
      ...(entry.interpretation?.key?.status === 'approved' ? { keyNoteSv: entry.interpretation.key.noteSv } : {}) }
  })
}

// The answers for the screening view: those the teacher hid as slips leave the
// interpretation, as in the pupil report, and are listed on their own (R-C).
export function screeningCardAnswers(entries, exclusions = new Map()) {
  const hidden = entries.filter(entry => exclusions.has(slipExclusionKey(entry)))
  const kept = entries.filter(entry => !hidden.includes(entry))
  return [...screeningPupilAnswers(kept), ...hidden.map(entry => ({ assignmentItemId: entry.reference?.assignmentItemId ?? null,
    taskId: entry.question?.taskId ?? null, promptSv: entry.question?.promptSv ?? entry.question?.promptText ?? '',
    studentAnswer: entry.answer?.studentAnswer ?? null, correctAnswer: entry.answer?.correctAnswer ?? null,
    status: entry.answer?.status, hiddenSlip: true }))]
}

const OTHER = ['contradicted', 'gave_up', 'repeated_task', 'observation', 'input', 'without_link', 'unexplained']

// The group a pupil's wrong answer lands in among the cards and boxes. The
// results table names the same group, so a cell never contradicts the cards.
export const SCREENING_GROUP_LABELS_SV = {
  misconception: 'Pekar på en felförståelse', without_link: 'Felmodell utan kopplad felförståelse',
  contradicted: 'Motsagd av rätta svar',
  gave_up: 'Ger upp eller klickar förbi', input: 'Inmatning', repeated_task: 'Samma felsvar flera gånger',
  observation: 'Enstaka svar, för lite underlag', unexplained: 'Oförklarade'
}

export function screeningAnswerGroup(answer) {
  if (answer.bucket !== 'misconception') return { group: answer.bucket, misconceptions: [] }
  // An answer no approved card takes is still listed (rule R-C).
  const misconceptions = (answer.misconceptionIds ?? []).map(approvedMisconception).filter(Boolean)
  if (!misconceptions.length) return { group: 'without_link', misconceptions }
  // More comparable right answers than wrong ones (B2): shown, but not as a card.
  if (answer.strength === 'contradicted' && !answer.teacherMisconceptionIds?.length) return { group: 'contradicted', misconceptions }
  return { group: 'misconception', misconceptions }
}

// `pupils` are [{ studentId, answers }] for the pupils the teacher chose to see.
export function screeningMisconceptionView(pupils) {
  const counts = { wrong: 0, ...Object.fromEntries(WRONG_BUCKETS.map(bucket => [bucket, 0])), unanswered: 0, unansweredWithWork: 0, teacherMarkedNotWrong: 0, hiddenSlips: 0 }
  const cards = new Map(), other = Object.fromEntries([...OTHER, 'unanswered'].map(key => [key, []]))
  for (const { studentId, answers } of pupils) {
    for (const answer of answers) {
      const row = { studentId, ...answer, key: `${studentId}:${answer.position ?? answer.assignmentItemId}` }
      if (answer.hiddenSlip) { counts.hiddenSlips++; continue }
      if (answer.status === 'unanswered') {
        counts.unanswered++
        if (answer.workWithoutAnswer) { counts.unansweredWithWork++; other.unanswered.push(row) }
        continue
      }
      // A pupil's wrong answer the teacher judged right or incomplete is not counted here, as in the table.
      if (answer.status !== 'incorrect') {
        if (answer.teacherAssessed && answer.pupilStatus === 'incorrect') counts.teacherMarkedNotWrong++
        continue
      }
      counts.wrong++
      counts[answer.bucket]++
      const { group, misconceptions } = screeningAnswerGroup(answer)
      if (group !== 'misconception') { other[group].push(row); continue }
      for (const m of misconceptions) {
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
