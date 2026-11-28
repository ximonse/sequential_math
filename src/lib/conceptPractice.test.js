import { describe, expect, it } from 'vitest'
import { summarizeConceptProgress } from './conceptPractice.js'

describe('begreppsframsteg', () => {
  it('shows the latest practiced round across assignments and free practice without combining rounds', () => {
    const profile = { conceptPractice: [
      { deckId: 'operations', deckVersion: 1, assignmentId: '', cards: { addition: 1, sum: 2 }, answers: {} },
      { deckId: 'operations', deckVersion: 1, assignmentId: 'included', cards: { division: 3 },
        answers: { operations: { correct: false }, terms: { correct: true } } },
      { deckId: 'operations', deckVersion: 1, assignmentId: '', cards: {}, answers: {} },
      { deckId: 'geometry-lines', deckVersion: 1, assignmentId: '', cards: { line: 4, unknown: 5 }, answers: {} },
      { deckId: 'geometry-lines', deckVersion: 2, assignmentId: '', cards: { line: 6, ray: 7 }, answers: {} }
    ] }
    expect(summarizeConceptProgress(profile)).toEqual([
      { id: 'operations', label: 'Räknesättens språk', turned: 1, cardTotal: 12, answered: 2, exerciseTotal: 5, correct: 1 },
      { id: 'geometry-lines', label: 'Linje, stråle, sträcka och diagonal', turned: 1, cardTotal: 4, answered: 0, exerciseTotal: 8, correct: 0 }
    ])
    expect(summarizeConceptProgress({})).toHaveLength(2)
    expect(summarizeConceptProgress({})[0]).toMatchObject({ turned: 0, answered: 0, correct: 0 })
  })
})
