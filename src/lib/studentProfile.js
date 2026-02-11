/**
 * StudentProfile - Hanterar elevdata och statistik
 */

import { evaluateAnswerQuality } from './answerQuality'

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
    stats: {
      totalProblems: 0,
      correctAnswers: 0,
      overallSuccessRate: 0,
      avgTimePerProblem: 0,
      typeStats: {},
      weakestTypes: [],
      strongestTypes: []
    }
  }
}

/**
 * Lägg till problemresultat i profil
 */
export function addProblemResult(profile, problem, studentAnswer, timeSpent, options = {}) {
  const correct = isAnswerCorrect(studentAnswer, problem.result)
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
    timeSpent,
    timestamp: Date.now(),
    difficulty: problem.difficulty,
    skillTag: problem.metadata?.skillTag || problem.template,
    selectionReason: problem.metadata?.selectionReason || 'normal',
    difficultyBucket: problem.metadata?.difficultyBucket || 'core',
    targetLevel: problem.metadata?.targetLevel || Math.round(problem.difficulty?.conceptual_level || 1),
    abilityBefore: problem.metadata?.abilityBefore ?? profile.currentDifficulty,
    isReasonable: quality.isReasonable,
    absError: quality.absError,
    relativeError: quality.relativeError,
    tolerance: quality.tolerance,
    // Metadata för analys
    termOrder: problem.metadata?.termOrder || 'equal',
    carryCount: problem.metadata?.carryCount || 0,
    borrowCount: problem.metadata?.borrowCount || 0
  }

  // Lägg till i historik (max 50)
  profile.recentProblems.push(result)
  if (profile.recentProblems.length > 50) {
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

  if (recent.length === 0) {
    profile.stats = {
      totalProblems: 0,
      correctAnswers: 0,
      overallSuccessRate: 0,
      avgTimePerProblem: 0,
      typeStats: {},
      weakestTypes: [],
      strongestTypes: []
    }
    return
  }

  // Basic stats
  profile.stats.totalProblems = recent.length
  profile.stats.correctAnswers = recent.filter(p => p.correct).length
  profile.stats.overallSuccessRate = profile.stats.correctAnswers / profile.stats.totalProblems

  // Genomsnittlig tid
  const times = recent.map(p => p.timeSpent).filter(t => t > 0)
  profile.stats.avgTimePerProblem = times.length > 0
    ? times.reduce((a, b) => a + b, 0) / times.length
    : 0

  // Stats per typ
  const typeMap = {}
  for (const problem of recent) {
    const type = problem.problemType
    if (!typeMap[type]) {
      typeMap[type] = { attempts: 0, correct: 0, totalTime: 0 }
    }
    typeMap[type].attempts++
    if (problem.correct) typeMap[type].correct++
    typeMap[type].totalTime += problem.timeSpent
  }

  // Beräkna success rate per typ
  for (const [type, stats] of Object.entries(typeMap)) {
    typeMap[type].successRate = stats.correct / stats.attempts
    typeMap[type].avgTime = stats.totalTime / stats.attempts
  }
  profile.stats.typeStats = typeMap

  // Identifiera svagheter och styrkor
  const types = Object.entries(typeMap).filter(([_, s]) => s.attempts >= 3)
  types.sort((a, b) => a[1].successRate - b[1].successRate)

  profile.stats.weakestTypes = types.slice(0, 3).map(([type]) => type)
  profile.stats.strongestTypes = types.slice(-3).reverse().map(([type]) => type)
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
