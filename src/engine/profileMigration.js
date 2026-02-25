import { inferOperationFromProblemType } from '../lib/mathUtils'

function normalizeLevel(problem) {
  const explicit = Number(problem?.level)
  if (Number.isFinite(explicit) && explicit > 0) {
    return Math.max(1, Math.min(12, Math.round(explicit)))
  }
  const conceptual = Number(problem?.difficulty?.conceptual_level)
  if (Number.isFinite(conceptual) && conceptual > 0) {
    return Math.max(1, Math.min(12, Math.round(conceptual)))
  }
  return 1
}

function normalizeSkill(problem) {
  const explicit = String(problem?.skill || '').trim()
  if (explicit) return explicit

  const fromType = inferOperationFromProblemType(String(problem?.problemType || ''), {
    fallback: 'addition',
    allowUnknownPrefix: false
  })
  return String(fromType || 'addition')
}

function hasValidMigrationFields(problem) {
  const domain = String(problem?.domain || '').trim()
  const skill = String(problem?.skill || '').trim()
  const level = Number(problem?.level)
  return Boolean(domain && skill && Number.isFinite(level) && level > 0)
}

function migrateProblemEntry(problem) {
  if (!problem || typeof problem !== 'object') return problem

  if (hasValidMigrationFields(problem)) {
    return problem
  }

  const domain = String(problem?.domain || '').trim() || 'arithmetic'
  const skill = normalizeSkill(problem)
  const level = normalizeLevel(problem)

  if (
    String(problem?.domain || '') === domain
    && String(problem?.skill || '') === skill
    && Number(problem?.level || 0) === level
  ) {
    return problem
  }

  return {
    ...problem,
    domain,
    skill,
    level
  }
}

function migrateProblemList(list) {
  if (!Array.isArray(list)) return { list, changed: false }
  let changed = false
  const next = list.map((item) => {
    const migrated = migrateProblemEntry(item)
    if (migrated !== item) changed = true
    return migrated
  })
  return { list: next, changed }
}

export function migrateProfileOnLoad(profile) {
  if (!profile || typeof profile !== 'object') return profile

  const recentMigration = migrateProblemList(profile.recentProblems)
  const logMigration = migrateProblemList(profile.problemLog)

  if (!recentMigration.changed && !logMigration.changed) {
    return profile
  }

  return {
    ...profile,
    recentProblems: recentMigration.list,
    problemLog: logMigration.list
  }
}
