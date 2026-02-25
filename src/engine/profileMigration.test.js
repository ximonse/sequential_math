import { describe, expect, it } from 'vitest'
import { migrateProfileOnLoad } from './profileMigration'

describe('profileMigration', () => {
  it('adds domain/skill/level to legacy problem entries', () => {
    const profile = {
      studentId: 'ELEV1',
      recentProblems: [
        {
          problemId: 'p1',
          problemType: 'add_1d_1d_no_carry',
          difficulty: { conceptual_level: 3 }
        }
      ],
      problemLog: [
        {
          problemId: 'p2',
          problemType: 'sub_2d_2d_no_borrow',
          difficulty: { conceptual_level: 5 }
        }
      ]
    }

    const migrated = migrateProfileOnLoad(profile)
    expect(migrated).not.toBe(profile)
    expect(migrated.recentProblems[0].domain).toBe('arithmetic')
    expect(migrated.recentProblems[0].skill).toBe('addition')
    expect(migrated.recentProblems[0].level).toBe(3)
    expect(migrated.problemLog[0].domain).toBe('arithmetic')
    expect(migrated.problemLog[0].skill).toBe('subtraction')
    expect(migrated.problemLog[0].level).toBe(5)
  })

  it('returns same profile when all entries are already migrated', () => {
    const profile = {
      studentId: 'ELEV2',
      recentProblems: [
        {
          problemId: 'ok1',
          domain: 'arithmetic',
          skill: 'multiplication',
          level: 6,
          difficulty: { conceptual_level: 6 }
        }
      ],
      problemLog: [
        {
          problemId: 'ok2',
          domain: 'arithmetic',
          skill: 'division',
          level: 4,
          difficulty: { conceptual_level: 4 }
        }
      ]
    }

    const migrated = migrateProfileOnLoad(profile)
    expect(migrated).toBe(profile)
  })
})
