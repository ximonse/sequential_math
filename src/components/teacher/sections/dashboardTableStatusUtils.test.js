import { describe, expect, it } from 'vitest'
import {
  computeStickyTableCompletionMapForTeacher,
  computeStickyTableProgressForTeacher
} from './dashboardTableStatusUtils'

describe('table sticky status', () => {
  it('keeps mixed-practice table attempts visible before the completion threshold', () => {
    const start = Date.now() - 60_000
    const source = [
      { timestamp: Date.now() - 30_000, problemType: 'mul_1d_1d_easy', values: { a: 6, b: 4 }, correct: true },
      { timestamp: Date.now() - 20_000, problemType: 'mul_1d_1d_easy', values: { a: 6, b: 7 }, correct: false },
      { timestamp: Date.now() - 10_000, problemType: 'mul_1d_1d_easy', values: { a: 6, b: 8 }, correct: true }
    ]

    const progress = computeStickyTableProgressForTeacher(source, start)
    const complete = computeStickyTableCompletionMapForTeacher(source, start)

    expect(progress[6]).toMatchObject({ attempts: 3, correct: 2, reached: false })
    expect(complete[6]).toBe(false)
  })

  it('marks a mixed-practice table as reached at ten attempts and 80 percent correct', () => {
    const start = Date.now() - 60_000
    const source = Array.from({ length: 10 }, (_, index) => ({
      timestamp: Date.now() - (50_000 - index * 1_000),
      problemType: 'mul_1d_1d_easy',
      values: { a: 7, b: (index % 9) + 1 },
      correct: index < 8
    }))

    expect(computeStickyTableProgressForTeacher(source, start)[7]).toMatchObject({
      attempts: 10,
      correct: 8,
      reached: true
    })
  })
})
