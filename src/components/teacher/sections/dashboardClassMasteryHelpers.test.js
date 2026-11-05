import { describe, expect, it } from 'vitest'
import { buildClassMasteryAverages, buildClassMasteryExportRows, buildClassMasteryRows, nextClassMasterySort, sortClassMasteryRows } from './dashboardClassMasteryHelpers'

it('cycles name, lifetime practice, basic-operation mean and total attained levels, with unknowns last', () => {
  const levels = value => Object.fromEntries(['addition', 'subtraction', 'multiplication', 'division'].map(op => [op, value]))
  const rows = buildClassMasteryRows([
    { studentId: 'A', name: 'Anna', stats: { lifetimeProblems: 1000, totalProblems: 250 }, teacherSummary: { effectiveLevels: levels(2) } },
    { studentId: 'B', name: 'Bertil', stats: { lifetimeProblems: 30 }, teacherSummary: { effectiveLevels: levels(8) } },
    { studentId: 'C', name: 'Cecilia', stats: { lifetimeProblems: 40 }, teacherSummary: { effectiveLevels: { ...levels(6), number_bonds: 12, doubles: 12 } } },
    { studentId: 'D', name: 'Dani', teacherSummary: { effectiveLevels: {} } }
  ])
  const order = (key, direction = 'desc') => sortClassMasteryRows(rows, key, direction).map(row => row.studentId)
  expect(order('name', 'asc')).toEqual(['A', 'B', 'C', 'D'])
  expect(order('practiced')).toEqual(['A', 'C', 'B', 'D'])
  expect(order('average')).toEqual(['B', 'C', 'A', 'D'])
  expect(order('total')).toEqual(['C', 'B', 'A', 'D'])
  expect(rows[0].practiced).toBe(1000)
  expect(rows[3].average).toBeNull()
  expect(rows[3].total).toBeNull()
  expect(['name', 'practiced', 'average', 'total', 'multiplication'].map(key => nextClassMasterySort(key).key)).toEqual(['practiced', 'average', 'total', 'name', 'name'])
})

describe('class mastery meaning', () => {
  it('requires all four basic operations before showing their average', () => {
    const [row] = buildClassMasteryRows([{
      studentId: 'ELEV1',
      name: 'Elev',
      teacherSummary: { effectiveLevels: { addition: 4, subtraction: 0 } }
    }])

    expect(row.levels.addition).toBe(4)
    expect(row.levels.subtraction).toBeNull()
    expect(row.average).toBeNull()
    expect(row.lowest).toBe(4)
    expect(row.knownCount).toBe(1)
    expect(row.totalCount).toBe(4)
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

  it('ignores other domains and only averages pupils with all four basic operations', () => {
    const rows = buildClassMasteryRows([
      { studentId: 'E1', teacherSummary: { effectiveLevels: { addition: 4, subtraction: 6, multiplication: 8, division: 10, doubles: 12, number_bonds: 12 } } },
      { studentId: 'E2', teacherSummary: { effectiveLevels: { addition: 2, subtraction: 6, multiplication: 4, division: 4, algebra_evaluate: 12 } } },
      { studentId: 'E3', teacherSummary: { effectiveLevels: {} } }
    ])

    const averages = buildClassMasteryAverages(rows)
    expect(averages.addition).toBe(3)
    expect(averages.subtraction).toBe(6)
    expect(rows.map(row => row.average)).toEqual([7, 4, null])
    expect(averages._total).toBe(5.5)
  })

  it('exports the same four-operation averages as the panel, with incomplete evidence left empty', () => {
    const rows = buildClassMasteryRows([
      { studentId: 'A', name: 'Anna', displayAlias: 'Blå Bok Räv', className: '5A', teacherSummary: { effectiveLevels: { addition: 4, subtraction: 3, multiplication: 7, division: 6, doubles: 12 } } },
      { studentId: 'B', name: 'Bert', displayAlias: 'Grön Sol Uggla', className: '5A', teacherSummary: { effectiveLevels: { addition: 12, doubles: 12 } } }
    ])
    const exported = buildClassMasteryExportRows(rows, buildClassMasteryAverages(rows))

    expect(exported).toHaveLength(3)
    expect(exported[0]).toMatchObject({ Elev: 'Blå Bok Räv', addition: 4, subtraction: 3, multiplication: 7, LägstaBelagda: 3, '+*/ genomsnitt': '5,0', BelagdaGrundräknesätt: '4/4' })
    expect(exported[1]).toMatchObject({ Elev: 'Grön Sol Uggla', addition: 12, '+*/ genomsnitt': '', BelagdaGrundräknesätt: '1/4' })
    expect(exported[2]).toMatchObject({ Elev: 'Klassmedel', addition: '8,0', '+*/ genomsnitt': '5,0' })
  })
})
