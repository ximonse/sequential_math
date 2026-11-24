import { describe, expect, it } from 'vitest'
import { buildDiagnosticTeacherSupport } from './diagnosticTeacherSupport.js'

describe('teacher questions from diagnostic evidence', () => {
  it('does not offer support from a wrong answer alone', () => {
    expect(buildDiagnosticTeacherSupport({ observation: { answerStatus: 'incorrect' }, columnAlignment: { status: 'unknown' }, subtractionPattern: { status: 'no_match' } })).toEqual([])
  })
  it('uses observed differences and independently matched signals', () => {
    const result = buildDiagnosticTeacherSupport({ columnAlignment: { status: 'observed', alignment: 'misaligned' }, visibleResult: { status: 'observed', consistency: 'different', visibleResult: '376', explicitAnswer: '224' }, subtractionPattern: { status: 'matched' } })
    // M was a one-task copy of an error model and is no longer shown (2026-11-18, K7).
    expect(result.map(item => item.code)).toEqual(['P', 'Ö'])
    expect(result[1].reason).toContain('376')
    expect(result[1].reason).toContain('224')
  })
})
