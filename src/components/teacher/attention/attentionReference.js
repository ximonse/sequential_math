import { FOCUS_DIMENSIONS, FOCUS_SIGNALS, focusSignal } from './attentionSignals'

// Conservative local pilot rules, not validated cutoffs or significance tests.
export const LOCAL_REFERENCE_RULES = Object.freeze({ peers: 8, recentDays: 5, orangeGap: 0.2, orangeSd: 1.5,
  orangeFraction: 0.8, redGap: 0.3, redSd: 2, redDays: 5, redAnswers: 40 })
const median = values => {
  const sorted = [...values].sort((a, b) => a - b), middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}
const recent = signal => signal.daily.slice(-LOCAL_REFERENCE_RULES.recentDays)

export function buildAttentionReference(rows) {
  return Object.fromEntries(FOCUS_DIMENSIONS.map(dimension => [dimension.id, rows.filter(row => row.status === 'ready').map(row => {
    const signal = focusSignal(row.history, dimension.id)
    const days = recent(signal)
    // Eligibility is reevaluated on recent days; older answers cannot make a
    // sparse recent window appear well supported.
    const total = days.reduce((sum, day) => sum + day.total, 0)
    const minimum = dimension.id === 'choose-stop' ? 12 : 20
    return signal.color !== 'white' && days.length >= 3 && total >= minimum
      ? { studentId: row.studentId, rate: median(days.map(day => day.rate)) } : null
  }).filter(Boolean)]))
}

export function compareAttentionSignal(signal, studentId, dimensionId, reference) {
  if (signal.color === 'white' || !reference) return signal
  const peers = (reference[dimensionId] || []).filter(peer => peer.studentId !== studentId)
  if (peers.length < LOCAL_REFERENCE_RULES.peers) return signal
  const days = recent(signal)
  const total = days.reduce((sum, day) => sum + day.total, 0)
  if (days.length < 3 || total < (dimensionId === 'choose-stop' ? 12 : 20)) return signal
  const mean = peers.reduce((sum, peer) => sum + peer.rate, 0) / peers.length
  const sd = Math.sqrt(peers.reduce((sum, peer) => sum + (peer.rate - mean) ** 2, 0) / (peers.length - 1))
  const rate = median(days.map(day => day.rate))
  const redBoundary = mean - Math.max(LOCAL_REFERENCE_RULES.redGap, LOCAL_REFERENCE_RULES.redSd * sd)
  const orangeBoundary = mean - Math.max(LOCAL_REFERENCE_RULES.orangeGap, LOCAL_REFERENCE_RULES.orangeSd * sd)
  const below = (value, boundary) => value <= boundary + 1e-9
  let color = signal.color
  if (days.length >= LOCAL_REFERENCE_RULES.redDays && total >= LOCAL_REFERENCE_RULES.redAnswers
    && days.every(day => below(day.rate, redBoundary))) color = 'red'
  else if (below(rate, orangeBoundary)
    && days.filter(day => below(day.rate, orangeBoundary)).length >= Math.ceil(days.length * LOCAL_REFERENCE_RULES.orangeFraction)) color = 'orange'
  return { ...signal, color, ...FOCUS_SIGNALS[color], reference: 'local-pilot-v1',
    comparison: { peers: peers.length, mean, sd, rate, days: days.length, total } }
}

export const localFocusSignal = (row, dimensionId, reference) => compareAttentionSignal(focusSignal(row.history, dimensionId), row.studentId, dimensionId, reference)
