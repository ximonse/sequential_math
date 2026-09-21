import { describe, expect, it } from 'vitest'
import { buildTrainingPriorityList } from './dashboardStudentTrainingHelpers'

describe('teacher training priorities', () => {
  it('uses attained level and current need instead of legacy ability as its horizon', () => {
    const priorities = buildTrainingPriorityList({
      recentProblems: [],
      problemLog: [],
      teacherSummary: { effectiveLevels: { addition: 2 } },
      adaptive: {
        operationAbilities: { addition: 12 },
        currentNeeds: {
          addition: { purpose: 'recover', targetLevel: 2 }
        }
      }
    }, {})

    const additionLevels = priorities
      .filter(item => item.operation === 'addition')
      .map(item => item.level)

    expect(additionLevels).toEqual([3])
    expect(additionLevels).not.toContain(12)
  })
})
