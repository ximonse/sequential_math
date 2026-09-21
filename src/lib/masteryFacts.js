export function isContractMasteryFact(fact) {
  const id = String(fact?.id || '').trim()
  const operation = String(fact?.operation || '').trim()
  const level = Number(fact?.level)
  const achievedAt = Number(fact?.achievedAt)
  const ruleVersion = Number(fact?.ruleVersion)
  const evidenceObservationIds = Array.isArray(fact?.evidenceObservationIds)
    ? fact.evidenceObservationIds.map(value => String(value || '').trim()).filter(Boolean)
    : []

  return Boolean(id)
    && Boolean(operation)
    && Number.isInteger(level)
    && level >= 1
    && level <= 12
    && Number.isFinite(achievedAt)
    && achievedAt > 0
    && Number.isInteger(ruleVersion)
    && ruleVersion >= 1
    && evidenceObservationIds.length > 0
}

export function summarizeMasteryFactAuthority(profile) {
  const facts = Array.isArray(profile?.masteryFacts?.facts) ? profile.masteryFacts.facts : []
  const revoked = new Set(Array.isArray(profile?.masteryFacts?.revokedIds)
    ? profile.masteryFacts.revokedIds
    : [])
  const summary = { total: 0, contract: 0, legacy: 0, revoked: 0 }

  for (const fact of facts) {
    summary.total += 1
    if (revoked.has(fact?.id)) summary.revoked += 1
    else if (isContractMasteryFact(fact)) summary.contract += 1
    else summary.legacy += 1
  }
  return summary
}
