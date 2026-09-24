import { describe, it, expect } from 'vitest'
import { listDomains } from '../domains/registry'
import { createStudentProfile, addProblemResult } from './studentProfile'
import { adjustDifficulty } from './difficultyAdapter'
import { validEntry } from '../../api/student/[studentId]/events.js'

// The pilot runtime sends a profile checkpoint alongside the results. The
// server rejects the whole batch when the checkpoint is malformed, so the
// checkpoint has to survive a long session in every domain.
const STUDENT_ID = 'ABC123'
const CHECKPOINT_FIELDS = ['currentDifficulty', 'highestDifficulty', 'adaptive', 'operationAbilities', 'assignmentProgress', 'stats', 'telemetry', 'activity']

function checkpointEntry(profile) {
  const capturedAt = Date.now()
  const payload = { capturedAt }
  for (const field of CHECKPOINT_FIELDS) {
    if (profile?.[field] !== undefined) payload[field] = structuredClone(profile[field])
  }
  return { id: 'checkpoint_1', type: 'profile_checkpoint', studentId: STUDENT_ID, timestamp: capturedAt, payload }
}

function domainCases() {
  return listDomains().flatMap(domain => domain.skills.map(skill => ({ name: `${domain.id}/${skill.id}`, domain, skill })))
}

describe('profile_checkpoint efter en session', () => {
  it.each(domainCases())('$name håller kontraktet när eleven svarar rätt hela vägen', ({ domain, skill }) => {
    const profile = createStudentProfile(STUDENT_ID, 'Testelev', 6)
    for (let attempt = 0; attempt < 30; attempt++) {
      const level = Math.min(12, Math.max(1, Math.round(profile.currentDifficulty || 1)))
      const problem = domain.generate(skill.id, level, {})
      const correct = String(problem?.answer?.correct ?? problem?.result ?? '1')
      addProblemResult(profile, problem, correct, 3, {})
      adjustDifficulty(profile, true)
    }
    expect(validEntry(checkpointEntry(profile), STUDENT_ID)).toBe(true)
    expect(profile.currentDifficulty).toBeGreaterThanOrEqual(1)
    expect(profile.currentDifficulty).toBeLessThanOrEqual(12)
  })
})
