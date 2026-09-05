import { describe, expect, it } from 'vitest'
import { buildRiskSignals } from './dashboardAssignmentRiskHelpers'

function input(overrides = {}) {
  return {
    attempts: 10,
    lastActive: Date.now(),
    inactiveDays: 0,
    weekAttempts: 0,
    weekSuccessRate: 0,
    weekEvidenceStatus: 'complete',
    weekAssignment: { attempts: 0, rate: null },
    todayAttempts: 0,
    todaySuccessRate: 0,
    todayStruggle: null,
    ...overrides
  }
}

describe('good-enough teacher support signals', () => {
  it('does not infer performance from fewer than six answers', () => {
    const result = buildRiskSignals(input({
      weekAttempts: 5,
      weekSuccessRate: 0
    }))

    expect(result.riskLevel).toBe('low')
    expect(result.evidenceLabel).toContain('för lite för prestationssignal')
    expect(result.riskCodes).toEqual([])
  })

  it('prioritizes low accuracy only with enough evidence', () => {
    const result = buildRiskSignals(input({
      weekAttempts: 6,
      weekSuccessRate: 0.5
    }))

    expect(result.supportLabel).toBe('Prioritera')
    expect(result.riskCodes).toEqual(['Låg träff: 50% av 6 svar'])
    expect(result.nextAction).toContain('felsvar')
  })

  it('uses a follow-up signal for uncertain accuracy', () => {
    const result = buildRiskSignals(input({
      weekAttempts: 10,
      weekSuccessRate: 0.6
    }))

    expect(result.supportLabel).toBe('Följ upp')
    expect(result.riskCodes).toEqual(['Osäker träff: 60% av 10 svar'])
  })

  it('treats prolonged inactivity as an observable high-priority signal', () => {
    const result = buildRiskSignals(input({
      inactiveDays: 8,
      weekAttempts: 0
    }))

    expect(result.supportLabel).toBe('Prioritera')
    expect(result.riskCodes).toEqual(['Inaktiv minst 7 dagar'])
    expect(result.nextAction).toContain('komma igång')
  })

  it('makes incomplete history visible even when sample size is sufficient', () => {
    const result = buildRiskSignals(input({
      weekAttempts: 8,
      weekSuccessRate: 0.8,
      weekEvidenceStatus: 'limited'
    }))

    expect(result.riskLevel).toBe('low')
    expect(result.evidenceLabel).toContain('begränsad historik')
  })
})
