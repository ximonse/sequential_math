import { describe, expect, it } from 'vitest'
import { screeningMisconceptionView, screeningPupilAnswers } from './screeningMisconceptions.js'
import { syntheticCoverageEntries } from './errorCoverageFixture.js'
import { MISCONCEPTIONS } from '../domains/predictableErrors/misconceptions.js'
import { WRONG_BUCKETS } from './errorCoverage.js'

// Step 4 in docs/STYRNING_FELFORSTAELSER.md. The view counts every wrong answer
// once, and a class shows exactly what its pupils show (rule R-E).
const strip = entries => entries.map(({ expectedModel: _model, expectedReason: _reason, ...entry }) => entry)
const fixture = strip(syntheticCoverageEntries())
// Three pupils sharing the fixture's answers, each judged on their own.
const pupils = [0, 1, 2].map(n => ({ studentId: `p${n}`,
  answers: screeningPupilAnswers(fixture.filter((_, index) => index % 3 === n)).map((answer, position) => ({ ...answer, position })) }))

describe('screening misconception view', () => {
  it('places every wrong answer in exactly one bucket and shows only approved misconceptions', () => {
    const view = screeningMisconceptionView(pupils)
    expect(view.counts.wrong).toBeGreaterThan(0)
    expect(WRONG_BUCKETS.reduce((sum, bucket) => sum + view.counts[bucket], 0)).toBe(view.counts.wrong)
    expect(view.cards.length).toBeGreaterThan(0)
    for (const card of view.cards) expect(MISCONCEPTIONS[card.id].status).toBe('approved')
    const listed = new Set([...view.cards.flatMap(card => card.answers), ...Object.entries(view.other)
      .filter(([key]) => key !== 'unanswered').flatMap(([, rows]) => rows)].map(row => row.key))
    expect(listed.size).toBe(view.counts.wrong)
  })

  it('shows a class as the sum of its pupils', () => {
    const view = screeningMisconceptionView(pupils)
    const one = pupils.map(pupil => screeningMisconceptionView([pupil]))
    for (const [key, value] of Object.entries(view.counts)) expect(one.reduce((sum, v) => sum + v.counts[key], 0), key).toBe(value)
    for (const card of view.cards) {
      expect(one.flatMap(v => v.cards.find(c => c.id === card.id)?.answers ?? []).map(row => row.key).sort())
        .toEqual(card.answers.map(row => row.key).sort())
    }
  })

  it('leaves out a wrong answer the teacher judged right, as the results table does', () => {
    const answer = pupils.flatMap(pupil => pupil.answers).find(a => a.status === 'incorrect')
    const before = screeningMisconceptionView([{ studentId: 'x', answers: [answer] }])
    const after = screeningMisconceptionView([{ studentId: 'x', answers: [{ ...answer, teacherStatus: 'correct' }] }])
    expect(before.counts.wrong).toBe(1)
    expect(after.counts).toMatchObject({ wrong: 0, teacherMarkedNotWrong: 1 })
  })
})
