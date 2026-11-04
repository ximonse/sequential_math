import { evidenceProblem } from './evidenceProblem.js'
export { evidenceProblem } from './evidenceProblem.js'
import { candidatesForEvidence } from '../domains/predictableErrors/index.js'
import { selectPredictableProbe, questionFingerprint } from '../domains/predictableErrors/probes.js'
import { isSpeedTrainingEntry } from './practiceModes.js'
import { analyzeDiagnosticVisibleResult } from '../domains/arithmetic/diagnosticVisibleResult.js'
import { PREDICTABLE_RULE_VERSION } from '../domains/predictableErrors/core.js'

// The notebook shows the correct result but another answer was entered: an
// input or copying slip, not a calculation error (blind test 2026-11-01).
function notebookMismatch(entry, predictable) {
  const q = entry.question ?? {}
  if (entry.source !== 'screening' || entry.answer?.status !== 'incorrect' || !entry.detail?.snapshot
    || !['addition', 'subtraction'].includes(q.operation) || predictable.computedCorrect === undefined) return null
  try {
    const visible = analyzeDiagnosticVisibleResult(q, entry.detail.snapshot, { allowExchangeMarks: true })
    if (visible.status !== 'observed' || visible.consistency !== 'different'
      || visible.visibleResult !== Number(predictable.computedCorrect)) return null
    return { modelId: 'notebook_answer_mismatch', predictedAnswer: visible.explicitAnswer,
      reasonSv: `Uppställningen i räknehäftet ger rätt resultat (${visible.visibleResult}), men svaret ${visible.explicitAnswer} skrevs in. Troligen en avskrivningsmiss, inte ett räknefel.` }
  } catch { return null }
}

const SPEED_TRAINING_PROBE = { status: 'not_in_speed_training',
  purposeSv: 'Ingen följdfråga i snabbhetsträning, där målet är att bli snabb. Ett upprepat förståelsemönster kan i stället föranleda screening utan tidspress.' }

export function addPredictableEvidence(entries) {
  const seen = new Set(entries.map(e => questionFingerprint(evidenceProblem(e))))
  const probeCache = new Map()
  return entries.map(entry => {
    let predictable = candidatesForEvidence(entry)
    const mismatch = notebookMismatch(entry, predictable)
    if (mismatch) predictable = { ...predictable, ruleVersion: PREDICTABLE_RULE_VERSION, status: 'matched',
      matches: [mismatch, ...(predictable.matches ?? []).filter(m => m.modelId !== mismatch.modelId)] }
    if (isSpeedTrainingEntry(entry)) {
      return { ...entry, interpretation: { ...entry.interpretation, predictable: { ...predictable, nextProbe: structuredClone(SPEED_TRAINING_PROBE) } } }
    }
    const key = JSON.stringify([questionFingerprint(evidenceProblem(entry)), predictable.domain, predictable.scope, [...new Set(predictable.matches.map(m => m.modelId))].sort()])
    if (!probeCache.has(key)) probeCache.set(key, selectPredictableProbe(predictable, seen, [evidenceProblem(entry)]))
    const nextProbe = structuredClone(probeCache.get(key))
    return { ...entry, interpretation: { ...entry.interpretation, predictable: { ...predictable, nextProbe } } }
  })
}
