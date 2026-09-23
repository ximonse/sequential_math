import { describe, expect, it } from 'vitest'
import { buildQuickAssignmentPreset, buildRiskSignals } from './dashboardAssignmentRiskHelpers'

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

  it('keeps prolonged inactivity separate from support priority', () => {
    const result = buildRiskSignals(input({
      inactiveDays: 8,
      weekAttempts: 0
    }))

    expect(result.inactive).toBe(true)
    expect(result.inactivityReason).toBe('Inaktiv minst 7 dagar')
    expect(result.supportLabel).toBe('Ingen signal')
    expect(result.supportScore).toBe(0)
    expect(result.riskCodes).toEqual([])
    expect(result.nextAction).toContain('komma igång')
  })

  it('marks a pupil who has not started as inactive without implying a learning difficulty', () => {
    const result = buildRiskSignals(input({ attempts: 0, lastActive: null }))

    expect(result.inactive).toBe(true)
    expect(result.inactivityReason).toBe('Inte kommit igång')
    expect(result.riskLevel).toBe('low')
  })

  it('preserves a separate support signal when an inactive pupil has sufficient error evidence', () => {
    const result = buildRiskSignals(input({ inactiveDays: 8, weekAttempts: 6, weekSuccessRate: 0.5 }))

    expect(result.inactive).toBe(true)
    expect(result.supportLabel).toBe('Prioritera')
    expect(result.riskCodes).toEqual(['Låg träff: 50% av 6 svar'])
    expect(result.nextAction).toContain('felsvar')
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

  it('builds a quick assignment from current need instead of legacy ability', () => {
    const preset = buildQuickAssignmentPreset({
      name: 'Elev',
      weekStruggle: null,
      todayStruggle: null,
      primaryOperation: 'addition',
      currentNeeds: { addition: { purpose: 'recover', targetLevel: 3 } },
      attainmentLevels: { addition: 5 },
      operationAbilities: { addition: 12 },
      currentDifficulty: 11
    }, 'focus')

    expect(preset.minLevel).toBe(2)
    expect(preset.maxLevel).toBe(4)
  })

  it('uses the next level after attainment when no current need exists', () => {
    const preset = buildQuickAssignmentPreset({
      name: 'Elev',
      weekStruggle: null,
      todayStruggle: null,
      primaryOperation: 'addition',
      currentNeeds: {},
      attainmentLevels: { addition: 5 },
      operationAbilities: { addition: 12 },
      currentDifficulty: 11
    }, 'focus')

    expect(preset.minLevel).toBe(5)
    expect(preset.maxLevel).toBe(7)
  })
})
