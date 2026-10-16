import { attentionCompletionLabel, isCurrentFocusResult } from '../../../lib/attentionHistory'
import { median } from '../../../lib/attentionEndurance'

export function focusResponseSignal(passes) {
  const current = passes.filter(isCurrentFocusResult), full = current.filter(pass => !pass.aborted)
  const days = new Map()
  // One representative pass per day: the latest with at least four hits.
  // This is a median within a pass, never a reconstructed pooled median.
  for (const pass of full) {
    const key = new Date(pass.finishedAt).toLocaleDateString('sv-SE', { timeZone: 'Europe/Stockholm' })
    if (pass.summary.hits >= 4 && !days.has(key)) days.set(key, { key, total: pass.summary.hits, rate: pass.summary.median })
  }
  const daily = [...days.values()].sort((a, b) => a.key.localeCompare(b.key))
  const total = daily.reduce((sum, day) => sum + day.total, 0)
  let color = 'white', label = 'Samlar underlag', mark = '…'
  if (daily.length >= 3 && total >= 20) {
    color = 'green'; label = 'Svarar'; mark = '●'
    if (median(daily.map(day => day.rate)) >= 1000) { color = 'yellow'; label = 'Längre svar'; mark = '◐' }
    if (daily.length >= 5 && total >= 40 && daily.every(day => day.rate < 600)) { color = 'blue'; label = 'Stabilt snabb'; mark = '◆' }
  }
  // An unfinished attempt is shown separately; it cannot lower a performance level.
  if (current[0]?.aborted) { color = 'white'; label = attentionCompletionLabel(current[0]); mark = '–' }
  if (!current.length && passes.length) label = 'Äldre upplägg'
  return { color, label, mark, correct: total, total, completed: full.length, aborted: current.length - full.length,
    days: daily.length, daily, eligibleTotal: total, legacy: passes.length - current.length,
    trend: { mark: '·', label: 'Svarstid från fullföljda pass; utveckling inom pass visas i elevvyn' }, reference: 'response-v2' }
}
