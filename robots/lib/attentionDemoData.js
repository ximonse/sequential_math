import { FocusActivitySession } from '../../src/lib/focusActivity.js'
import { MultiActivitySession, multiAnswer } from '../../src/lib/multiActivity.js'
import { attentionProtocol, ATTENTION_PROTOCOLS } from '../../src/lib/attentionProtocols.js'
import { isValidAttentionResult } from '../../src/lib/attentionHistory.js'

export const ATTENTION_DEMO_PROFILES = [
  ...Array.from({ length: 12 }, (_, i) => ({ name: `Robot ${String(i + 1).padStart(2, '0')} Normal`, type: 'normal', speed: 540 + i * 27 })),
  { name: 'Robot 13 Snabb rätt', type: 'fast-right', speed: 230 },
  { name: 'Robot 14 Snabb fel', type: 'fast-wrong', speed: 250 },
  { name: 'Robot 15 Långsam rätt', type: 'slow-right', speed: 1700 },
  { name: 'Robot 16 Långsam fel', type: 'slow-wrong', speed: 1750 },
  { name: 'Robot 17 Ojämna svar', type: 'uneven', speed: 700 },
  { name: 'Robot 18 Ojämna dagar', type: 'variable-days', speed: 650 },
  { name: 'Robot 19 Tappar fart', type: 'late-drop', speed: 460 },
  { name: 'Robot 20 Eftermiddagsdip', type: 'afternoon-drop', speed: 630 }
]

function randomSource(seed) {
  let value = seed >>> 0
  return () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296 }
}

// Actual activity models generate the records. Only pupil timing/choices are
// synthetic; waits, transitions, feedback, boundaries and summaries are real.
export function makeAttentionDemoPass(profile, mode, startedAt, seed = 1, dayIndex = 0, afternoon = false) {
  let time = 0
  const random = randomSource(seed)
  const session = mode === 'multi' ? new MultiActivitySession({ now: () => time, random }) : new FocusActivitySession({ now: () => time, random })
  session.mode = mode; session.start()
  const impulsive = profile.type.endsWith('-wrong')
  const variableDay = profile.type === 'variable-days' ? [0.7, 1.8, .9, 1.25, .8][dayIndex % 5] : 1
  const responseTime = () => {
    let value = profile.speed * (mode === 'multi' ? 1.35 : mode === 'choose' ? .85 : 1)
    value *= variableDay * (.84 + random() * .32)
    if (profile.type === 'uneven') value *= random() < .35 ? 2.6 : .65
    if (profile.type === 'late-drop' && time >= 60000) value *= 2.8
    if (profile.type === 'afternoon-drop' && afternoon) value *= 2.6
    const maximum = mode === 'discover' ? 4700 : mode === 'choose' ? 1850 : 3700
    return Math.round(Math.max(160, Math.min(maximum, value)))
  }
  for (let step = 0; session.phase === 'running' && step < 1000; step++) {
    if (mode === 'multi' && session.trial) {
      const switching = session.previousRule !== null && session.previousRule !== session.trial.rule
      const accuracy = impulsive ? switching ? .28 : .76 : profile.type === 'uneven' ? .8
        : profile.type === 'variable-days' && dayIndex % 5 === 1 ? .72 : profile.type === 'fast-right' ? .995 : switching ? .91 : .97
      const correct = random() < accuracy
      const side = multiAnswer(session.trial)
      time = Math.min(120000, time + responseTime())
      session.press(correct ? side : side === 'left' ? 'right' : 'left')
    } else if (mode !== 'multi' && session.signal) {
      const shouldPress = session.signal === 'go'
        ? mode === 'discover' || random() < (impulsive ? .8 : .96)
        : random() < (impulsive ? .85 : profile.type === 'uneven' ? .25 : profile.type === 'fast-right' ? .005 : .06)
      if (shouldPress) { time = Math.min(120000, time + responseTime()); session.press() }
      else { time = Math.min(120000, session.due); session.tick() }
    } else {
      if (mode !== 'multi' && random() < (impulsive ? .85 : .035)) {
        time = Math.min(120000, time + 450)
        session.press()
      }
      time = Math.min(120000, Math.max(time, session.due))
      session.tick()
    }
  }
  if (session.phase !== 'finished') throw new Error('Demo pass did not finish')
  const protocol = attentionProtocol(mode)
  const result = { id: `demo-${seed}-${mode}`, version: 3, mode, startedAt, finishedAt: startedAt + time,
    activeMs: session.elapsed, aborted: session.aborted, completionReason: session.completionReason || (session.aborted ? 'ended' : 'completed'),
    summary: session.summary(), trials: session.trace(), stimuli: session.stimuli(), events: session.events,
    protocolId: Object.keys(ATTENTION_PROTOCOLS).find(id => ATTENTION_PROTOCOLS[id] === protocol), protocol: structuredClone(protocol) }
  if (!isValidAttentionResult(result)) throw new Error(`Invalid synthetic pass: ${profile.name}, ${mode}, seed ${seed}`)
  return result
}

function stockholmTime(day, hour) {
  const offset = new Intl.DateTimeFormat('en', { timeZone: 'Europe/Stockholm', timeZoneName: 'shortOffset' })
    .formatToParts(new Date(`${day}T12:00:00Z`)).find(part => part.type === 'timeZoneName').value
  const hours = Number(offset.replace('GMT', '')) || 0
  return Date.parse(`${day}T${String(hour).padStart(2, '0')}:10:00Z`) - hours * 3600000
}

export function attentionDemoHistory(profile, pupilIndex, now = Date.now()) {
  const days = []
  for (let ago = 1; days.length < 12; ago++) {
    const day = new Date(now - ago * 86400000).toLocaleDateString('sv-SE', { timeZone: 'Europe/Stockholm' })
    const weekday = new Date(`${day}T12:00:00Z`).getUTCDay()
    if (weekday !== 0 && weekday !== 6) days.push(day)
  }
  const slots = days.flatMap((day, i) => [9, 14].map(hour => ({ startedAt: stockholmTime(day, hour), dayIndex: i + 1, afternoon: hour >= 12 })))
  slots.push({ startedAt: now - 12 * 60000, dayIndex: 0, afternoon: true })
  return slots.flatMap((slot, index) => ['discover', 'choose', 'multi'].map((mode, modeIndex) =>
    makeAttentionDemoPass(profile, mode, slot.startedAt + modeIndex * 180000,
      100000 + pupilIndex * 10000 + index * 10 + modeIndex, slot.dayIndex, slot.afternoon)))
}
