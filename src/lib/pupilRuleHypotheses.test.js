import { describe, expect, it, vi } from 'vitest'
import { evidencePage, practiceEvidence, evidenceHash } from '../../api/_pupilEvidence.js'
import { buildPupilAnalysisDraft, validatePupilAnalysis } from './pupilAnalysis.js'

function source() {
  const base = { timestamp: 10, domain: 'fractions', operation: 'fractions', skill: 'fractions',
    contentSkill: 'fractions', contentLevel: 7, values: { text: '2/5 + 1/3' }, promptText: '2/5 + 1/3',
    correctAnswer: '11/15', correct: false, studentAnswer: '3/8', errorPatterns: ['wrong_denominator'] }
  const profile = { masteryFacts: { retained: true }, problemLog: [
    { ...base, observationId: 'WRONG-1' }, { ...base, timestamp: 20, observationId: 'WRONG-2',
      values: { text: '3/7 + 1/2' }, promptText: '3/7 + 1/2', correctAnswer: '13/14', studentAnswer: '4/9' },
    { ...base, timestamp: 30, observationId: 'RIGHT', correct: true, studentAnswer: '11/15', errorPatterns: [] },
    { ...base, timestamp: 40, observationId: 'RIGHT-OTHER-LEVEL', correct: true, studentAnswer: '11/15', contentLevel: 5, errorPatterns: [] },
  ] }
  return { profile, evidence: evidencePage({ studentId: 'SYNTHETIC', classId: 'CLASS', period: { from: '2026-10-30', to: '2026-10-30', startInclusive: 1, endExclusive: 100 },
    source: 'practice', practice: practiceEvidence(profile), screening: { entries: [], coverage: {} }, query: {} }) }
}

describe('rule candidates through the actual evidence and report path', () => {
  it('creates a traceable rule report and follow-up question without an AI/network call or pupil writes', () => {
    const fetch = vi.fn(() => { throw Error('No AI or network permitted') }); vi.stubGlobal('fetch', fetch)
    try {
      const { profile, evidence } = source(), before = JSON.stringify(profile)
      const draft = buildPupilAnalysisDraft(evidence), report = validatePupilAnalysis(draft, evidence)
      const hypothesis = report.hypotheses.find(h => h.signalCode === 'fraction_components_separately')
      expect(hypothesis).toMatchObject({ basis: 'rule_candidate', supportCount: 2, counterCount: 1, evidenceStatus: 'requires_teacher_review' })
      expect(hypothesis.nextCheckSv).toContain('inte utdelat')
      expect(evidence.entries.find(e => e.reference.observationId === 'RIGHT').ref).toBe(hypothesis.counterRefs[0])
      expect(report.provenance.kind).toBe('rule')
      expect(profile.masteryFacts).toEqual({ retained: true })
      expect(JSON.stringify(profile)).toBe(before)
      expect(evidence.entries[0].interpretation.patterns).toEqual(['wrong_denominator'])
      expect(fetch).not.toHaveBeenCalled()
    } finally { vi.unstubAllGlobals() }
  })
  it('rejects invented model attribution and non-comparable counterexamples', () => {
    const { evidence } = source(), draft = buildPupilAnalysisDraft(evidence)
    draft.hypotheses[0].signalCode = 'invented_model'
    expect(() => validatePupilAnalysis(draft, evidence)).toThrow(/Regelkandidaten/u)
    const next = buildPupilAnalysisDraft(evidence)
    next.hypotheses[0].counterRefs = [evidence.entries.find(e => e.reference.observationId === 'RIGHT-OTHER-LEVEL').ref]
    expect(() => validatePupilAnalysis(next, evidence)).toThrow(/Regelkandidaten/u)
  })
  it('versions derived models without invalidating unchanged source references', () => {
    const { profile, evidence } = source(), result = evidence.entries[0].interpretation.predictable
    expect(result).not.toHaveProperty('predictions')
    expect(result).toMatchObject({ ruleVersion: 'predictable-errors-v3', status: 'matched', nextProbe: { requiresTeacherReview: true } })
    const { evidence: same } = source()
    expect(same.snapshotRevision).toBe(evidence.snapshotRevision)
    expect(same.entries[0].ref).toBe(evidence.entries[0].ref)
    const stale = buildPupilAnalysisDraft(evidence); stale.snapshotRevision = 'older'
    expect(() => validatePupilAnalysis(stale, same)).toThrow(/källrevision/u)
    const practice = practiceEvidence(profile), screening = { entries: [], coverage: {} }
    const expected = evidenceHash({ studentId: 'SYNTHETIC', classId: 'CLASS', period: evidence.period,
      source: 'practice', all: practice.entries, coverage: { practice: practice.coverage, screening: screening.coverage } })
    expect(evidence.snapshotRevision).toBe(expected)
    const oldRule = buildPupilAnalysisDraft(evidence); oldRule.hypotheses[0].ruleVersion = 'obsolete-rule'
    expect(() => validatePupilAnalysis(oldRule, same)).toThrow(/Regelkandidaten/u)
  })
})
