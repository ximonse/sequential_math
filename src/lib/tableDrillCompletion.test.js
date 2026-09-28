import { describe, expect, it } from 'vitest'
import { mergeTableDrill } from '../../api/student/_profileMergeEntries.js'
import { recordTableCompletion } from '../components/student/session/sessionUtils.js'
import { completedTablesEver, tableCompletionStatus } from './tableDrillCompletion.js'

describe('saved full-table completion evidence', () => {
  it('keeps a positive historical fact when old completion entries are trimmed or merged', () => {
    const profile = { tableDrill: { completions: Array.from({ length: 1000 }, (_, index) => ({ table: 2, timestamp: index + 1 })) } }
    recordTableCompletion(profile, 7)
    expect(profile.tableDrill.completions).toHaveLength(1000)
    expect(completedTablesEver(profile.tableDrill)).toEqual([2, 7])
    const merged = mergeTableDrill(profile.tableDrill, { completions: [], completedTablesEver: [3] })
    expect(merged.completedTablesEver).toEqual([2, 3, 7])
    expect(completedTablesEver({ completedTablesEver: [2, 3], completions: [] })).toEqual([2, 3])
  })

  it('uses Stockholm dates for today and the last seven days without calling missing history never completed', () => {
    const now = Date.parse('2026-03-30T12:00:00Z')
    const tableDrill = { completions: [
      { table: 7, timestamp: Date.parse('2026-03-24T12:00:00Z') },
      { table: 8, timestamp: Date.parse('2026-03-30T07:00:00Z') },
      { table: 9, timestamp: Date.parse('2026-03-20T12:00:00Z') }
    ] }
    expect(tableCompletionStatus(tableDrill, 7, now)).toEqual({ knownEver: true, weekCompleted: true, todayCompleted: false })
    expect(tableCompletionStatus(tableDrill, 8, now)).toEqual({ knownEver: true, weekCompleted: true, todayCompleted: true })
    expect(tableCompletionStatus(tableDrill, 9, now)).toEqual({ knownEver: true, weekCompleted: false, todayCompleted: false })
    expect(tableCompletionStatus({}, 4, now)).toEqual({ knownEver: false, weekCompleted: false, todayCompleted: false })
  })
})
