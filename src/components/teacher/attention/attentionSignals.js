import { filterAttentionResults } from '../../../lib/attentionStatistics'
import { focusResponseSignal } from './focusResponseSignal'
import { attentionProtocolId } from '../../../lib/attentionProtocols'

// Descriptive design values, not age norms or validated reliability cutoffs.
// Never infer a below-average flag from the pupils currently visible in a group.
export const FOCUS_SIGNAL_RULES = Object.freeze({ days: 3, dailyGo: 4, dailyStop: 2, answers: 20, stopAnswers: 12,
  green: 0.6, blueDays: 5, blueAnswers: 40, blueDaily: 0.9, blueMedian: 0.95, trendChange: 0.15 })
export const FOCUS_DIMENSIONS = [
  { id: 'discover-go', mode: 'discover', label: 'Svarstid', exercise: 'FOKUS' },
  { id: 'choose-go', mode: 'choose', label: 'Upptäcka', exercise: 'KONTROLL' },
  { id: 'choose-stop', mode: 'choose', label: 'Hejda', exercise: 'KONTROLL' },
  { id: 'multi-switch', mode: 'multi', label: 'Växla', exercise: 'MULTI' }
]
export const FOCUS_SIGNALS = {
  white: { label: 'Samlar underlag', mark: '…' },
  yellow: { label: 'Färre träffar', mark: '◐' },
  green: { label: 'Oftast träff', mark: '●' },
  blue: { label: 'Stabilt träffsäker', mark: '◆' },
  orange: { label: 'Återkommande lägre', mark: '△' },
  red: { label: 'Följ upp', mark: '!' }
}
const median = values => {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}
const dayKey = timestamp => new Date(timestamp).toLocaleDateString('sv-SE', { timeZone: 'Europe/Stockholm' })
const counts = (pass, id) => id === 'choose-stop' ? [pass.summary.withheld, pass.summary.withheld + pass.summary.wrong]
  : id === 'multi-switch' ? [pass.summary.switch.correct, pass.summary.switch.total]
    : [pass.summary.hits, pass.summary.hits + pass.summary.misses]

function trendFor(days) {
  if (days.length < 6) return { mark: '·', label: 'Fler jämförbara dagar behövs för riktning' }
  const previous = days.slice(-6, -3).map(day => day.rate)
  const recent = days.slice(-3).map(day => day.rate)
  const difference = median(recent) - median(previous)
  if (difference >= FOCUS_SIGNAL_RULES.trendChange && Math.min(...recent) > Math.max(...previous)) return { mark: '↗', label: 'Fler träffar de senaste tre jämförbara dagarna' }
  if (difference <= -FOCUS_SIGNAL_RULES.trendChange && Math.max(...recent) < Math.min(...previous)) return { mark: '↘', label: 'Färre träffar de senaste tre jämförbara dagarna' }
  return { mark: '↔', label: 'Ingen tydlig riktning mellan de senaste jämförbara dagarna' }
}

export function focusSignal(history, dimensionId) {
  const dimension = FOCUS_DIMENSIONS.find(item => item.id === dimensionId)
  if (!dimension) throw new Error('Unknown focus dimension')
  const available = filterAttentionResults(history, { mode: dimension.mode })
  const latest = available[0]
  // Existing overview also isolates explicit protocols; historical values remain in details.
  const protocolId = latest?.protocolId || null
  const passes = latest ? available.filter(pass => protocolId ? attentionProtocolId(pass) === protocolId : !pass.protocolId) : []
  if (dimension.mode === 'discover') return { ...focusResponseSignal(passes), protocolId }
  const full = passes.filter(pass => !pass.aborted)
  const days = new Map()
  let correct = 0, total = 0
  for (const pass of full) {
    const [hits, answers] = counts(pass, dimensionId)
    correct += hits; total += answers
    const key = dayKey(pass.finishedAt)
    const day = days.get(key) || { key, correct: 0, total: 0 }
    day.correct += hits; day.total += answers
    days.set(key, day)
  }
  const stop = dimensionId === 'choose-stop'
  const dailyMinimum = stop ? FOCUS_SIGNAL_RULES.dailyStop : FOCUS_SIGNAL_RULES.dailyGo
  const informativeDays = [...days.values()].filter(day => day.total >= dailyMinimum)
    .sort((a, b) => a.key.localeCompare(b.key)).map(day => ({ ...day, rate: day.correct / day.total }))
  const eligibleTotal = informativeDays.reduce((sum, day) => sum + day.total, 0)
  let color = 'white'
  if (informativeDays.length >= FOCUS_SIGNAL_RULES.days && eligibleTotal >= (stop ? FOCUS_SIGNAL_RULES.stopAnswers : FOCUS_SIGNAL_RULES.answers)) {
    const rates = informativeDays.map(day => day.rate)
    const frequentHits = rates.filter(rate => rate >= FOCUS_SIGNAL_RULES.green).length >= Math.ceil(rates.length * 2 / 3)
    color = frequentHits && median(rates) >= FOCUS_SIGNAL_RULES.green ? 'green' : 'yellow'
    if (informativeDays.length >= FOCUS_SIGNAL_RULES.blueDays && eligibleTotal >= FOCUS_SIGNAL_RULES.blueAnswers
      && rates.every(rate => rate >= FOCUS_SIGNAL_RULES.blueDaily) && median(rates) >= FOCUS_SIGNAL_RULES.blueMedian) color = 'blue'
  }
  return { color, ...FOCUS_SIGNALS[color], correct, total, completed: full.length, aborted: passes.length - full.length,
    days: informativeDays.length, daily: informativeDays, eligibleTotal, trend: trendFor(informativeDays), reference: 'descriptive-v1', protocolId }
}

export function describeFocusEvidence(signal) {
  if (signal.reference === 'response-v2') {
    const c = signal.comparison
    return `${signal.completed} fullföljda pass, ${signal.aborted} avbrutna/ej fullföljda och ${signal.legacy} äldre pass. ${signal.days} dagar med underlag. Svarstid från senaste fullföljda pass med minst fyra träffar per dag. Äldre tvåsekunderspass ingår bara i historiken.${c ? ` Preliminär lokal jämförelse med ${c.peers} andra elever: genomsnitt ${Math.round(c.mean)} ms, spridning ${Math.round(c.sd)} ms; elevens median av dagarnas passmedianer ${Math.round(c.rate)} ms. Ingen åldersnorm eller säkerställd avvikelse.` : ' Lokalt jämförelseunderlag saknas eller hämtas.'}`
  }
  const evidence = `${signal.correct} rätt av ${signal.total} svar, ${signal.completed} färdiga pass, ${signal.days} dagar med tillräckligt underlag. ${signal.aborted} avbrutna pass ingår inte.`
  if (!signal.comparison) return `${evidence} Beskrivande färg; lokalt jämförelseunderlag saknas eller hämtas. Ingen åldersnorm.`
  const comparison = signal.comparison
  return `${evidence} Preliminär lokal jämförelse med ${comparison.peers} andra elever: genomsnitt ${Math.round(comparison.mean * 100)} %, spridning ${Math.round(comparison.sd * 100)} procentenheter. Elevens dagmedian ${Math.round(comparison.rate * 100)} % under de senaste ${comparison.days} jämförbara dagarna. Ingen åldersnorm eller statistiskt säkerställd avvikelse.`
}
