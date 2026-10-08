import { describe, expect, it } from 'vitest'
import { buildDiagnosticTeacherSupport } from './diagnosticTeacherSupport.js'

describe('teacher questions from diagnostic evidence', () => {
  it('does not offer support from a wrong answer alone', () => {
    expect(buildDiagnosticTeacherSupport({ observation: { answerStatus: 'incorrect' }, columnAlignment: { status: 'unknown' }, subtractionPattern: { status: 'no_match' } })).toEqual([])
  })
  it('uses observed differences and independently matched signals', () => {
    const result = buildDiagnosticTeacherSupport({ columnAlignment: { status: 'observed', alignment: 'misaligned' }, visibleResult: { status: 'observed', consistency: 'different', visibleResult: '376', explicitAnswer: '224' }, subtractionPattern: { status: 'matched' } })
    expect(result.map(item => item.code)).toEqual(['P', 'Ö', 'M'])
    expect(result[1].reason).toContain('376')
    expect(result[1].reason).toContain('224')
  })
})
