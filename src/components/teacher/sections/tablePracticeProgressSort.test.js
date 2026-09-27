import { describe, expect, it } from 'vitest'
import { TABLE_STUDENT_COLUMNS, sortTableStudents } from './tablePracticeProgressSort'

const row = (name, current, previousAccuracy, available = true) => ({
  studentId: name, name, available, historyComplete: true,
  current: { ...current, smallSample: current.attempts < 6 },
  previous: { accuracy: previousAccuracy }
})

const students = [
  row('Örjan', { attempts: 8, correct: 6, accuracy: .75, medianTimeSec: 5, factorsCovered: 7, completions: 2 }, .5),
  row('Anna', { attempts: 10, correct: 6, accuracy: .6, medianTimeSec: 3, factorsCovered: 8, completions: 1 }, .8),
  row('Bertil', { attempts: 0, correct: 0, accuracy: null, medianTimeSec: null, factorsCovered: 0, completions: 0 }, null),
  row('Cecilia', { attempts: 0, correct: 0, accuracy: null, medianTimeSec: null, factorsCovered: 0, completions: 0 }, null, false)
]

describe('table student column sorting', () => {
  it('defines a sort for every visible column', () => {
    expect(TABLE_STUDENT_COLUMNS.map(([key]) => key)).toEqual([
      'name', 'attempts', 'correct', 'accuracy', 'previous', 'median', 'factors', 'completions', 'evidence'
    ])
  })

  it('sorts raw values and keeps missing values last in either direction', () => {
    expect(sortTableStudents(students, 'attempts', 'desc').map(item => item.name)).toEqual(['Anna', 'Örjan', 'Bertil', 'Cecilia'])
    expect(sortTableStudents(students, 'accuracy', 'asc').map(item => item.name)).toEqual(['Anna', 'Örjan', 'Bertil', 'Cecilia'])
    expect(sortTableStudents(students, 'median', 'desc').map(item => item.name)).toEqual(['Örjan', 'Anna', 'Bertil', 'Cecilia'])
    expect(sortTableStudents(students, 'previous', 'asc').map(item => item.name)).toEqual(['Örjan', 'Anna', 'Bertil', 'Cecilia'])
  })

  it('sorts evidence and resolves equal values by Swedish name', () => {
    expect(sortTableStudents(students, 'evidence', 'asc').map(item => item.name)).toEqual(['Anna', 'Örjan', 'Bertil', 'Cecilia'])
    expect(sortTableStudents(students, 'correct', 'desc').map(item => item.name)).toEqual(['Anna', 'Örjan', 'Bertil', 'Cecilia'])
  })
})
