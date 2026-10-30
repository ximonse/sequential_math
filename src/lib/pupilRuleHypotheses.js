import { isSpeedTrainingEntry, SPEED_SLIP_MODELS } from './practiceModes.js'

const current = entry => entry?.interpretation?.predictable
const level = entry => entry.context?.contentLevel ?? entry.context?.level

export function comparableRuleCounter(entry, supports, modelId) {
  const value = current(entry)
  if (entry.answer.status !== 'correct' || value?.status !== 'correct' || !value.testedModelIds?.includes(modelId)) return false
  return supports.some(support => {
    const other = current(support), left = level(entry), right = level(support)
    return value.domain === other?.domain && value.scope === other?.scope
      && typeof left === 'number' && left >= 1 && left === right
      && entry.context?.contentSkill && entry.context.contentSkill === support.context?.contentSkill
  })
}

export function buildRuleHypotheses(entries) {
  const groups = new Map()
  for (const entry of entries) {
    const result = current(entry)
    if (entry.answer.status !== 'incorrect' || result?.status !== 'matched') continue
    for (const modelId of new Set(result.matches.map(m => m.modelId))) {
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
  return ordered.map(({ modelId, supports }) => {
    const support = supports.slice(0, 20), first = current(support[0]), match = first.matches.find(m => m.modelId === modelId)
    const probe = support.map(e => current(e).nextProbe).find(p => p?.status === 'proposed')
    const counters = entries.filter(e => comparableRuleCounter(e, support, modelId)).slice(0, 5)
    return { basis: 'rule_candidate', signalCode: modelId, ruleVersion: first.ruleVersion,
      textSv: `${match.reasonSv} Det är en beräknad kandidat, inte en fastställd elevmetod.`,
      supportRefs: support.map(e => e.ref), counterRefs: counters.map(e => e.ref),
      alternativesSv: ['Andra felmodeller kan ge samma svar. Kontrollera originalarbete och en särskiljande fråga.',
        'Hjälp, avbrott eller en felinmatning kan påverka svaren. Rätta slutsvar visar inte i sig självständig metodförståelse.'],
      nextCheckSv: probe ? `Förslag, inte utdelat: ${probe.question.display.text}. ${probe.purposeSv}`
        : support.every(isSpeedTrainingEntry)
          ? 'Mönstret kommer från snabbhetsträning, där målet är att bli snabb. Ingen följdfråga där; upprepas mönstret kan screening av begreppet utan tidspress föreslås.'
          : 'Granska metoden och välj en ny särskiljande fråga. Den granskade frågebanken saknar en oanvänd kontrast för alla aktuella kandidater.' }
  })
}
