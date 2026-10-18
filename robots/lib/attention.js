import { ATTENTION_PROTOCOLS } from '../../src/lib/attentionProtocols.js'

export function attentionFixture(id, startedAt, mode = 'discover', responseMs = 400, lateRatio = 1) {
  const times = [6000, 13000, 20000, 27000, 34000, 45000, 56000, 67000, 78000, 94000, 110000]
  const trials = times.map((at, i) => {
    const kind = mode === 'multi' ? i === 0 ? 'first' : i % 2 ? 'repeat' : 'switch'
      : mode === 'choose' && [1, 2, 7].includes(i) ? 'stop' : 'go'
    const outcome = kind === 'stop' ? 'withheld' : 'hit'
    return { at, kind, outcome, responseMs: kind === 'stop' ? null : responseMs * (at >= 80000 ? lateRatio : 1) }
  })
  const mid = values => { const v = values.sort((a, b) => a - b), i = Math.floor(v.length / 2); return v.length % 2 ? v[i] : (v[i - 1] + v[i]) / 2 }
  const group = kind => {
    const samples = trials.filter(t => t.kind === kind)
    return { total: samples.length, correct: samples.length, median: mid(samples.map(t => t.responseMs)) }
  }
  const hits = trials.filter(t => t.outcome === 'hit')
  const protocolId = mode === 'discover' ? 'focus-targets-1' : mode === 'choose' ? 'control-targets-1' : 'multi-rules-1'
  const stimuli = trials.map((trial, i) => mode === 'multi' ? { shape: 'diamond', dots: 2, rule: i % 4 < 2 ? 'shape' : 'count', side: 'left', expectedSide: 'left' }
    : { signal: trial.kind === 'go' ? 'go' : i === 2 ? 'square' : 'red', waitMs: trial.at < 40000 ? 6000 : trial.at < 80000 ? 10000 : 15000 })
  return { id, version: 3, mode, startedAt, finishedAt: startedAt + 120000, activeMs: 120000, aborted: false,
    completionReason: 'completed', protocolId, protocol: ATTENTION_PROTOCOLS[protocolId], trials, stimuli,
    events: [{ at: 0, wallMs: 0, type: 'start', stimulus: null }, { at: 120000, wallMs: 120000, type: 'finish', stimulus: null }],
    summary: mode === 'multi' ? { total: trials.length, correct: trials.length, wrong: 0, missed: 0, repeat: group('repeat'), switch: group('switch') }
      : { hits: hits.length, misses: 0, wrong: 0, withheld: trials.length - hits.length, early: 0, median: mid(hits.map(t => t.responseMs)) } }
}

export async function saveAttentionFixtures(page, passes) {
  return page.evaluate(async payloads => {
    const { csrfToken } = await (await fetch('/api/student-session')).json()
    const response = await fetch('/api/me/events', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
      body: JSON.stringify({ entries: payloads.map(payload => ({ id: `fixture-${payload.id}`, type: 'attention_result', timestamp: payload.finishedAt, payload })) }) })
    return { status: response.status, body: await response.json() }
  }, passes)
}
