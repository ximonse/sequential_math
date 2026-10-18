import { attentionProtocolId } from './attentionProtocols'
import { isComparableAttentionPass } from './attentionHistory'
import { median } from './attentionEndurance'

export const focusDate = timestamp => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm' }).format(timestamp)
export const FORM_METRICS = { speed: 'Svarshastighet', endurance: 'Uthållighet', control: 'Kontroll', switching: 'Regelväxling' }
export const ATTENTION_FORM_DEFINITION = {
  id: 'local-form-1', referenceDays: 21, excludeCurrentDay: true, minimumDays: 3, minimumOtherPupils: 8,
  timeZone: 'Europe/Stockholm', protocols: 'Same protocol ID and mode only; legacy data versions kept separate.',
  speed: 'Median correct go responses; MULTI repeats only. At least 4 correct responses and 60% accuracy.',
  endurance: 'Late (80-120s) / early (0-40s) median correct response time. At least 2 hits and 60% accuracy per stage. MULTI repeat/switch matched separately; median of their ratios. Slower answers do not establish a cause.',
  control: 'Correct withholds / all stop signals; at least 2 stop signals.',
  switching: 'Switch accuracy minus repeat accuracy; at least 4 trials of each kind.',
  weighting: 'Median of passes per day; median of days per pupil; arithmetic mean of eligible pupil medians. Own reference: mean of daily medians.',
  colors: 'White unknown. Green ordinary variation, yellow more than 0.75 spread units worse, blue more than 1.5 better. Spread floors: speed150ms, endurance0.15, control0.10, switching0.15. Orange requires 1.5 units and absolute gaps (500ms / 0.5 ratio / 20pp), on 4 previous days; red 2 units and gaps (750ms / 0.75 ratio / 30pp) on all last 5 days. FOKUS orange >=1000ms, red >=1500ms. Incomplete attempts never colored low.',
  limitations: 'Local exploratory design values, no validated age norms or cognitive/medical diagnosis. Current class membership is used; historical membership changes are not reconstructed.'
}
const floors = { speed: 150, endurance: .15, control: .1, switching: .15 }
const direction = { speed: -1, endurance: -1, control: 1, switching: 1 }
const mean = values => values.reduce((a, b) => a + b, 0) / values.length

export function attentionMetric(pass, metric) {
  if (!isComparableAttentionPass(pass) || !Array.isArray(pass.trials)) return null
  const hits = pass.trials.filter(t => t.outcome === 'hit' && (pass.mode !== 'multi' || t.kind === 'repeat'))
  const responseTrials = pass.trials.filter(t => pass.mode === 'multi' ? t.kind === 'repeat' : t.kind === 'go')
  if (metric === 'speed') return hits.length >= 4 && hits.length / responseTrials.length >= .6 ? median(hits.map(t => t.responseMs)) : null
  if (metric === 'control') {
    const stops = pass.trials.filter(t => t.kind === 'stop')
    return pass.mode === 'choose' && stops.length >= 2 ? stops.filter(t => t.outcome === 'withheld').length / stops.length : null
  }
  if (metric === 'switching') {
    const s = pass.summary
    return pass.mode === 'multi' && s.repeat.total >= 4 && s.switch.total >= 4
      ? s.switch.correct / s.switch.total - s.repeat.correct / s.repeat.total : null
  }
  // Match trial kind across early/late stages; switching is never pooled with repeats.
  const kinds = pass.mode === 'multi' ? ['repeat', 'switch'] : ['go']
  const ratios = kinds.map(kind => {
    const stage = (from, to) => pass.trials.filter(t => t.kind === kind && t.at >= from && t.at < to)
    const earlyAll = stage(0, 40000), early = earlyAll.filter(t => t.outcome === 'hit')
    const lateAll = stage(80000, 120000), late = lateAll.filter(t => t.outcome === 'hit')
    if (early.length < 2 || late.length < 2 || early.length / earlyAll.length < .6 || late.length / lateAll.length < .6) return null
    const baseline = median(early.map(t => t.responseMs))
    return baseline >= 100 ? median(late.map(t => t.responseMs)) / baseline : null
  })
  return ratios.every(value => value !== null) ? median(ratios) : null
}

function dailyValues(history, template, metric, before) {
  const days = new Map(), lower = before - 21 * 86400000, day = focusDate(before)
  for (const pass of history) {
    if (pass.startedAt < lower || focusDate(pass.startedAt) >= day || pass.mode !== template.mode
      || attentionProtocolId(pass) !== attentionProtocolId(template)) continue
    const value = attentionMetric(pass, metric)
    if (value === null) continue
    const key = focusDate(pass.startedAt)
    days.set(key, [...(days.get(key) || []), value])
  }
  return [...days].sort(([a], [b]) => a.localeCompare(b)).map(([day, values]) => ({ day, value: median(values) }))
}

export function attentionComparison(row, pass, metric, rows, baseline = 'class', asOf = Date.now()) {
  const value = attentionMetric(pass, metric)
  const empty = { value, score: null, color: 'white', label: 'Samlar underlag', peers: 0 }
  if (value === null) return empty
  const own = dailyValues(row.history, pass, metric, asOf)
  const peers = baseline === 'own' ? own.map(d => d.value) : rows.filter(peer => peer.studentId !== row.studentId)
    .map(peer => dailyValues(peer.history, pass, metric, asOf)).filter(days => days.length >= 3)
    .map(days => median(days.map(d => d.value)))
  const minimum = baseline === 'own' ? 3 : 8
  if (peers.length < minimum) return { ...empty, peers: peers.length }
  const center = mean(peers)
  const spread = Math.max(floors[metric], Math.sqrt(mean(peers.map(v => (v - center) ** 2))))
  const scoreFor = v => direction[metric] * (v - center) / spread
  const gap = metric === 'speed' ? [500, 750] : metric === 'endurance' ? [.5, .75] : [.2, .3]
  const below = (v, level) => scoreFor(v) <= (level === 0 ? -1.5 : -2) && direction[metric] * (v - center) <= -gap[level]
  const score = scoreFor(value)
  const recent = own.slice(-5)
  const slowEnough = metric !== 'speed' || pass.mode !== 'discover' || value >= 1000
  const recurring = recent.filter(d => below(d.value, 0)).length >= 4
  const severe = recent.length === 5 && recent.every(d => below(d.value, 1))
  const color = slowEnough && below(value, 1) && severe && (metric !== 'speed' || pass.mode !== 'discover' || value >= 1500) ? 'red'
    : slowEnough && below(value, 0) && recurring ? 'orange' : score < -.75 ? 'yellow' : score > 1.5 ? 'blue' : 'green'
  return { value, score, color, peers: peers.length, center, spread,
    label: { red: 'Återkommande stor skillnad', orange: 'Återkommande skillnad', yellow: 'Lägre i detta pass', green: 'Inom vanlig variation', blue: 'Starkare i detta pass' }[color] }
}

export function latestToday(row, mode, asOf) {
  return row.history.filter(pass => pass.mode === mode && pass.startedAt <= asOf && focusDate(pass.startedAt) === focusDate(asOf))
    .sort((a, b) => b.startedAt - a.startedAt)[0] || null
}
