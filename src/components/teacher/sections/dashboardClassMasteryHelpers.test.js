import { describe, expect, it } from 'vitest'
import { buildClassMasteryAverages, buildClassMasteryRows } from './dashboardClassMasteryHelpers'

describe('class mastery meaning', () => {
  it('keeps unknown areas out of pupil averages and minimums', () => {
    const [row] = buildClassMasteryRows([{
      studentId: 'ELEV1',
      name: 'Elev',
      teacherSummary: { effectiveLevels: { addition: 4, subtraction: 0 } }
    }])

    expect(row.levels.addition).toBe(4)
    expect(row.levels.subtraction).toBeNull()
    expect(row.average).toBe(4)
    expect(row.lowest).toBe(4)
    expect(row.knownCount).toBe(1)
  })

  it('reports no level instead of zero when nothing is established', () => {
    const [row] = buildClassMasteryRows([{
      studentId: 'ELEV2',
      name: 'Okänd',
      teacherSummary: { effectiveLevels: {} }
    }])

    expect(row.average).toBeNull()
    expect(row.lowest).toBeNull()
    expect(row.knownCount).toBe(0)
  })

  it('calculates class averages from established values only', () => {
    const rows = buildClassMasteryRows([
      { studentId: 'E1', teacherSummary: { effectiveLevels: { addition: 4 } } },
      { studentId: 'E2', teacherSummary: { effectiveLevels: { addition: 2, subtraction: 6 } } },
      { studentId: 'E3', teacherSummary: { effectiveLevels: {} } }
    ])

    const averages = buildClassMasteryAverages(rows)
    expect(averages.addition).toBe(3)
    expect(averages.subtraction).toBe(6)
    expect(averages.multiplication).toBeNull()
    expect(averages._total).toBe(4)
  })
})
