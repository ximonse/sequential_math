import { describe, expect, it } from 'vitest'
import { screeningMisconceptionView, screeningPupilAnswers, screeningAnswerGroup } from './screeningMisconceptions.js'
import { withTeacherAssessment } from './evidenceTeacherAssessment.js'
import { addPredictableEvidence } from './evidencePredictableAnalysis.js'
import { buildPupilAnalysisDraft, validatePupilAnalysis } from './pupilAnalysis.js'
import { interpretAnswers, modelGroupStatus } from './answerInterpretation.js'

// Rule R-E extended to views (docs/FORSLAG_EN_TOLKNING_PER_SVAR.md, step 1):
// the same answers give the same verdict on the screening cards and in the
// pupil report. Each case is a contradiction the review of 2026-11-18 found.
const screening = (id, a, b, answer, extra = {}) => ({ source: 'screening', timestamp: 10 + Number(id.replace(/\D/gu, '') || 0), ref: id,
  reference: { kind: 'screening_attempt', attemptId: id, assignmentId: 'S', assignmentItemId: id },
  question: { taskId: `T-${a}-${b}`, taskVersion: 1, promptSv: `${a} − ${b}`, operation: 'subtraction', operands: [a, b], domain: 'arithmetic' },
  answer: { status: answer === null ? 'unanswered' : String(answer) === String(a - b) ? 'correct' : 'incorrect', studentAnswer: answer === null ? null : String(answer), correctAnswer: a - b },
  context: {}, interpretation: { category: 'unknown', patterns: [], detail: null }, ...extra })

// What each view says about one model: the screening card group and strength, and the report section.
function verdicts(entries, modelId) {
  const shown = entries.map(withTeacherAssessment)
  const answers = screeningPupilAnswers(shown).filter(answer => answer.status === 'incorrect')
  const cards = answers.map(answer => screeningAnswerGroup(answer).group)
  const evidence = { entries: addPredictableEvidence(shown), snapshotRevision: 'r', period: {}, source: 'screening', coverage: {} }
  const report = validatePupilAnalysis(buildPupilAnalysisDraft(evidence), evidence)
  const item = [...report.hypotheses, ...report.moreHypotheses].find(hypothesis => hypothesis.signalCode === modelId)
  return { cards, strengths: answers.map(answer => answer.strength), report: item?.evidenceStatus ?? null }
}

describe('one interpretation for screening cards and pupil report', () => {
  it('K1: a single wrong operation is a single answer in both, never a slip', () => {
    const result = verdicts([screening('A1', 402, 178, 580)], 'operation_swap')
    expect(result.cards).toEqual(['misconception'])
    expect(result.strengths).toEqual(['single'])
    expect(result.report).toBe('insufficient')
  })

  it('K2: more comparable right answers than wrong ones make the suspicion contradicted in both', () => {
    const wrong = [screening('W1', 402, 178, 376), screening('W2', 503, 267, 364)]
    const right = [[704, 358], [805, 469], [601, 237], [902, 546], [306, 127]].map(([a, b], i) => screening(`C${i}`, a, b, a - b))
    const result = verdicts([...wrong, ...right], 'smaller_minus_larger')
    expect(result.strengths).toEqual(['contradicted', 'contradicted'])
    expect(result.cards).toEqual(['contradicted', 'contradicted'])
    expect(result.report).toBe('contradicted')
  })

  it('K4: an answer the teacher typed in from the notebook is judged the same in both', () => {
    const typed = screening('A1', 402, 178, null, { answer: { status: 'unanswered', studentAnswer: null, correctAnswer: 224, workWithoutAnswer: true },
      teacherReview: { assessment: { answerStatus: 'incorrect', teacherAnswer: '376', misconceptionIds: [] } } })
    const result = verdicts([typed], 'smaller_minus_larger')
    expect(result.cards).toEqual(['misconception'])
    expect(result.report).toBe('insufficient')
    const [answer] = screeningPupilAnswers([withTeacherAssessment(typed)])
    expect(answer).toMatchObject({ studentAnswer: '376', teacherAssessed: true, pupilStatus: 'unanswered' })
  })
})

describe('speed training and repeated answers (B6, B7)', () => {
  const fact = (i, answer, skill = 'multiplication', problemType = 'mul_table_drill') => ({ source: 'practice', timestamp: i, ref: `f${i}`,
    reference: { kind: 'observation', observationId: `f${i}` },
    question: { domain: 'arithmetic', operation: 'multiplication', skill, problemType, values: { a: 6, b: 7 }, promptText: '6 · 7' },
    answer: { status: answer === 42 ? 'correct' : 'incorrect', studentAnswer: answer, correctAnswer: 42 }, context: {}, interpretation: { category: 'knowledge', patterns: [] } })

  it('counts different wrong answers on one fact lightly and the same wrong answer three times as repeated', () => {
    const different = interpretAnswers(addPredictableEvidence([fact(1, 40), fact(2, 48), fact(3, 49)]))
    expect(different.repeatedTasks).toEqual([])
    expect(different.rows.map(row => row.bucket)).not.toContain('misconception')
    const same = interpretAnswers(addPredictableEvidence([fact(1, 48), fact(2, 48), fact(3, 48)]))
    expect(same.repeatedTasks).toHaveLength(1)
    expect(same.rows.map(row => row.bucket)).toEqual(['repeated_task', 'repeated_task', 'repeated_task'])
  })

  it('keeps a speed-training model below a suspicion until it repeats', () => {
    const entries = addPredictableEvidence([fact(1, 48)])
    const supports = entries.filter(entry => entry.answer.status === 'incorrect')
    const ids = [...new Set(supports[0].interpretation.predictable.matches.map(match => match.modelId))]
    for (const id of ids) expect(modelGroupStatus(id, supports, entries).status).toBe('below')
  })

  it('shows a contradicted answer outside the cards but keeps every wrong answer counted (R-C)', () => {
    const wrong = [screening('W1', 402, 178, 376), screening('W2', 503, 267, 364)]
    const right = [[704, 358], [805, 469], [601, 237], [902, 546], [306, 127]].map(([a, b], i) => screening(`C${i}`, a, b, a - b))
    const answers = screeningPupilAnswers([...wrong, ...right]).map((answer, position) => ({ ...answer, position }))
    const view = screeningMisconceptionView([{ studentId: 'P', answers }])
    expect(view.cards).toEqual([])
    expect(view.other.contradicted).toHaveLength(2)
    expect(view.counts.wrong).toBe(2)
  })

  it('lists an answer hidden as a slip on its own line, not as a wrong answer, so older pages skip it (K5)', async () => {
    const { screeningCardAnswers } = await import('./screeningMisconceptions.js')
    const wrong = screening('W1', 402, 178, 376)
    const answers = screeningCardAnswers([wrong], new Map([['screening:W1', { key: 'screening:W1' }]])).map((answer, position) => ({ ...answer, position }))
    expect(answers).toEqual([expect.objectContaining({ status: 'hidden_slip', pupilStatus: 'incorrect', hiddenSlip: true })])
    const view = screeningMisconceptionView([{ studentId: 'P', answers }])
    expect(view.counts).toMatchObject({ wrong: 0, hiddenSlips: 1 })
    expect(view.cards).toEqual([])
  })
})
