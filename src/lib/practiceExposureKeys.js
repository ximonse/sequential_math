import { evidenceProblem } from './evidenceProblem.js'
import { questionFingerprint } from '../domains/predictableErrors/questionFingerprint.js'

// Exposure is a different question from counting assessed observations in a
// period. Any available collection can show that a task has already occurred,
// even when its timestamp is unknown or another collection is newer.
export function practiceExposureKeys(profile) {
  const keys = new Set()
  for (const name of ['problemLog', 'recentProblems']) {
    for (const row of Array.isArray(profile?.[name]) ? profile[name] : []) {
      if (row && typeof row === 'object') keys.add(questionFingerprint(evidenceProblem({ question: row })))
    }
  }
  return keys
}
