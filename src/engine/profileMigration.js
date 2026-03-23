import { inferOperationFromProblemType } from '../lib/mathUtils'
import { groupProblemsByOperationLevel, computeLevelMastery } from '../lib/masteryCalculation'

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

function migrateMasteryFacts(profile) {
  if (profile.masteryFacts && Array.isArray(profile.masteryFacts.facts) && profile.masteryFacts.facts.length > 0) {
    return false // redan migrerad
  }

  const source = Array.isArray(profile.problemLog) && profile.problemLog.length > 0
    ? profile.problemLog
    : (Array.isArray(profile.recentProblems) ? profile.recentProblems : [])

  if (source.length === 0) return false

  const buckets = groupProblemsByOperationLevel(source)
  const facts = []

  for (const entry of buckets.values()) {
    const result = computeLevelMastery(entry.results)
    if (result.isMastered) {
      // Använd timestamp från senaste problemet i bucketen för achievedAt
      const relevantProblems = source.filter(p => {
        const op = inferOperationFromProblemType(p?.problemType || '')
        const lv = Math.round(Number(p?.difficulty?.conceptual_level || 0))
        return op === entry.operation && lv === entry.level
      })
      const latestTs = relevantProblems.reduce((max, p) => {
        const ts = Number(p?.timestamp || 0)
        return ts > max ? ts : max
      }, 0) || Date.now()

      facts.push({
        id: `${entry.operation}:${entry.level}:${latestTs}`,
        operation: entry.operation,
        level: entry.level,
        achievedAt: latestTs,
        window: {
          attempts: result.attempts,
          correct: result.correct,
          rate: result.rate
        },
        source: 'migration'
      })
    }
  }

  profile.masteryFacts = { version: 1, facts, revokedIds: [] }
  return facts.length > 0
}

export function migrateProfileOnLoad(profile) {
  if (!profile || typeof profile !== 'object') return profile

  const recentMigration = migrateProblemList(profile.recentProblems)
  const logMigration = migrateProblemList(profile.problemLog)
  const masteryChanged = migrateMasteryFacts(profile)

  if (!recentMigration.changed && !logMigration.changed && !masteryChanged) {
    return profile
  }

  return {
    ...profile,
    recentProblems: recentMigration.list,
    problemLog: logMigration.list,
    masteryFacts: profile.masteryFacts
  }
}
