import { pupilFollowUpSelection, followUpRecommendation } from './pupilFollowUpSelection.js'
import { evidenceProblem } from './evidenceProblem.js'
import { isSpeedTrainingEntry, SPEED_SLIP_MODELS } from './practiceModes.js'
import { ERROR_MODELS, NEEDS_REPETITION_MODELS } from '../domains/predictableErrors/catalog.js'
import { questionFingerprint } from '../domains/predictableErrors/questionFingerprint.js'
import { answerModelIds, comparableRuleCounter, modelGroups } from './answerInterpretation.js'

export { comparableRuleCounter }

const current = entry => entry?.interpretation?.predictable
// A quotient one off is usually a slip (blind test 3); it becomes a candidate only when
// it repeats at least three times and more often than comparable correct answers.
export const SLIP_UNTIL_REPEATED = NEEDS_REPETITION_MODELS
// The shared interpretation's strength of a model group, strongest first (B1, B2).
const STATUS_RANK = { pattern: 0, single: 1, below: 2, contradicted: 3 }

// A model judged as a pattern across different tasks shows one answer per task
// first, so a fact repeated many times cannot crowd the others out of the card.
function supportsForCard(modelId, supports) {
  if (!ERROR_MODELS[modelId]?.minDistinctTasks) return supports.slice(0, 20)
  const seen = new Set(), first = [], repeats = []
  for (const entry of supports) {
    const key = questionFingerprint(evidenceProblem(entry))
    if (seen.has(key)) repeats.push(entry)
    else { seen.add(key); first.push(entry) }
  }
  return [...first, ...repeats].slice(0, 20)
}

export function buildRuleHypotheses(entries) {
  // Generic models yield to a specific one on the same answer, as in every view.
  const groups = new Map()
  for (const entry of entries) {
    const result = current(entry)
    if (entry.answer.status !== 'incorrect' || result?.status !== 'matched') continue
    for (const modelId of answerModelIds(entry)) {
      // Single slips under time pressure are summarised, not treated as hypotheses.
      if (SPEED_SLIP_MODELS.has(modelId) && isSpeedTrainingEntry(entry)) continue
      const key = JSON.stringify([result.domain, result.scope, modelId])
      if (!groups.has(key)) groups.set(key, { modelId, supports: [] })
      groups.get(key).supports.push(entry)
    }
  }
  const judged = modelGroups(entries)
  const status = group => judged.get(JSON.stringify([current(group.supports[0]).domain ?? null, current(group.supports[0]).scope ?? null, group.modelId]))
  const units = group => new Set(group.supports.map(e => e.reference.observationId ?? e.reference.attemptId ?? e.ref)).size
  // Patterns first; answers more comparable right answers speak against last (B2).
  const ordered = [...groups.values()].sort((a, b) => (STATUS_RANK[status(a)?.status] ?? 1) - (STATUS_RANK[status(b)?.status] ?? 1)
    || units(b) - units(a) || a.modelId.localeCompare(b.modelId))
  return ordered.flatMap(group => {
    const { modelId, supports } = group
    const support = supportsForCard(modelId, supports), first = current(support[0]), match = first.matches.find(m => m.modelId === modelId)
    const plan = pupilFollowUpSelection({ modelId, supports: support, entries })
    // The count speaks for the whole group; the card lists counters comparable to its own answers.
    const allCounters = status(group)?.counters ?? entries.filter(e => comparableRuleCounter(e, support, modelId))
    const counters = allCounters.filter(e => comparableRuleCounter(e, support, modelId)).slice(0, 5)
    if (SLIP_UNTIL_REPEATED.has(modelId) && (supports.length < 3 || supports.length <= allCounters.length)) return []
    return [{ basis: 'rule_candidate', signalCode: modelId, ruleVersion: first.ruleVersion,
      textSv: `${match.reasonSv} Det är en beräknad kandidat, inte en fastställd elevmetod.`,
      supportRefs: support.map(e => e.ref), counterRefs: counters.map(e => e.ref),
      alternativesSv: ['Andra felmodeller kan ge samma svar. Kontrollera originalarbete och en särskiljande fråga.',
        'Hjälp, avbrott eller en felinmatning kan påverka svaren. Rätta slutsvar visar inte i sig självständig metodförståelse.'],
      nextCheckSv: followUpRecommendation(plan) ?? (
        support.every(isSpeedTrainingEntry)
          ? 'Mönstret kommer från snabbhetsträning, där målet är att bli snabb. Ingen följdfråga där; upprepas mönstret kan screening av begreppet utan tidspress föreslås.'
          : 'Granska metoden och välj en ny särskiljande fråga. Den granskade frågebanken saknar en oanvänd kontrast för alla aktuella kandidater.') }]
  })
}
