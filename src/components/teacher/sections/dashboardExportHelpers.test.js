import { describe, expect, it } from 'vitest'
import { buildSnapshotCsvRows } from './dashboardExportHelpers'

const baseRow = {
  name: 'Test', studentId: 'TEST01', className: '4A', classNameLabel: '4A',
  lastActive: null, todayEngagedMinutes: 0, weekEngagedMinutes: 0,
  todayPresenceInteractions: 0, weekPresenceInteractions: 0,
  supportLabel: 'Ingen signal', riskCodes: [], evidenceLabel: '', nextAction: '',
  todayAttempts: 300, todayCorrectCount: 150, todayWrongCount: 150,
  todayKnowledgeWrongCount: 150, todayInattentionCount: 0, todaySuccessRate: 0.5,
  todayDetailedAttempts: 250, todayAssignmentAdherenceRate: null, todayStruggle: null,
  weekAttempts: 0, weekCorrectCount: 0, weekWrongCount: 0,
  weekKnowledgeWrongCount: 0, weekInattentionCount: 0, weekSuccessRate: 0,
  weekDetailedAttempts: 0, weekAssignmentAdherenceRate: null, weekStruggle: null
}

describe('dashboard CSV evidence', () => {
  it('discloses a capped detail sample without downgrading complete period totals', () => {
    const [row] = buildSnapshotCsvRows([baseRow], 'daily', 20)

    expect(row.DagensMängd).toBe(300)
    expect(row.DagensTraff).toBe('50%')
    expect(row.DagensDetaljurval).toBe('250/300 senaste sparade svar')
  })

  it('labels an empty period without inventing a percentage', () => {
    const [row] = buildSnapshotCsvRows([baseRow], 'weekly', 20)

    expect(row.VeckansTraff).toBe('-')
    expect(row.VeckansDetaljurval).toBe('fullständig periodhistorik')
  })
})
