import { questionFingerprint } from '../domains/predictableErrors/questionFingerprint.js'
import { evidenceProblem } from './evidenceProblem.js'

// Tasks a pupil answered wrongly at least three times, whatever the wrong
// answers were (Simon 2026-11-13: a fact that does not stick, such as 6 · 7
// wrong three times). A different signal from an error model: it says which
// task, not how the pupil thinks.
export const REPEATED_TASK_MINIMUM = 3

export function repeatedlyWrongTasks(entries, { minimum = REPEATED_TASK_MINIMUM } = {}) {
  const tasks = new Map()
  for (const entry of entries) {
    if (!['correct', 'incorrect'].includes(entry?.answer?.status)) continue
    // A screening question is its bank task; questions without structure would otherwise share one fingerprint.
    const q = entry.question ?? {}
    const key = q.taskId ? JSON.stringify(['task', q.taskId, q.taskVersion ?? null]) : questionFingerprint(evidenceProblem(entry))
    if (!tasks.has(key)) tasks.set(key, { key, wrong: [], correct: [] })
    tasks.get(key)[entry.answer.status === 'incorrect' ? 'wrong' : 'correct'].push(entry)
  }
  return [...tasks.values()].filter(task => task.wrong.length >= minimum)
    .sort((a, b) => b.wrong.length - a.wrong.length || a.key.localeCompare(b.key))
}
