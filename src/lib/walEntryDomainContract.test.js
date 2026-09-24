import { describe, it, expect } from 'vitest'
import { listDomains } from '../domains/registry'
import { createStudentProfile, addProblemResult } from './studentProfile'
import { createWalEntry } from './syncWal'
import { validEntry } from '../../api/student/[studentId]/events.js'

// Every domain must produce problem_result events the server accepts. A single
// rejected entry fails the whole batch, so one broken domain blocks the pupil's
// other results from syncing too.
const STUDENT_ID = 'ABC123'

function generatedProblems() {
  const cases = []
  for (const domain of listDomains()) {
    for (const skill of domain.skills) {
      for (const level of [1, 6, 12]) {
        cases.push({ name: `${domain.id}/${skill.id} nivå ${level}`, domain, skill, level })
      }
    }
  }
  return cases
}

describe('WAL-entries per domän', () => {
  it.each(generatedProblems())('$name ger en giltig problem_result-entry', ({ domain, skill, level }) => {
    const problem = domain.generate(skill.id, level, {})
    const profile = createStudentProfile(STUDENT_ID, 'Testelev', 6)
    const { walEntries } = addProblemResult(profile, problem, '1', 5, {})
    const problemResult = walEntries.find(entry => entry.type === 'problem_result')
    expect(problemResult).toBeTruthy()

    const entry = createWalEntry('problem_result', STUDENT_ID, problemResult.payload)
    expect(validEntry(entry, STUDENT_ID)).toBe(true)
  })
})
