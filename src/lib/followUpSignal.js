import { INPUT_SIGNAL_MODELS } from './practiceModes.js'

// Without a frozen investigation plan, matches are observations only. Preserve
// every rival rather than selecting one explanation or claiming independence.
export function followUpSignal(entries) {
  const answered = entries.filter(entry => ['correct', 'incorrect'].includes(entry.answer.status))
  const counts = new Map()
  for (const entry of answered) for (const id of new Set((entry.interpretation?.predictable?.matches ?? []).map(m => m.modelId))) {
    if (!INPUT_SIGNAL_MODELS.has(id)) counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  return { kind: 'observations', total: answered.length,
    correct: answered.filter(entry => entry.answer.status === 'correct').length,
    models: [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([modelId, count]) => ({ modelId, count })) }
}
