import { describe, expect, it } from 'vitest'
import { analysisCounts, buildPupilAnalysisDraft, validateAnalysisCheckIn, validatePupilAnalysis } from './pupilAnalysis.js'

const entry = (ref, status, patterns = []) => ({ ref, source: 'practice', timestamp: 1000,
  reference: { observationId: ref }, question: { operation: 'subtraction', promptText: '402 − 178' },
  answer: { status, studentAnswer: status === 'correct' ? 224 : 376, correctAnswer: 224 },
  context: {}, interpretation: { category: 'unknown', patterns } })
const evidence = () => ({ snapshotRevision: 'SNAPSHOT', source: 'practice', period: { from: '2026-10-19', to: '2026-10-25' },
  coverage: { practice: { completeness: 'unknown' } }, entries: [entry('WRONG', 'incorrect', ['borrow']), entry('RIGHT', 'correct'), entry('OTHER', 'incorrect', ['borrow'])] })

describe('pupil analysis reports', () => {
  it('separates sources, counted facts and hypotheses without automatically treating right answers as counterexamples', () => {
    const source = evidence()
    const report = validatePupilAnalysis(buildPupilAnalysisDraft(source), source)
    expect(report.counts).toMatchObject({ total: 3, correct: 1, incorrect: 2 })
    expect(report.strengths[0].refs).toEqual(['RIGHT'])
    expect(report.hypotheses[0]).toMatchObject({ supportRefs: ['WRONG', 'OTHER'], counterRefs: [], supportCount: 2,
      basis: 'existing_signal', evidenceStatus: 'requires_teacher_review' })
    expect(report.coverage.practice.completeness).toBe('unknown')
    expect(report.provenance.kind).toBe('rule')
    expect(source.entries[0].answer.studentAnswer).toBe(376)
  })
  it('keeps one sample, conflicting identities and missing signals inconclusive', () => {
    const source = evidence()
    source.entries[2].reference.observationId = 'WRONG'
    expect(validatePupilAnalysis(buildPupilAnalysisDraft(source), source).hypotheses[0].evidenceStatus).toBe('insufficient')
    source.entries = [entry('UNKNOWN', 'unknown')]
    const report = validatePupilAnalysis(buildPupilAnalysisDraft(source), source)
    expect(report.hypotheses).toEqual([])
    expect(report.exampleRefs).toEqual(['UNKNOWN'])
    expect(report.evidence).toHaveLength(1)
    expect(report.counts.unknown).toBe(1)
    expect(analysisCounts([entry('PARTIAL', 'partial'), entry('TEXT', 'unassessed')])).toMatchObject({ partial: 1, unassessed: 1 })
  })
  it('accepts explicitly AI-authored hypotheses with real support and counterexamples and rejects invented refs or quantities', () => {
    const source = evidence(), draft = buildPupilAnalysisDraft(source)
    draft.provenance = { kind: 'ai', instructionVersion: 'pupil-analysis-v1', model: 'synthetic-test' }
    draft.hypotheses[0].basis = 'ai_interpretation'
    draft.hypotheses[0].counterRefs = ['RIGHT']
    expect(validatePupilAnalysis(draft, source).hypotheses[0].counterCount).toBe(1)
    draft.counts = { total: 100 }
    expect(() => validatePupilAnalysis(draft, source)).toThrow(/okända/u)
    delete draft.counts
    draft.hypotheses[0].supportRefs = ['INVENTED']
    expect(() => validatePupilAnalysis(draft, source)).toThrow(/referens/u)
  })
  it('rejects mismatched snapshots, unsupported signals, duplicate refs and false strength references', () => {
    for (const mutate of [d => d.snapshotRevision = 'WRONG', d => d.hypotheses[0].supportRefs.push('WRONG'),
      d => d.hypotheses[0].signalCode = 'not-observed', d => d.strengths[0].refs = ['WRONG'],
      d => d.hypotheses[0].counterRefs = ['WRONG'], d => d.hypotheses[0].alternativesSv = []]) {
      const source = evidence(), draft = buildPupilAnalysisDraft(source)
      mutate(draft)
      expect(() => validatePupilAnalysis(draft, source)).toThrow()
    }
  })
  it('records teacher revisions separately, requires revised wording, and never changes the original hypothesis', () => {
    const source = evidence(), report = validatePupilAnalysis(buildPupilAnalysisDraft(source), source)
    const before = structuredClone(report)
    const input = { goalSv: 'Pröva växling med och utan nolla', noteSv: '', decisions: [
      { hypothesisId: report.hypotheses[0].id, decision: 'revised', interpretationSv: '' }] }
    expect(() => validateAnalysisCheckIn(input, report)).toThrow(/ändrade/u)
    input.decisions[0].interpretationSv = 'Undersök först om problemet bara uppträder vid nollor.'
    expect(validateAnalysisCheckIn(input, report).decisions[0].decision).toBe('revised')
    expect(report).toEqual(before)
    input.decisions.push(input.decisions[0])
    expect(() => validateAnalysisCheckIn(input, report)).toThrow()
  })
})
