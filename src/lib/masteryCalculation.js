/**
 * Kanonisk mastery-beräkning.
 * ALLA vyer (elev, lärare, adaptiv motor) använder dessa funktioner.
 * Ändra HÄR — inte i enskilda vyer.
 */
import { inferOperationFromProblemType } from './mathUtils'
import { getOperationMinLevel } from './operations'
import { MASTERY_MIN_ATTEMPTS, MASTERY_MIN_SUCCESS_RATE } from './operations'

export const MASTERY_WINDOW = 15

/**
 * Beräkna mastery för en nivå givet en lista med resultat (boolean/0/1).
 * Returnerar { attempts, correct, rate, isMastered }.
 */
export function computeLevelMastery(results, options = {}) {
  const windowSize = options.windowSize ?? MASTERY_WINDOW
  const minAttempts = options.minAttempts ?? MASTERY_MIN_ATTEMPTS
  const minSuccessRate = options.minSuccessRate ?? MASTERY_MIN_SUCCESS_RATE

  const windowed = results.slice(-windowSize)
  const attempts = windowed.length
  const correct = windowed.reduce((sum, v) => sum + (v ? 1 : 0), 0)
  const rate = attempts > 0 ? correct / attempts : 0

  return {
    attempts,
    correct,
    rate,
    isMastered: attempts >= minAttempts && rate >= minSuccessRate
  }
}

/**
 * Hämta bästa tillgängliga problem-källa för en profil/student.
 * Föredrar problemLog (5000) framför recentProblems (250).
 */
export function getPreferredProblemSource(profile) {
  const problemLog = Array.isArray(profile?.problemLog) ? profile.problemLog : []
  const recentProblems = Array.isArray(profile?.recentProblems) ? profile.recentProblems : []

  if (problemLog.length === 0) return recentProblems
  if (recentProblems.length === 0) return problemLog

  const logLatest = getLatestTimestamp(problemLog)
  const recentLatest = getLatestTimestamp(recentProblems)
  if (recentLatest > logLatest) return recentProblems
  if (logLatest > recentLatest) return problemLog
  return problemLog.length >= recentProblems.length ? problemLog : recentProblems
}

function getLatestTimestamp(list) {
  let max = 0
  for (const item of list) {
    const ts = Number(item?.timestamp || 0)
    if (Number.isFinite(ts) && ts > max) max = ts
  }
  return max
}

/**
 * Gruppera problems per operation+nivå → lista av correct-booleans.
 * Returnerar Map<string, { operation, level, results: boolean[] }>
 */
export function groupProblemsByOperationLevel(problems) {
  const buckets = new Map()
  for (const problem of problems) {
    const operation = inferOperationFromProblemType(problem?.problemType || '')
    const rawLevel = Number(problem?.difficulty?.conceptual_level)
    if (!Number.isFinite(rawLevel) || rawLevel < 1) continue
    const level = Math.round(rawLevel)
    if (level > 12) continue

    const key = `${operation}:${level}`
    if (!buckets.has(key)) {
      buckets.set(key, { operation, level, results: [] })
    }
    buckets.get(key).results.push(Boolean(problem.correct))
  }
  return buckets
}

/**
 * Full mastery-översikt: vilka nivåer per operation är mastrade?
 * Returnerar { [operation]: [mastered level numbers] }
 */
export function computeMasteryOverview(problems, options = {}) {
  const buckets = groupProblemsByOperationLevel(problems)
  const mastery = {}

  for (const entry of buckets.values()) {
    const result = computeLevelMastery(entry.results, options)
    if (result.isMastered) {
      if (!mastery[entry.operation]) mastery[entry.operation] = []
      mastery[entry.operation].push(entry.level)
    }
  }

  for (const op of Object.keys(mastery)) {
    mastery[op] = [...new Set(mastery[op])].sort((a, b) => a - b)
  }

  return mastery
}

/**
 * Hämta mastrade nivåer för en specifik operation.
 */
export function computeMasteryForOperation(problems, operation, options = {}) {
  const all = computeMasteryOverview(problems, options)
  return all[operation] || []
}

/**
 * Hitta lägsta omastrade nivå för en operation.
 * Används som "golv" i adaptiv träning.
 */
export function computeLowestUnmasteredLevel(problems, operation, options = {}) {
  const maxLevel = options.maxLevel ?? 12
  const mastered = computeMasteryForOperation(problems, operation, options)
  const masteredSet = new Set(mastered)
  const minLevel = getOperationMinLevel(operation)
  for (let level = minLevel; level <= maxLevel; level++) {
    if (!masteredSet.has(level)) return level
  }
  return maxLevel
}

/**
 * Bygg mastery-status för en specifik operation+nivå.
 * Används i session-vyn för level-focus.
 */
export function computeOperationLevelMasteryStatus(problems, operation, level, options = {}) {
  const filtered = problems.filter(item => {
    const itemOp = inferOperationFromProblemType(item?.problemType || '')
    const itemLevel = Math.round(Number(item?.difficulty?.conceptual_level || 0))
    return itemOp === operation && itemLevel === level
  })

  return computeLevelMastery(filtered.map(p => Boolean(p.correct)), options)
}

/**
 * Bygg "effective levels" — högsta konsekutivt mastrade nivå per operation.
 * Används i klassöversikten (Nivåöversikt).
 */
export function computeEffectiveLevels(problems, operationKeys, levelRange, options = {}) {
  const buckets = groupProblemsByOperationLevel(problems)
  const result = {}

  for (const op of operationKeys) {
    result[op] = 0
    for (const level of levelRange) {
      const key = `${op}:${level}`
      const bucket = buckets.get(key)
      if (!bucket || bucket.results.length < (options.minAttempts ?? MASTERY_MIN_ATTEMPTS)) break
      const mastery = computeLevelMastery(bucket.results, options)
      if (!mastery.isMastered) break
      result[op] = level
    }
  }

  return result
}

/**
 * Bygg detaljerade mastery-tavlor per operation (historik/vecka/månad).
 * Används i lärarvyn (elevdetalj, framsteg).
 */
export function computeOperationMasteryBoards(problems, operationKeys, levelRange, options = {}) {
  const DAY_MS = 24 * 60 * 60 * 1000
  const now = Date.now()
  const weekStart = getStartOfWeekTimestamp()
  const monthStart = now - 30 * DAY_MS

  const lists = Object.fromEntries(
    operationKeys.map(op => [op, Object.fromEntries(
      levelRange.map(lv => [lv, { all: [], week: [], month: [] }])
    )])
  )

  for (const problem of problems) {
    const operation = inferOperationFromProblemType(problem?.problemType || '')
    if (!lists[operation]) continue
    const level = Math.round(Number(problem?.difficulty?.conceptual_level || 0))
    if (!Number.isInteger(level) || level < 1 || level > 12) continue

    const correct = Boolean(problem.correct)
    lists[operation][level].all.push(correct)

    const ts = Number(problem.timestamp || 0)
    if (ts >= monthStart) lists[operation][level].month.push(correct)
    if (ts >= weekStart) lists[operation][level].week.push(correct)
  }

  return operationKeys.map(operation => ({
    operation,
    historical: levelRange.map(level => buildMasteryView(level, lists[operation][level].all, options)),
    weekly: levelRange.map(level => buildMasteryView(level, lists[operation][level].week, options)),
    monthly: levelRange.map(level => buildMasteryView(level, lists[operation][level].month, options))
  }))
}

function buildMasteryView(level, results, options = {}) {
  const attempts = results.length
  const correct = results.reduce((s, v) => s + (v ? 1 : 0), 0)
  const successRate = attempts > 0 ? correct / attempts : 0

  const mastery = computeLevelMastery(results, options)

  const isStarted = attempts > 0
  const status = mastery.isMastered ? 'mastered' : (isStarted ? 'started' : 'empty')

  return {
    level,
    attempts,
    correct,
    successRate,
    masteryAttempts: mastery.attempts,
    masteryCorrect: mastery.correct,
    status,
    metricsLabel: isStarted ? `${correct}/${attempts}` : '-',
    title: isStarted
      ? `Nivå ${level}: ${correct}/${attempts} (${Math.round(successRate * 100)}%)`
      : `Nivå ${level}: ej startad`
  }
}

function getStartOfWeekTimestamp() {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? 6 : day - 1
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff)
  return monday.getTime()
}
