import { describe, expect, it } from 'vitest'
import { repairLegacyTableMasteryFacts } from './tableDrillEvidence'

function profile(facts, completions) {
  return {
    masteryFacts: { version: 1, facts, revokedIds: [] },
    tableDrill: { completions }
  }
}

describe('table drill evidence repair', () => {
  it('revokes only a fact that exactly matches the legacy table completion shape', () => {
    const p = profile([
      {
        id: 'multiplication:7:1000',
        operation: 'multiplication',
        level: 7,
        achievedAt: 1000,
        window: { attempts: 1, correct: 1, rate: 1 }
      },
      {
        id: 'multiplication:7:2000',
        operation: 'multiplication',
        level: 7,
        achievedAt: 2000,
        window: { attempts: 5, correct: 5, rate: 1 }
      }
    ], [{ table: 7, timestamp: 1001 }])

    expect(repairLegacyTableMasteryFacts(p)).toBe(1)
    expect(p.masteryFacts.revokedIds).toEqual(['multiplication:7:1000'])
    expect(repairLegacyTableMasteryFacts(p)).toBe(0)
  })

  it('keeps facts without a matching table completion', () => {
    const p = profile([{
      id: 'multiplication:8:1000',
      operation: 'multiplication',
      level: 8,
      achievedAt: 1000,
      window: { attempts: 1, correct: 1, rate: 1 }
    }], [{ table: 7, timestamp: 1000 }])

    expect(repairLegacyTableMasteryFacts(p)).toBe(0)
    expect(p.masteryFacts.revokedIds).toEqual([])
  })
})

