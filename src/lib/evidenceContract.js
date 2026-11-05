import { resolveProblemOperation, resolveProblemParentSkill } from './mathUtils.js'

export const EVIDENCE_RULE_VERSION = 1

export const EVIDENCE_CLASSES = Object.freeze({
  MASTERY_ELIGIBLE: 'mastery_eligible',
  PRACTICE_ONLY: 'practice_only',
  DIAGNOSTIC_ONLY: 'diagnostic_only',
  INVALID: 'invalid'
})

const KNOWN_EVIDENCE_CLASSES = new Set(Object.values(EVIDENCE_CLASSES))

function positiveLevel(value, fallback = null) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric < 1) return fallback
  return Math.max(1, Math.min(12, Math.round(numeric)))
}

export function isTableDrillEvidence(problem) {
  const template = String(problem?.template || problem?.problemType || '').trim()
  const reason = String(problem?.metadata?.selectionReason || problem?.selectionReason || '').trim()
  const skillTag = String(problem?.metadata?.skillTag || problem?.skillTag || '').trim()
  return template === 'mul_table_drill'
    || reason === 'table_drill'
    || reason === 'table_drill_queue'
    || /^mul_table_\d{1,2}$/.test(skillTag)
}

export function readEvidenceClaim(problem) {
  const stored = problem?.metadata?.evidenceClaim
    && typeof problem.metadata.evidenceClaim === 'object'
    ? problem.metadata.evidenceClaim
    : {}

  const contentSkill = String(
    stored.contentSkill
    || problem?.contentSkill
    || resolveProblemParentSkill(problem, { fallback: '' })
    || ''
  ).trim()
  const contentLevel = positiveLevel(
    stored.contentLevel
    ?? problem?.contentLevel
    ?? problem?.level
    ?? problem?.difficulty?.conceptual_level
  )

  // Stored result.operation is the legacy persisted evidence identity. Reading
  // it directly preserves hidden skills that are not presentation operations.
  const evidenceSkill = String(
    stored.skill
    || problem?.evidenceSkill
    || problem?.metadata?.evidenceSkill
    || problem?.operation
    || resolveProblemOperation(problem, { fallback: '', allowUnknownOperation: true })
    || contentSkill
  ).trim()
  const evidenceLevel = positiveLevel(
    stored.level
    ?? problem?.evidenceLevel
    ?? problem?.metadata?.evidenceLevel,
    contentLevel
  )

  const explicitClass = String(
    stored.class
    || problem?.evidenceClass
    || problem?.metadata?.evidenceClass
    || ''
  ).trim()
  const hasEvidenceIdentity = Boolean(evidenceSkill && evidenceSkill !== 'unknown' && evidenceLevel)
  const evidenceClass = KNOWN_EVIDENCE_CLASSES.has(explicitClass)
    ? explicitClass
    : isTableDrillEvidence(problem)
      ? EVIDENCE_CLASSES.PRACTICE_ONLY
      : hasEvidenceIdentity
        ? EVIDENCE_CLASSES.MASTERY_ELIGIBLE
        : EVIDENCE_CLASSES.INVALID

  const version = Math.max(1, Math.round(Number(
    stored.version
    || problem?.evidenceRuleVersion
    || problem?.metadata?.evidenceRuleVersion
    || EVIDENCE_RULE_VERSION
  ) || EVIDENCE_RULE_VERSION))

  return {
    version,
    contentSkill,
    contentLevel,
    skill: evidenceSkill,
    level: evidenceLevel,
    class: evidenceClass
  }
}

export function attachEvidenceClaim(problem, overrides = {}) {
  const base = readEvidenceClaim(problem)
  const next = {
    ...base,
    ...overrides,
    version: Math.max(1, Math.round(Number(overrides.version ?? base.version) || EVIDENCE_RULE_VERSION)),
    contentSkill: String((overrides.contentSkill ?? base.contentSkill) || '').trim(),
    skill: String((overrides.skill ?? base.skill) || '').trim(),
    contentLevel: positiveLevel(overrides.contentLevel, base.contentLevel),
    level: positiveLevel(overrides.level, base.level)
  }
  next.class = KNOWN_EVIDENCE_CLASSES.has(String(next.class || '').trim())
    ? String(next.class).trim()
    : EVIDENCE_CLASSES.INVALID

  return {
    ...problem,
    metadata: {
      ...(problem?.metadata || {}),
      evidenceClaim: next,
      evidenceSkill: next.skill,
      evidenceLevel: next.level,
      evidenceClass: next.class,
      evidenceRuleVersion: next.version
    }
  }
}

export function isMasteryEligible(problem) {
  return readEvidenceClaim(problem).class === EVIDENCE_CLASSES.MASTERY_ELIGIBLE
}

export function classifyEvidenceRecord(problem) {
  const claim = readEvidenceClaim(problem)
  const hasContractFields = Boolean(
    problem?.metadata?.evidenceClaim
    || problem?.evidenceClass
    || problem?.evidenceSkill
    || problem?.evidenceRuleVersion
  )
  return {
    claim,
    provenance: claim.class === EVIDENCE_CLASSES.INVALID
      ? 'unknown'
      : hasContractFields
        ? 'contract'
        : 'legacy_inferred'
  }
}

export function summarizeEvidenceHistory(entries) {
  const summary = {
    total: 0,
    contract: 0,
    legacyClassified: 0,
    unknown: 0,
    masteryEligible: 0,
    practiceOnly: 0,
    diagnosticOnly: 0
  }
  for (const entry of (Array.isArray(entries) ? entries : [])) {
    const { claim, provenance } = classifyEvidenceRecord(entry)
    summary.total += 1
    if (provenance === 'contract') summary.contract += 1
    else if (provenance === 'legacy_inferred') summary.legacyClassified += 1
    else summary.unknown += 1

    if (claim.class === EVIDENCE_CLASSES.MASTERY_ELIGIBLE) summary.masteryEligible += 1
    else if (claim.class === EVIDENCE_CLASSES.PRACTICE_ONLY) summary.practiceOnly += 1
    else if (claim.class === EVIDENCE_CLASSES.DIAGNOSTIC_ONLY) summary.diagnosticOnly += 1
  }
  return summary
}
