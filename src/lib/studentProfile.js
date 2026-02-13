/**
 * StudentProfile - Hanterar elevdata och statistik
 */

import { evaluateAnswerQuality } from './answerQuality'

const MAX_RECENT_PROBLEMS = 250
const ABSOLUTE_TIME_CAP_SECONDS = 180
const INTERRUPTION_HIDDEN_SECONDS = 20
const INTERRUPTION_BLUR_MIN_TIME_SECONDS = 90
const PERSONAL_OUTLIER_FACTOR = 2.8
const MIN_PERSONAL_BASELINE_SAMPLES = 6

/**
 * Generera unikt elev-ID (6 tecken)
 */
export function generateStudentId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'  // Undviker förvirrande tecken (0/O, 1/I/L)
  let id = ''
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return id
}

function createDefaultStats() {
  return {
    totalProblems: 0,
    correctAnswers: 0,
    overallSuccessRate: 0,
    avgTimePerProblem: 0,
    typeStats: {},
    weakestTypes: [],
    strongestTypes: [],
    lifetimeProblems: 0,
    lifetimeCorrectAnswers: 0,
    lifetimeTimeSpent: 0,
    lifetimeSpeedSamples: 0,
    lifetimeSpeedTimeSpent: 0,
    avgSpeedTimePerProblem: 0
  }
}

/**
 * Skapa ny elevprofil
 */
export function createStudentProfile(studentId, name, grade = 4) {
  return {
    studentId,
    name,
    grade,
    created_at: Date.now(),
    currentDifficulty: 1,
    highestDifficulty: 1,
    adaptive: {
      skillStates: {},
      recentSelections: []
    },
    recentProblems: [],
    stats: createDefaultStats()
  }
}

/**
 * Lägg till problemresultat i profil
 */
export function addProblemResult(profile, problem, studentAnswer, timeSpent, options = {}) {
  const correct = isAnswerCorrect(studentAnswer, problem.result)
  const errorCategory = classifyErrorCategory(problem, studentAnswer, correct, options)
  const timing = deriveTimingMetrics(profile, problem, timeSpent, options)
  const quality = evaluateAnswerQuality({
    problemType: problem.template,
    values: problem.values,
    correctAnswer: problem.result,
    studentAnswer,
    difficulty: problem.difficulty
  })

  const result = {
    problemId: problem.id,
    problemType: problem.template,
    values: problem.values,
    correctAnswer: problem.result,
    studentAnswer,
    answerLength: getNormalizedAnswerLength(options.rawAnswer, studentAnswer),
    correct,
    errorCategory,
    isInattentionError: errorCategory === 'inattention',
    isKnowledgeError: !correct && errorCategory !== 'inattention',
    timeSpent: timing.rawTimeSec,
    speedTimeSec: timing.speedTimeSec,
    excludedFromSpeed: timing.excludedFromSpeed,
    speedExclusionReason: timing.exclusionReason,
    interruptionSuspected: timing.interruptionSuspected,
    hiddenDurationSec: timing.hiddenDurationSec,
    blurCount: timing.blurCount,
    personalMedianTimeSec: timing.personalMedianSec,
    personalBaselineCount: timing.personalBaselineCount,
    timestamp: Date.now(),
    difficulty: problem.difficulty,
    skillTag: problem.metadata?.skillTag || problem.template,
    selectionReason: problem.metadata?.selectionReason || 'normal',
    difficultyBucket: problem.metadata?.difficultyBucket || 'core',
    targetLevel: problem.metadata?.targetLevel || Math.round(problem.difficulty?.conceptual_level || 1),
    abilityBefore: problem.metadata?.abilityBefore ?? profile.currentDifficulty,
    progressionMode: problem.metadata?.progressionMode || 'challenge',
    isReasonable: quality.isReasonable,
    absError: quality.absError,
    relativeError: quality.relativeError,
    tolerance: quality.tolerance,
    // Metadata för analys
    termOrder: problem.metadata?.termOrder || 'equal',
    carryCount: problem.metadata?.carryCount || 0,
    borrowCount: problem.metadata?.borrowCount || 0
  }

  const stats = ensureLifetimeStats(profile)
  stats.lifetimeProblems += 1
  if (correct) stats.lifetimeCorrectAnswers += 1
  stats.lifetimeTimeSpent += timing.rawTimeSec
  if (!timing.excludedFromSpeed && Number.isFinite(timing.speedTimeSec)) {
    stats.lifetimeSpeedSamples += 1
    stats.lifetimeSpeedTimeSpent += timing.speedTimeSec
  }

  // Lägg till i historik (rullande fönster för dags/veckovy + adaptiv analys)
  profile.recentProblems.push(result)
  if (profile.recentProblems.length > MAX_RECENT_PROBLEMS) {
    profile.recentProblems.shift()
  }

  // Uppdatera statistik
  updateStats(profile)

  return { correct, result }
}

function getNormalizedAnswerLength(rawAnswer, fallbackNumber) {
  if (typeof rawAnswer === 'string') {
    const normalized = rawAnswer.trim().replace(/,/g, '.').replace('-', '').replace('.', '')
    return normalized.length
  }

  if (!Number.isFinite(fallbackNumber)) return 0
  return String(fallbackNumber).replace('-', '').replace('.', '').length
}

/**
 * Tolerant jämförelse för decimaltal
 */
function isAnswerCorrect(studentAnswer, expectedAnswer) {
  if (!Number.isFinite(studentAnswer) || !Number.isFinite(expectedAnswer)) {
    return false
  }
  return Math.abs(studentAnswer - expectedAnswer) < 0.0001
}

/**
 * Uppdatera statistik baserat på historik
 */
function updateStats(profile) {
  const recent = profile.recentProblems
  const stats = ensureLifetimeStats(profile)

  if (recent.length === 0) {
    profile.stats.totalProblems = stats.lifetimeProblems
    profile.stats.correctAnswers = stats.lifetimeCorrectAnswers
    profile.stats.overallSuccessRate = stats.lifetimeProblems > 0
      ? stats.lifetimeCorrectAnswers / stats.lifetimeProblems
      : 0
    profile.stats.avgTimePerProblem = stats.lifetimeProblems > 0
      ? stats.lifetimeTimeSpent / stats.lifetimeProblems
      : 0
    profile.stats.avgSpeedTimePerProblem = stats.lifetimeSpeedSamples > 0
      ? stats.lifetimeSpeedTimeSpent / stats.lifetimeSpeedSamples
      : 0
    profile.stats.typeStats = {}
    profile.stats.weakestTypes = []
    profile.stats.strongestTypes = []
    return
  }

  // Livstidsstatistik
  profile.stats.totalProblems = stats.lifetimeProblems
  profile.stats.correctAnswers = stats.lifetimeCorrectAnswers
  profile.stats.overallSuccessRate = stats.lifetimeProblems > 0
    ? stats.lifetimeCorrectAnswers / stats.lifetimeProblems
    : 0
  profile.stats.avgTimePerProblem = stats.lifetimeProblems > 0
    ? stats.lifetimeTimeSpent / stats.lifetimeProblems
    : 0
  profile.stats.avgSpeedTimePerProblem = stats.lifetimeSpeedSamples > 0
    ? stats.lifetimeSpeedTimeSpent / stats.lifetimeSpeedSamples
    : 0

  // Rullande fönster-statistik per typ (för adaptiv analys)
  const typeMap = {}
  for (const problem of recent) {
    const type = problem.problemType
    if (!typeMap[type]) {
      typeMap[type] = {
        attempts: 0,
        correct: 0,
        totalTime: 0,
        speedSamples: 0,
        speedTime: 0
      }
    }
    typeMap[type].attempts++
    if (problem.correct) typeMap[type].correct++
    typeMap[type].totalTime += problem.timeSpent
    const speedTime = getSpeedTime(problem)
    if (Number.isFinite(speedTime)) {
      typeMap[type].speedSamples++
      typeMap[type].speedTime += speedTime
    }
  }

  // Beräkna success rate per typ
  for (const [type, stats] of Object.entries(typeMap)) {
    typeMap[type].successRate = stats.correct / stats.attempts
    typeMap[type].avgTime = stats.totalTime / stats.attempts
    typeMap[type].avgSpeedTime = stats.speedSamples > 0
      ? stats.speedTime / stats.speedSamples
      : null
  }
  profile.stats.typeStats = typeMap

  // Identifiera svagheter och styrkor
  const types = Object.entries(typeMap).filter(([_, s]) => s.attempts >= 3)
  types.sort((a, b) => a[1].successRate - b[1].successRate)

  profile.stats.weakestTypes = types.slice(0, 3).map(([type]) => type)
  profile.stats.strongestTypes = types.slice(-3).reverse().map(([type]) => type)
}

function ensureLifetimeStats(profile) {
  if (!profile.stats || typeof profile.stats !== 'object') {
    profile.stats = createDefaultStats()
  }

  const stats = profile.stats
  const recentCount = Array.isArray(profile.recentProblems) ? profile.recentProblems.length : 0
  const fallbackTotal = Number.isFinite(Number(stats.totalProblems))
    ? Number(stats.totalProblems)
    : 0
  const fallbackCorrect = Number.isFinite(Number(stats.correctAnswers))
    ? Number(stats.correctAnswers)
    : 0
  const fallbackAvgTime = Number.isFinite(Number(stats.avgTimePerProblem))
    ? Number(stats.avgTimePerProblem)
    : 0

  if (!Number.isFinite(Number(stats.lifetimeProblems))) {
    stats.lifetimeProblems = Math.max(0, Math.max(fallbackTotal, recentCount))
  }

  if (!Number.isFinite(Number(stats.lifetimeCorrectAnswers))) {
    stats.lifetimeCorrectAnswers = Math.max(
      0,
      Math.min(stats.lifetimeProblems, Math.max(fallbackCorrect, 0))
    )
  }

  if (!Number.isFinite(Number(stats.lifetimeTimeSpent))) {
    stats.lifetimeTimeSpent = Math.max(0, fallbackAvgTime * stats.lifetimeProblems)
  }
  const fallbackAvgSpeed = Number.isFinite(Number(stats.avgSpeedTimePerProblem))
    ? Number(stats.avgSpeedTimePerProblem)
    : fallbackAvgTime
  if (!Number.isFinite(Number(stats.lifetimeSpeedSamples))) {
    stats.lifetimeSpeedSamples = Math.max(0, stats.lifetimeProblems)
  }
  if (!Number.isFinite(Number(stats.lifetimeSpeedTimeSpent))) {
    stats.lifetimeSpeedTimeSpent = Math.max(0, fallbackAvgSpeed * stats.lifetimeSpeedSamples)
  }

  if (!stats.typeStats || typeof stats.typeStats !== 'object') {
    stats.typeStats = {}
  }
  if (!Array.isArray(stats.weakestTypes)) {
    stats.weakestTypes = []
  }
  if (!Array.isArray(stats.strongestTypes)) {
    stats.strongestTypes = []
  }

  return stats
}

/**
 * Hämta success rate för senaste N problem
 */
export function getRecentSuccessRate(profile, count = 10) {
  const recent = profile.recentProblems.slice(-count)
  if (recent.length === 0) return 0.5  // Default
  const correct = recent.filter(p => p.correct).length
  return correct / recent.length
}

/**
 * Hämta antal fel i rad
 */
export function getConsecutiveErrors(profile) {
  let count = 0
  for (let i = profile.recentProblems.length - 1; i >= 0; i--) {
    if (!profile.recentProblems[i].correct) {
      count++
    } else {
      break
    }
  }
  return count
}

/**
 * Hämta antal rätt i rad (streak)
 */
export function getCurrentStreak(profile) {
  let count = 0
  for (let i = profile.recentProblems.length - 1; i >= 0; i--) {
    if (profile.recentProblems[i].correct) {
      count++
    } else {
      break
    }
  }
  return count
}

/**
 * Summera elevens stabila nivåer per räknesätt.
 * Regel: minst 5 försök på nivån och minst 80% rätt (kan styras via options).
 */
export function getMasteryOverview(profile, options = {}) {
  const minAttempts = options.minAttempts ?? 5
  const minSuccessRate = options.minSuccessRate ?? 0.8
  const since = options.since ?? null

  const buckets = {}

  for (const result of profile.recentProblems) {
    if (since && result.timestamp < since) continue

    const operation = inferOperation(result.problemType)
    const level = result.difficulty?.conceptual_level
    if (!level) continue

    const key = `${operation}:${level}`
    if (!buckets[key]) {
      buckets[key] = {
        operation,
        level,
        attempts: 0,
        correct: 0
      }
    }
    buckets[key].attempts++
    if (result.correct) buckets[key].correct++
  }

  const mastery = {}

  for (const entry of Object.values(buckets)) {
    if (entry.attempts < minAttempts) continue
    const success = entry.correct / entry.attempts
    if (success >= minSuccessRate) {
      if (!mastery[entry.operation]) mastery[entry.operation] = []
      mastery[entry.operation].push(entry.level)
    }
  }

  for (const op of Object.keys(mastery)) {
    mastery[op] = [...new Set(mastery[op])].sort((a, b) => a - b)
  }

  return mastery
}

export function getMasteryForOperation(profile, operation, options = {}) {
  const all = getMasteryOverview(profile, options)
  return all[operation] || []
}

export function getStartOfWeekTimestamp() {
  const now = new Date()
  const day = now.getDay() // 0 = söndag, 1 = måndag
  const diffToMonday = day === 0 ? 6 : day - 1
  now.setDate(now.getDate() - diffToMonday)
  now.setHours(0, 0, 0, 0)
  return now.getTime()
}

function inferOperation(problemType = '') {
  if (problemType.startsWith('add_')) return 'addition'
  if (problemType.startsWith('mul_')) return 'multiplication'
  if (problemType.startsWith('sub_')) return 'subtraction'
  if (problemType.startsWith('div_')) return 'division'

  // För framtida räknesätt: använd prefix före första underscore.
  const [prefix] = String(problemType).split('_')
  return prefix || 'unknown'
}

function deriveTimingMetrics(profile, problem, timeSpent, options = {}) {
  const rawTimeSec = Math.max(0, Number(timeSpent) || 0)
  const hiddenDurationSec = Math.max(0, Number(options?.interruption?.hiddenDurationSec) || 0)
  const blurCount = Math.max(0, Number(options?.interruption?.blurCount) || 0)
  const interruptionSuspected = hiddenDurationSec >= INTERRUPTION_HIDDEN_SECONDS
    || (blurCount > 0 && rawTimeSec >= INTERRUPTION_BLUR_MIN_TIME_SECONDS)
  const baselineTimes = getPersonalBaselineTimes(profile, problem)
  const personalMedianSec = median(baselineTimes)
  const personalBaselineCount = baselineTimes.length

  let excludedFromSpeed = false
  let exclusionReason = null

  if (rawTimeSec <= 0) {
    excludedFromSpeed = true
    exclusionReason = 'invalid_time'
  } else if (rawTimeSec > ABSOLUTE_TIME_CAP_SECONDS) {
    excludedFromSpeed = true
    exclusionReason = 'hard_cap'
  } else if (interruptionSuspected) {
    excludedFromSpeed = true
    exclusionReason = 'interruption'
  } else if (
    personalBaselineCount >= MIN_PERSONAL_BASELINE_SAMPLES
    && Number.isFinite(personalMedianSec)
    && rawTimeSec > Math.max(45, personalMedianSec * PERSONAL_OUTLIER_FACTOR)
  ) {
    excludedFromSpeed = true
    exclusionReason = 'personal_outlier'
  }

  return {
    rawTimeSec,
    speedTimeSec: excludedFromSpeed ? null : rawTimeSec,
    excludedFromSpeed,
    exclusionReason,
    interruptionSuspected,
    hiddenDurationSec,
    blurCount,
    personalMedianSec,
    personalBaselineCount
  }
}

function getPersonalBaselineTimes(profile, problem) {
  const recent = Array.isArray(profile?.recentProblems) ? profile.recentProblems : []
  if (recent.length === 0) return []

  const skillTag = String(problem?.metadata?.skillTag || problem?.template || '')
  const templateId = String(problem?.template || '')
  const level = Math.round(Number(problem?.difficulty?.conceptual_level || 1))
  const operation = inferOperation(templateId)

  const valid = recent.filter(item => Number.isFinite(getSpeedTime(item)))

  const bySkill = valid.filter(item => {
    const itemLevel = Math.round(Number(item?.difficulty?.conceptual_level || item?.targetLevel || 1))
    return String(item.skillTag || '') === skillTag && itemLevel === level
  })
  if (bySkill.length >= 4) {
    return bySkill.slice(-20).map(item => getSpeedTime(item)).filter(Number.isFinite)
  }

  const byOperationLevel = valid.filter(item => {
    const itemLevel = Math.round(Number(item?.difficulty?.conceptual_level || item?.targetLevel || 1))
    return inferOperation(item.problemType) === operation && itemLevel === level
  })
  if (byOperationLevel.length > 0) {
    return byOperationLevel.slice(-25).map(item => getSpeedTime(item)).filter(Number.isFinite)
  }

  return valid.slice(-25).map(item => getSpeedTime(item)).filter(Number.isFinite)
}

function getSpeedTime(problem) {
  const speed = Number(problem?.speedTimeSec)
  if (Number.isFinite(speed) && speed > 0) return speed
  if (problem?.excludedFromSpeed) return null
  const raw = Number(problem?.timeSpent)
  if (Number.isFinite(raw) && raw > 0) return raw
  return null
}

function classifyErrorCategory(problem, studentAnswer, correct, options = {}) {
  if (correct) return 'none'
  if (!options?.isMixedMode) return 'knowledge'

  const a = Number(problem?.values?.a)
  const b = Number(problem?.values?.b)
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 'knowledge'

  if (problem?.type === 'subtraction') {
    const inattentiveCandidate = a + b
    if (Math.abs(studentAnswer - inattentiveCandidate) < 0.0001) {
      return 'inattention'
    }
  }

  return 'knowledge'
}

function median(values) {
  const clean = (Array.isArray(values) ? values : [])
    .map(Number)
    .filter(value => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b)

  if (clean.length === 0) return null
  const middle = Math.floor(clean.length / 2)
  if (clean.length % 2 === 0) {
    return (clean[middle - 1] + clean[middle]) / 2
  }
  return clean[middle]
}
