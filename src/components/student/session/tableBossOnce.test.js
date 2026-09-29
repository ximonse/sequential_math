import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  markAllTablesBossShown,
  markDailyBossShown,
  recordTableCompletion,
  shouldTriggerAllTablesBoss,
  shouldTriggerDailyBoss
} from './sessionUtils'

const TWO_TO_NINE = [2, 3, 4, 5, 6, 7, 8, 9]

function stubStorage() {
  const store = new Map()
  vi.stubGlobal('localStorage', {
    getItem: key => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value))
  })
}

function completeTables(profile, tables) {
  tables.forEach(table => recordTableCompletion(profile, table))
}

describe('table boss videos are shown once per day', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('does not repeat the 2-9 video for 10 and 11', () => {
    stubStorage()
    const profile = { studentId: 'S1', tableDrill: { completions: [] } }
    completeTables(profile, TWO_TO_NINE)
    expect(shouldTriggerDailyBoss(profile, TWO_TO_NINE)).toBe(true)
    markDailyBossShown(profile)
    completeTables(profile, [10])
    expect(shouldTriggerDailyBoss(profile, TWO_TO_NINE)).toBe(false)
    completeTables(profile, [11])
    expect(shouldTriggerDailyBoss(profile, TWO_TO_NINE)).toBe(false)
  })

  it('still holds when a sync overwrite wipes the profile flag', () => {
    stubStorage()
    const profile = { studentId: 'S1', tableDrill: { completions: [] } }
    completeTables(profile, TWO_TO_NINE)
    markDailyBossShown(profile)
    delete profile.tableDrill.dailyBossShownDate
    completeTables(profile, [10, 11])
    expect(shouldTriggerDailyBoss(profile, TWO_TO_NINE)).toBe(false)
  })

  it('shows the all-tables video once, and nothing after further tables', () => {
    stubStorage()
    const profile = { studentId: 'S1', tableDrill: { completions: [] } }
    completeTables(profile, [...TWO_TO_NINE, 10, 11, 12])
    expect(shouldTriggerAllTablesBoss(profile)).toBe(true)
    markAllTablesBossShown(profile)
    delete profile.tableDrill.dailyAllTablesBossShownDate
    completeTables(profile, [5, 12])
    expect(shouldTriggerAllTablesBoss(profile)).toBe(false)
  })
})
