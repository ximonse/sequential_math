import { INPUT_SIGNAL_MODELS } from './practiceModes.js'

// A signal for the teacher, never a conclusion: the same explanation on at least
// two answers supports the suspicion; all correct answers speak against it.
export function followUpSignal(entries) {
  const answered = entries.filter(entry => ['correct', 'incorrect'].includes(entry.answer.status))
  const counts = new Map()
  for (const entry of answered) for (const id of new Set((entry.interpretation?.predictable?.matches ?? []).map(m => m.modelId))) {
    if (!INPUT_SIGNAL_MODELS.has(id)) counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  const [best, count] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? []
  if (best && count >= 2) return { kind: 'supports', modelId: best, count, total: answered.length }
  if (answered.length && answered.every(entry => entry.answer.status === 'correct')) return { kind: 'against', total: answered.length }
  return { kind: 'unclear', total: answered.length }
}
