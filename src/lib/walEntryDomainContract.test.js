import { describe, it, expect } from 'vitest'
import { listDomains } from '../domains/registry'
import { createStudentProfile, addProblemResult } from './studentProfile'
import { createWalEntry } from './syncWal'
import { validEntry } from '../../api/student/[studentId]/events.js'

// Every domain must produce events the server accepts. A single rejected entry
// fails the whole batch, so one broken event type blocks the pupil's other
// results from syncing too.
const STUDENT_ID = 'ABC123'

function generatedCases() {
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

// A pupil answers repeatedly, which is what triggers mastery, adaptation and
// current-need events on top of the plain results.
function runSession(domain, skillId, level, { answerCorrectly }) {
  const profile = createStudentProfile(STUDENT_ID, 'Testelev', 6)
  const entries = []
  for (let attempt = 0; attempt < 12; attempt++) {
    const problem = domain.generate(skillId, level, {})
    const correct = String(problem?.answer?.correct ?? problem?.result ?? '1')
    const answer = answerCorrectly ? correct : `${correct}0000`
    const { walEntries } = addProblemResult(profile, problem, answer, 5, {})
    for (const walEntry of walEntries) {
      entries.push(createWalEntry(walEntry.type, STUDENT_ID, walEntry.payload))
    }
  }
  return entries
}

describe('WAL-entries per domän', () => {
  it.each(generatedCases())('$name: alla händelser är giltiga när eleven svarar rätt', ({ domain, skill, level }) => {
    const entries = runSession(domain, skill.id, level, { answerCorrectly: true })
    expect(entries.length).toBeGreaterThan(0)
    const invalid = entries.filter(entry => !validEntry(entry, STUDENT_ID))
    expect(invalid.map(entry => entry.type)).toEqual([])
  })

  it.each(generatedCases())('$name: alla händelser är giltiga när eleven svarar fel', ({ domain, skill, level }) => {
    const entries = runSession(domain, skill.id, level, { answerCorrectly: false })
    expect(entries.length).toBeGreaterThan(0)
    const invalid = entries.filter(entry => !validEntry(entry, STUDENT_ID))
    expect(invalid.map(entry => entry.type)).toEqual([])
  })
})
