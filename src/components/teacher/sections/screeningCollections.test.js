import { describe, expect, it } from 'vitest'
import { groupCollections, mergeOverviews, resultFilter } from './screeningCollections'

const item = (id, taskId) => ({ assignmentItemId: id, taskId })
const assignment = (assignmentId, classId, createdAt, titleSv = 'Växling', items = [item('a', 't1'), item('b', 't2')]) =>
  ({ assignmentId, classId, createdAt, titleSv, items })
const DAY = 24 * 3600 * 1000

describe('groupCollections', () => {
  it('joins one dispatch to two classes into one collection', () => {
    const list = groupCollections([assignment('x1', 'c1', 1000), assignment('x2', 'c2', 4000, 'Växling', [item('c', 't1'), item('d', 't2')])])
    expect(list).toHaveLength(1)
    expect(list[0].members.map(member => member.classId)).toEqual(['c1', 'c2'])
  })

  it('keeps different titles, questions, repeat classes and days apart', () => {
    const list = groupCollections([
      assignment('a1', 'c1', 1000),
      assignment('a2', 'c2', 2000, 'Annat namn'),
      assignment('a3', 'c3', 3000, 'Växling', [item('x', 't9')]),
      assignment('a4', 'c1', 5000),
      assignment('a5', 'c2', 1000 + DAY)
    ])
    expect(list).toHaveLength(5)
  })

  it('matches custom questions by their text', () => {
    const custom = (id, taskId) => ({ assignmentItemId: id, taskId, taskSnapshot: { promptSv: 'Förklara' } })
    const list = groupCollections([
      assignment('a1', 'c1', 1000, 'Skriv', [custom('a', 'custom-1')]),
      assignment('a2', 'c2', 2000, 'Skriv', [custom('b', 'custom-2')])
    ])
    expect(list).toHaveLength(1)
  })

  it('lists the newest collection first', () => {
    const list = groupCollections([assignment('old', 'c1', 1000, 'A'), assignment('new', 'c1', 9_000_000, 'B')])
    expect(list.map(entry => entry.titleSv)).toEqual(['B', 'A'])
  })
})

describe('resultFilter', () => {
  const allowed = resultFilter([
    { classId: 'c1', wholeClass: true, studentIds: [] },
    { classId: 'c2', wholeClass: false, studentIds: ['S2'] }
  ])

  it('allows whole classes and only picked pupils elsewhere', () => {
    expect(allowed('c1', 'ANY')).toBe(true)
    expect(allowed('c2', 's2')).toBe(true)
    expect(allowed('c2', 'S3')).toBe(false)
    expect(allowed('c9', 'S2')).toBe(false)
  })
})

describe('mergeOverviews', () => {
  const overview = (ids, studentIds) => ({
    items: ids.map((id, index) => ({ assignmentItemId: id, promptSv: `Q${index}` })),
    rows: studentIds.map(studentId => ({ studentId, status: 'submitted', items: ids.map(id => ({ assignmentItemId: id, attemptId: `${studentId}-${id}` })) }))
  })

  it('aligns columns by position and tags rows with their origin', () => {
    const merged = mergeOverviews([
      { classId: 'c1', assignmentId: 'x1', overview: overview(['a', 'b'], ['S1']) },
      { classId: 'c2', assignmentId: 'x2', overview: overview(['c', 'd'], ['S2']) }
    ])
    expect(merged.rows.map(row => [row.studentId, row.classId, row.assignmentId])).toEqual([['S1', 'c1', 'x1'], ['S2', 'c2', 'x2']])
    expect(merged.rows[1].items.map(cell => cell.assignmentItemId)).toEqual(['a', 'b'])
    expect(merged.rows[1].items[0]).toMatchObject({ classId: 'c2', assignmentId: 'x2', attemptId: 'S2-c' })
  })

  it('keeps only allowed pupils and reports classes with different questions', () => {
    const merged = mergeOverviews([
      { classId: 'c1', assignmentId: 'x1', overview: overview(['a', 'b'], ['S1', 'S9']) },
      { classId: 'c2', assignmentId: 'x2', overview: overview(['c'], ['S2']) }
    ], (classId, studentId) => studentId !== 'S9')
    expect(merged.rows.map(row => row.studentId)).toEqual(['S1'])
    expect(merged.mismatched).toEqual(['c2'])
  })

  it('returns null without any overview', () => {
    expect(mergeOverviews([])).toBeNull()
  })
})
