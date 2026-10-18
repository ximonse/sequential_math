// Immutable measurement definitions. A behavioral change requires a NEW id;
// never edit an existing definition after release. Exports include the snapshot.
const common = { durationMs: 120000, clock: 'performance.now; active time excludes hidden-page pauses',
  completedSignalsOnly: true, practiceExcluded: true, duplicatePressGuardMs: 400,
  reactionTime: 'ms from painted signal/trial to first accepted press; correct answers only in median' }
export const ATTENTION_PROTOCOLS = {
  'focus-targets-1': { ...common, mode: 'discover', name: '1 - FOKUS',
    instruction: 'Press for green circle. White is waiting. Blink normally.',
    stages: [{ startMs: 0, targetMs: 6000 }, { startMs: 40000, targetMs: 10000 }, { startMs: 80000, targetMs: 15000 }],
    jitterMs: 2000, jitterDistribution: 'uniform +/- jitterMs, independently for each wait', responseWindowMs: 5000,
    noResponse: 'Stop and offer restart; unfinished green signal excluded from score; attempt retained.' },
  'control-targets-1': { ...common, mode: 'choose', name: '2 - KONTROLL',
    instruction: 'Press only for green circle. Withhold for red circle or green square.',
    stages: [{ startMs: 0, targetMs: 6000 }, { startMs: 40000, targetMs: 10000 }, { startMs: 80000, targetMs: 15000 }],
    jitterMs: 2000, jitterDistribution: 'uniform +/- jitterMs, independently for each wait', responseWindowMs: 2000,
    signals: { greenCircle: .7, redCircle: .15, greenSquare: .15 }, firstThree: 'one of each signal in shuffled order' },
  'multi-rules-1': { ...common, mode: 'multi', name: 'MULTI',
    instruction: 'Upper box: shape (diamond left, square right). Lower box: count (2 left, 3 right).',
    responseWindowMs: 4000, waitMs: 600, correctFeedbackMs: 500, correctionMs: 1800,
    trials: '32-trial balanced blocks; fixed introduction includes repeat and switch; first trial excluded from transition statistics',
    transitions: 'relative to previous completed trial, including wrong and timed-out trials' }
}
export const attentionProtocol = mode => ATTENTION_PROTOCOLS[mode === 'discover' ? 'focus-targets-1' : mode === 'choose' ? 'control-targets-1' : 'multi-rules-1']
export const attentionProtocolId = pass => pass.protocolId || `${pass.mode}-legacy-v${pass.version}`
export const legacyProtocol = pass => ({ id: attentionProtocolId(pass), mode: pass.mode,
  dataVersion: pass.version, legacy: true, durationMs: 120000,
  responseWindowMs: pass.mode === 'multi' ? 4000 : pass.mode === 'discover' && pass.version >= 2 ? 5000 : 2000,
  limitations: pass.version === 1 ? 'Summary only. Individual signals and historical code revision were not recorded.'
    : 'Signal onset, outcome and response time recorded. Exact stimulus, wait and page pauses were not recorded.',
  waits: pass.mode === 'multi' ? '600 ms' : 'uniform 3-10 / 3-15 / 3-20 seconds in 40-second stages' })
