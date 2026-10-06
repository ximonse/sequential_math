import { createStudentProfile } from './studentProfile.js'
import { withFreshTeacherSummary } from './teacherSummary.js'

export const LOCAL_TEST_DATA_FORMAT = 'sequential-math-test-class-v1'
const MAX_STUDENTS = 80
const MAX_ATTEMPTS = 5000
const NAMES = [
  'Alma Lind', 'Hugo Berg', 'Maja Holm', 'Elias Dahl', 'Elsa Lund',
  'Noah Ek', 'Saga Nyström', 'Olle Vik', 'Vera Sand', 'Leo Blom',
  'Ella Borg', 'Arvid Falk', 'Nora Ström', 'William Hed', 'Freja Sjö',
  'Anton Alm', 'Tilda Ros', 'Adam Gran', 'Livia Ås', 'Melvin Nord',
  'Signe Back', 'Oscar Hult', 'Iris Hall', 'Felix Löv', 'Mira West',
  'Liam Eng', 'Selma Dal', 'Edvin Sten', 'Alicia Fors', 'Nils Lindqvist'
]
function anonymousName(index) {
  if (index < NAMES.length) return NAMES[index]
  const firstName = NAMES[index % NAMES.length].split(' ')[0]
  return `${firstName} ${index < NAMES.length * 2 ? 'Sund' : 'Wahl'}`
}
import { safeAttempt, answerSource } from './analysisHistorySanitizer.js'

export function buildAnonymizedClassExport(profiles, now = Date.now()) {
  if (!Array.isArray(profiles) || profiles.length === 0 || profiles.length > MAX_STUDENTS) {
    throw new Error('Välj en klass med 1–80 elever.')
  }
  let last = 0
  for (const profile of profiles) {
    for (const item of answerSource(profile)) {
      const value = Number(item?.timestamp)
      if (Number.isFinite(value) && value > last) last = value
    }
    for (const item of (Array.isArray(profile?.tableDrill?.completions) ? profile.tableDrill.completions : [])) {
      const value = Number(item?.timestamp)
      if (Number.isFinite(value) && value > last) last = value
    }
  }
  if (!last) last = now
  // Shift the entire class by the same offset: relative progress survives, real dates do not.
  const shift = now - 24 * 60 * 60 * 1000 - last
  return {
    format: LOCAL_TEST_DATA_FORMAT,
    className: 'Testklass',
    students: profiles.map((profile, index) => {
      const source = answerSource(profile)
      if (source.length > MAX_ATTEMPTS) throw new Error('En elev har fler än 5 000 sparade svar.')
      const lifetime = Number(profile?.stats?.lifetimeProblems ?? profile?.stats?.totalProblems)
      const attempts = source.map(item => safeAttempt(item, Number(item?.timestamp) + shift)).filter(Boolean)
      const completions = (Array.isArray(profile?.tableDrill?.completions) ? profile.tableDrill.completions : [])
        .map(item => ({ table: Number(item?.table), timestamp: Number(item?.timestamp) + shift }))
        .filter(item => Number.isInteger(item.table) && item.table >= 2 && item.table <= 12 && Number.isFinite(item.timestamp) && item.timestamp > 0)
      return {
        name: anonymousName(index),
        grade: Number.isInteger(Number(profile?.grade)) ? Number(profile.grade) : 6,
        historyComplete: (Array.isArray(profile?.problemLog) && (profile.problemLog.length > 0 || source.length === 0))
          && source.length < MAX_ATTEMPTS && Number.isFinite(lifetime) && lifetime <= source.length && attempts.length === source.length,
        attempts,
        completions
      }
    })
  }
}

export function createImportedTestClass(data, classId) {
  if (data?.format !== LOCAL_TEST_DATA_FORMAT || !Array.isArray(data.students) || data.students.length === 0 || data.students.length > MAX_STUDENTS) {
    throw new Error('Filen har inte rätt testdataformat eller elevantal.')
  }
  const profiles = data.students.map((raw, index) => {
    if (!Array.isArray(raw?.attempts) || raw.attempts.length > MAX_ATTEMPTS) throw new Error('Ogiltig eller för stor svarshistorik.')
    const studentId = `TEST${String(classId).replace(/[^a-z0-9]/gi, '').slice(-8).toUpperCase()}${String(index + 1).padStart(2, '0')}`
    const name = anonymousName(index)
    const grade = Number.isInteger(Number(raw.grade)) && Number(raw.grade) >= 1 && Number(raw.grade) <= 12 ? Number(raw.grade) : 6
    const profile = createStudentProfile(studentId, name, grade)
    profile.displayAlias = name
    profile.classId = classId
    profile.classIds = [classId]
    profile.className = `Testklass ${String(classId).slice(-4)}`
    profile.importHistoryComplete = raw.historyComplete === true
    profile.problemLog = raw.attempts.map((item, rowIndex) => {
      const safe = safeAttempt(item, Number(item?.timestamp))
      if (!safe) throw new Error('Filen innehåller ett ogiltigt svar.')
      return { ...safe, observationId: `${studentId}:${rowIndex}`, problemId: `${studentId}:problem:${rowIndex}` }
    }).sort((a, b) => a.timestamp - b.timestamp)
    profile.recentProblems = profile.problemLog.slice(-250)
    const completions = Array.isArray(raw.completions) ? raw.completions : []
    profile.tableDrill = { completions: completions.map(item => ({ table: Number(item?.table), timestamp: Number(item?.timestamp) }))
      .filter(item => Number.isInteger(item.table) && item.table >= 2 && item.table <= 12 && Number.isFinite(item.timestamp) && item.timestamp > 0) }
    const count = profile.problemLog.length
    const correct = profile.problemLog.filter(item => item.correct).length
    const totalTime = profile.problemLog.reduce((sum, item) => sum + (Number(item.timeSpent) || 0), 0)
    const speedRows = profile.problemLog.filter(item => !item.excludedFromSpeed && Number.isFinite(item.speedTimeSec))
    const speedTime = speedRows.reduce((sum, item) => sum + item.speedTimeSec, 0)
    const typeStats = {}
    for (const item of profile.recentProblems) {
      const type = String(item.problemType || item.operation || 'unknown')
      const bucket = typeStats[type] || { attempts: 0, correct: 0, totalTime: 0, speedSamples: 0, speedTime: 0 }
      bucket.attempts += 1
      if (item.correct) bucket.correct += 1
      bucket.totalTime += Number(item.timeSpent) || 0
      if (!item.excludedFromSpeed && Number.isFinite(item.speedTimeSec)) {
        bucket.speedSamples += 1
        bucket.speedTime += item.speedTimeSec
      }
      typeStats[type] = bucket
    }
    for (const bucket of Object.values(typeStats)) {
      bucket.successRate = bucket.correct / bucket.attempts
      bucket.avgTime = bucket.totalTime / bucket.attempts
      bucket.avgSpeedTime = bucket.speedSamples ? bucket.speedTime / bucket.speedSamples : null
    }
    const rankedTypes = Object.entries(typeStats).filter(([, bucket]) => bucket.attempts >= 3)
      .sort((a, b) => a[1].successRate - b[1].successRate)
    profile.stats = {
      ...profile.stats,
      totalProblems: count, correctAnswers: correct, overallSuccessRate: count ? correct / count : 0,
      avgTimePerProblem: count ? totalTime / count : 0,
      lifetimeProblems: count, lifetimeCorrectAnswers: correct, lifetimeTimeSpent: totalTime,
      lifetimeSpeedSamples: speedRows.length, lifetimeSpeedTimeSpent: speedTime,
      avgSpeedTimePerProblem: speedRows.length ? speedTime / speedRows.length : 0,
      typeStats,
      weakestTypes: rankedTypes.slice(0, 3).map(([type]) => type),
      strongestTypes: rankedTypes.slice(-3).reverse().map(([type]) => type)
    }
    return withFreshTeacherSummary(profile)
  })
  const classRecord = { id: classId, name: `Testklass ${String(classId).slice(-4)}`, studentIds: profiles.map(profile => profile.studentId) }
  return { classRecord, profiles }
}
