import { evidenceProblem } from './evidenceProblem.js'
export { evidenceProblem } from './evidenceProblem.js'
import { candidatesForEvidence } from '../domains/predictableErrors/index.js'
import { selectPredictableProbe, questionFingerprint } from '../domains/predictableErrors/probes.js'
import { isSpeedTrainingEntry } from './practiceModes.js'
import { diagnosticWorkAnalysis } from '../domains/arithmetic/diagnosticWorkAnalysis.js'
import { diagnosticWorkSignals } from '../domains/arithmetic/diagnosticScreeningSummary.js'
import { PREDICTABLE_RULE_VERSION, unavailable } from '../domains/predictableErrors/core.js'
import { manualKeyMatch, screeningStructure } from '../domains/arithmetic/screeningKeys.js'

// Screening tasks frozen without structure get it from the screening keys when the
// question is the bank's task, word for word. Applied after the evidence revision
// is computed, so source references stay valid (docs/STYRNING_FELFORSTAELSER.md, step 3).
function withScreeningStructure(entry) {
  if (entry.source !== 'screening') return { entry, structure: null }
  const structure = screeningStructure(entry.question)
  if (structure.status !== 'added') return { entry, structure }
  const { domain, type, skill, values } = structure.problem
  return { entry: { ...entry, question: { ...entry.question, domain, operation: type, skill, values, structureSource: 'screening_keys' } }, structure }
}

// The notebook shows the correct result but another answer was entered: an
// input or copying slip, not a calculation error (blind test 2026-11-01).
function notebookMismatch(entry, predictable, work) {
  const q = entry.question ?? {}
  if (entry.source !== 'screening' || entry.answer?.status !== 'incorrect' || !entry.detail?.snapshot
    || !['addition', 'subtraction'].includes(q.operation) || predictable.computedCorrect === undefined) return null
  try {
    const visible = work?.visibleResultWithExchangeMarks
    if (!visible) return null
    if (visible.status !== 'observed' || visible.consistency !== 'different'
      || visible.visibleResult !== Number(predictable.computedCorrect)) return null
    return { modelId: 'notebook_answer_mismatch', predictedAnswer: visible.explicitAnswer,
      reasonSv: `Uppställningen i räknehäftet ger rätt resultat (${visible.visibleResult}), men svaret ${visible.explicitAnswer} skrevs in. Skillnaden kan bero på avskrivning eller inmatning; orsaken behöver granskas.` }
  } catch { return null }
}

const SPEED_TRAINING_PROBE = { status: 'not_in_speed_training',
  purposeSv: 'Ingen följdfråga i snabbhetsträning, där målet är att bli snabb. Ett upprepat förståelsemönster kan i stället föranleda screening utan tidspress.' }

export function addPredictableEvidence(entries) {
  const seen = new Set(entries.map(e => questionFingerprint(evidenceProblem(e))))
  const probeCache = new Map()
  return entries.map(entry => {
    let work
    if (entry.source === 'screening' && entry.detail?.snapshot) {
      try {
        const analysis = diagnosticWorkAnalysis(entry.question, entry.detail.snapshot)
        work = { ...analysis, signals: diagnosticWorkSignals(analysis), reference: entry.reference }
      } catch {
        // Older or incomplete task metadata must not prevent original work from
        // being read/exported, or masquerade as an observed calculation method.
        work = { status: 'unknown', reason: 'work_identity_or_format_unverified', signals: [], reference: entry.reference }
      }
      entry = { ...entry, interpretation: { ...entry.interpretation, work } }
    }
    const screening = withScreeningStructure(entry)
    entry = screening.entry
    let predictable = screening.structure?.status === 'task_changed'
      ? unavailable(entry.question?.domain, 'task_changed') : candidatesForEvidence(entry)
    const manualKey = entry.source === 'screening' && entry.answer?.status === 'incorrect' ? manualKeyMatch(entry.question, entry.answer.studentAnswer) : null
    if (manualKey) entry = { ...entry, interpretation: { ...entry.interpretation, key: manualKey } }
    const mismatch = notebookMismatch(entry, predictable, work)
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
