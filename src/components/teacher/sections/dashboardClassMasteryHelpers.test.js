import { describe, expect, it } from 'vitest'
import { buildClassMasteryAverages, buildClassMasteryExportRows, buildClassMasteryRows } from './dashboardClassMasteryHelpers'

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

  it('exports the same levels and averages as the panel, with unknown left empty', () => {
    const rows = buildClassMasteryRows([
      { studentId: 'A', name: 'Anna', className: '5A', teacherSummary: { effectiveLevels: { addition: 4, subtraction: 3 } } },
      { studentId: 'B', name: 'Bert', className: '5A', teacherSummary: { effectiveLevels: {} } }
    ])
    const exported = buildClassMasteryExportRows(rows, buildClassMasteryAverages(rows))

    expect(exported).toHaveLength(3)
    expect(exported[0]).toMatchObject({ Elev: 'Anna', addition: 4, subtraction: 3, multiplication: '', LägstaBelagda: 3, SnittBelagt: '3,5' })
    expect(exported[1]).toMatchObject({ Elev: 'Bert', addition: '', SnittBelagt: '', BelagdaOmråden: '0/9' })
    expect(exported[2]).toMatchObject({ Elev: 'Klassmedel', addition: '4,0', SnittBelagt: '3,5' })
  })
})
