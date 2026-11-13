import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { errorCoverage, mergeCoverage, wrongAnswerBucket, WRONG_BUCKETS } from './errorCoverage.js'
import { syntheticCoverageEntries } from './errorCoverageFixture.js'
import { addPredictableEvidence } from './evidencePredictableAnalysis.js'
import { ERROR_MODELS } from '../domains/predictableErrors/catalog.js'
import { SNAPSHOT, syntheticSnapshot } from '../../scripts/error-coverage.mjs'

// Rules R-C and R-D in docs/STYRNING_FELFORSTAELSER.md: no wrong answer may
// disappear from the count, and the coverage is stored per version.
const strip = entries => entries.map(({ expectedModel: _model, expectedReason: _reason, ...entry }) => entry)
const fixture = syntheticCoverageEntries()

describe('error coverage', () => {
  it('counts every answer once and every wrong answer in exactly one bucket', () => {
    const summary = errorCoverage({ entries: strip(fixture), hiddenSlips: ['a', 'b'] })
    expect(summary.total).toBe(fixture.length)
    expect(summary.hiddenSlips).toBe(2)
    expect(WRONG_BUCKETS.reduce((sum, bucket) => sum + summary.wrong[bucket], 0)).toBe(summary.statuses.incorrect)
    expect(summary.unansweredWithWork).toBe(1)
  })

  it('places a model example in its own kind, or a stronger kind that also explains it', () => {
    const analysed = addPredictableEvidence(strip(fixture))
    fixture.forEach((source, index) => {
      if (!source.expectedModel) return
      const bucket = wrongAnswerBucket(analysed[index])
      expect(WRONG_BUCKETS.indexOf(bucket), `${source.expectedModel}: ${bucket}`)
        .toBeLessThanOrEqual(WRONG_BUCKETS.indexOf(ERROR_MODELS[source.expectedModel].kind))
    })
  })

  it('counts the pupil\'s own wrong answer even when the teacher judged it right', () => {
    const judged = fixture.find(entry => entry.answer.teacherAssessed)
    const summary = errorCoverage({ entries: strip([judged]) })
    expect(summary.statuses.incorrect).toBe(1)
    expect(summary.teacherAssessed).toBe(1)
    expect(summary.teacherChangedStatus).toBe(1)
    expect(summary.wrong.misconception).toBe(1)
  })

  it('says why an unexplained answer is unexplained', () => {
    const summary = errorCoverage({ entries: strip(fixture.filter(entry => entry.expectedReason)) })
    expect(summary.wrong.unexplained).toBe(2)
    expect(summary.wrong.reasons).toEqual({ no_model: 1, unsupported_structure: 1 })
    expect(summary.areas.screening_without_structure.unexplained).toBe(1)
  })

  it('gives a group the same totals as its pupils added together', () => {
    // Patterns are judged per pupil, so a group is its pupils' summaries added, not one pooled count.
    const half = Math.floor(fixture.length / 2)
    const pupils = [errorCoverage({ entries: strip(fixture.slice(0, half)) }), errorCoverage({ entries: strip(fixture.slice(half)) })]
    const merged = mergeCoverage(pupils)
    expect(merged.total).toBe(pupils[0].total + pupils[1].total)
    for (const key of ['incorrect', ...WRONG_BUCKETS]) expect(merged.wrong[key], key).toBe(pupils[0].wrong[key] + pupils[1].wrong[key])
    for (const area of Object.keys(merged.areas)) expect(merged.areas[area].incorrect, area)
      .toBe((pupils[0].areas[area]?.incorrect ?? 0) + (pupils[1].areas[area]?.incorrect ?? 0))
  })

  it('refuses a model that is not in the catalogue', () => {
    expect(() => wrongAnswerBucket({ interpretation: { predictable: { matches: [{ modelId: 'not_in_catalogue' }] } } })).toThrow(/outside the catalogue/u)
  })

  it('matches the stored synthetic coverage; update it with --write when a change is intended', () => {
    expect(syntheticSnapshot()).toEqual(JSON.parse(readFileSync(SNAPSHOT, 'utf8')))
  })
})

describe('a pattern across different tasks (decision 3)', () => {
  const table = (a, b, answer) => ({ source: 'practice', ref: `t-${a}-${b}-${answer}-${Math.random()}`, reference: { kind: 'observation' },
    question: { domain: 'arithmetic', operation: 'multiplication', skill: 'multiplication', values: { a, b }, promptText: `${a} · ${b}` },
    answer: { status: 'incorrect', studentAnswer: answer, correctAnswer: a * b }, context: {}, interpretation: { category: 'knowledge', patterns: [] } })

  it('counts a neighbouring product as a misconception on three different facts', () => {
    const summary = errorCoverage({ entries: [table(6, 6, 42), table(8, 8, 72), table(5, 6, 25)] })
    expect(summary.wrong.misconception).toBe(3)
  })

  it('catches the same fact answered wrongly three times as a repeated task, not a pattern', () => {
    const same = errorCoverage({ entries: [table(6, 7, 36), table(6, 7, 36), table(6, 7, 36)] })
    expect(same.wrong.misconception).toBe(0)
    expect(same.wrong.repeated_task).toBe(3)
    expect(same.repeatedTasks).toBe(1)
    // Whatever the wrong answers are (Simon 2026-11-13).
    expect(errorCoverage({ entries: [table(6, 7, 36), table(6, 7, 40), table(6, 7, 47)] }).wrong.repeated_task).toBe(3)
    expect(errorCoverage({ entries: [table(6, 7, 36), table(6, 7, 40)] }).wrong.repeated_task).toBe(0)
  })

  it('treats another operation as a misconception once it shows on three different tasks', () => {
    const add = (a, b) => ({ ...table(a, b, a * b), question: { domain: 'arithmetic', operation: 'subtraction', skill: 'subtraction', values: { a, b }, promptText: `${a} − ${b}` },
      answer: { status: 'incorrect', studentAnswer: a + b, correctAnswer: a - b } })
    expect(errorCoverage({ entries: [add(9, 4), add(8, 3), add(7, 2)] }).wrong.misconception).toBe(3)
    expect(errorCoverage({ entries: [add(9, 4)] }).wrong.misconception).toBe(0)
  })
})

describe('the report card and the coverage judge a pattern alike', () => {
  it('keeps three different facts on the card when one fact repeats twenty times', async () => {
    const { buildPupilAnalysisDraft, validatePupilAnalysis } = await import('./pupilAnalysis.js')
    const { meetsPattern } = await import('./modelPattern.js')
    const table = (a, b, answer, i) => ({ source: 'practice', timestamp: 1_700_000_000_000 + i, ref: `r-${i}`, reference: { kind: 'observation', observationId: `o-${i}` },
      question: { domain: 'arithmetic', operation: 'multiplication', skill: 'multiplication', values: { a, b }, promptText: `${a} · ${b}` },
      answer: { status: 'incorrect', studentAnswer: answer, correctAnswer: a * b }, context: {}, interpretation: { category: 'knowledge', patterns: [] } })
    const raw = [...Array.from({ length: 20 }, (_, i) => table(6, 7, 36, i)), table(8, 8, 72, 20), table(5, 6, 25, 21)]
    const entries = addPredictableEvidence(raw)
    const evidence = { entries, snapshotRevision: 'r', period: {}, source: 'practice', coverage: {} }
    const report = validatePupilAnalysis(buildPupilAnalysisDraft(evidence), evidence)
    const card = report.hypotheses.find(item => item.signalCode === 'table_off_by_one')
    const byRef = new Map(entries.map(entry => [entry.ref, entry]))
    expect(meetsPattern('table_off_by_one', card.supportRefs.map(ref => byRef.get(ref)))).toBe(true)
    expect(errorCoverage({ entries: raw }).wrong.misconception).toBe(22)
  })
})

describe('repeated tasks in screening', () => {
  it('does not treat different screening questions without structure as one task', async () => {
    const { repeatedlyWrongTasks } = await import('./repeatedTasks.js')
    const q = (taskId, i) => ({ source: 'screening', ref: `s-${i}`, reference: { kind: 'screening_attempt', attemptId: `a-${i}` },
      question: { taskId, taskVersion: 1, promptSv: `Fråga ${taskId}` }, answer: { status: 'incorrect', studentAnswer: '1', correctAnswer: '2' },
      context: {}, interpretation: { category: 'unknown', patterns: [] } })
    expect(repeatedlyWrongTasks([q('t1', 1), q('t2', 2), q('t3', 3)])).toEqual([])
    expect(repeatedlyWrongTasks([q('t1', 1), q('t1', 2), q('t1', 3)])).toHaveLength(1)
  })
})
