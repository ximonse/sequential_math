import { pupilFollowUpSelection, followUpRecommendation } from './pupilFollowUpSelection.js'
import { arithmeticContentSignature } from './arithmeticContentSignature.js'
import { evidenceProblem } from './evidenceProblem.js'
import { isSpeedTrainingEntry, SPEED_SLIP_MODELS } from './practiceModes.js'
import { NEEDS_REPETITION_MODELS, YIELDS_TO_SPECIFIC_MODELS } from '../domains/predictableErrors/catalog.js'

const current = entry => entry?.interpretation?.predictable
// A quotient one off is usually a slip (blind test 3); it becomes a candidate only when
// it repeats at least three times and more often than comparable correct answers.
export const SLIP_UNTIL_REPEATED = NEEDS_REPETITION_MODELS
// Generic observations that also fit many specific rules (320 / 4 = 8 is both a dropped
// quotient zero and a scaling). When a specific rule explains the answer, they are not shown.
const GENERIC_MODELS = YIELDS_TO_SPECIFIC_MODELS
const level = entry => entry.context?.contentLevel ?? entry.context?.level

export function comparableRuleCounter(entry, supports, modelId) {
  const value = current(entry)
  if (entry.answer.status !== 'correct' || value?.status !== 'correct' || !value.testedModelIds?.includes(modelId)) return false
  const work = entry.interpretation?.work
  if ([work?.visibleResult, work?.visibleResultWithExchangeMarks].some(result => result?.status === 'observed' && result.consistency === 'different')) return false
  return supports.some(support => {
    const other = current(support), left = level(entry), right = level(support)
    if (value.domain !== other?.domain || value.scope !== other?.scope) return false
    const knownLeft = typeof left === 'number' && left >= 1, knownRight = typeof right === 'number' && right >= 1
    if (knownLeft && knownRight) return left === right && Boolean(entry.context?.contentSkill)
      && entry.context.contentSkill === support.context?.contentSkill
    if (entry.source !== 'screening' && support.source !== 'screening') return false
    const signature = arithmeticContentSignature(evidenceProblem(entry))
    return signature !== null && signature === arithmeticContentSignature(evidenceProblem(support))
  })
}

export function buildRuleHypotheses(entries) {
  const groups = new Map()
  for (const entry of entries) {
    const result = current(entry)
    if (entry.answer.status !== 'incorrect' || result?.status !== 'matched') continue
    const ids = new Set(result.matches.map(m => m.modelId))
    const specific = [...ids].some(id => !GENERIC_MODELS.has(id))
    for (const modelId of ids) {
      if (specific && GENERIC_MODELS.has(modelId)) continue
      // Single slips under time pressure are summarised, not treated as hypotheses.
      if (SPEED_SLIP_MODELS.has(modelId) && isSpeedTrainingEntry(entry)) continue
      const key = JSON.stringify([result.domain, result.scope, modelId])
      if (!groups.has(key)) groups.set(key, { modelId, supports: [] })
      groups.get(key).supports.push(entry)
    }
  }
  const ordered = [...groups.values()].sort((a, b) => {
    const units = group => new Set(group.supports.map(e => e.reference.observationId ?? e.reference.attemptId ?? e.ref)).size
    return units(b) - units(a) || a.modelId.localeCompare(b.modelId)
  })
  return ordered.flatMap(({ modelId, supports }) => {
    const support = supports.slice(0, 20), first = current(support[0]), match = first.matches.find(m => m.modelId === modelId)
    const plan = pupilFollowUpSelection({ modelId, supports: support, entries })
    const allCounters = entries.filter(e => comparableRuleCounter(e, support, modelId)), counters = allCounters.slice(0, 5)
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
