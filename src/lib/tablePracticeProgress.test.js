import { describe, expect, it } from 'vitest'
import { buildTablePracticeHistory, buildTablePracticeProgress } from './tablePracticeProgress'
import { getStockholmDateKey, getStockholmDaysAgoStart } from './teacherEvidencePeriods'

const now = Date.parse('2026-03-30T12:00:00Z')

function drill(overrides = {}) {
  return {
    problemType: 'mul_table_drill',
    skillTag: 'mul_table_7',
    values: { a: 7, b: 4 },
    correct: true,
    timestamp: now,
    ...overrides
  }
}

function profile(problemLog = [], overrides = {}) {
  return {
    problemLog,
    recentProblems: problemLog.slice(-250),
    stats: { lifetimeProblems: problemLog.length },
    ...overrides
  }
}

function historyWith(dayRecords = {}) {
  const p = profile()
  const history = buildTablePracticeHistory(p, now)
  history.days = history.days.map(day => ({ ...day, tables: dayRecords[day.date] || {} }))
  return history
}

function student(studentId, history, name = studentId) {
  return { studentId, name, teacherSummary: { tablePractice: history } }
}

describe('table practice evidence summaries', () => {
  it('distinguishes equal correct totals, accuracy and typical speed without letting an outlier dominate', () => {
    const fast = Array.from({ length: 30 }, (_, i) => drill({ correct: i < 20, speedTimeSec: 2 }))
    const careful = Array.from({ length: 20 }, (_, i) => drill({ speedTimeSec: i === 0 ? 900 : 5 }))
    const result = buildTablePracticeProgress([
      student('fast', buildTablePracticeHistory(profile(fast), now)),
      student('careful', buildTablePracticeHistory(profile(careful), now))
    ], { now, studentId: 'careful' })
    expect(result.selectedStudent.current).toMatchObject({ attempts: 20, correct: 20, accuracy: 1, medianTimeSec: 5 })
    expect(result.cohort.current).toMatchObject({ attempts: 30, correct: 20, accuracy: 2 / 3, medianTimeSec: 2 })
  })

  it('keeps older table answers beyond recent250 and aligns stale days without shifting dates', () => {
    const older = drill({ timestamp: getStockholmDaysAgoStart(now, 3) + 3600000 })
    const otherTable = Array.from({ length: 260 }, () => drill({ skillTag: 'mul_table_8', values: { a: 8, b: 4 } }))
    const history = buildTablePracticeHistory(profile([older, ...otherTable]), now)
    const result = buildTablePracticeProgress([student('a', history)], { table: 7, now })
    expect(result.cohort.current.attempts).toBe(1)
    const yesterday = buildTablePracticeHistory(profile([older]), getStockholmDaysAgoStart(now, 1) + 3600000)
    const stale = buildTablePracticeProgress([student('a', yesterday)], { now, studentId: 'a' })
    expect(stale.selectedStudent.historyComplete).toBe(false)
    expect(stale.selectedStudent.daily.find(day => day.date === getStockholmDateKey(older.timestamp)).attempts).toBe(1)
    expect(stale.selectedStudent.daily.at(-1).attempts).toBe(0)
  })
  it('uses 28 inclusive Stockholm calendar dates across the spring DST boundary', () => {
    const history = buildTablePracticeHistory(profile(), now)
    expect(history.days).toHaveLength(28)
    expect(history.days[0].date).toBe('2026-03-03')
    expect(history.days.at(-1).date).toBe(getStockholmDateKey(now))
    expect(history.days.filter(day => day.date === '2026-03-29')).toHaveLength(1)
  })

  it('counts only explicitly identifiable table drills and ignores ordinary multiplication', () => {
    const ordinary = drill({ problemType: 'mul_1d_1d_easy', skillTag: 'multiplication', selectionReason: 'normal' })
    const history = buildTablePracticeHistory(profile([ordinary, drill()]), now)
    const today = history.days.at(-1)
    expect(today.tables['7'].attempts).toBe(1)
    expect(history.exclusions.nonTableDrill).toBe(1)
  })

  it('accepts legacy table-drill markers and uses the tagged table with reversed operands', () => {
    const legacy = drill({
      problemType: 'mul_1d_1d_easy',
      skillTag: 'mul_table_7',
      trainingMode: 'table_drill',
      values: { a: 3, b: 7 }
    })
    const history = buildTablePracticeHistory(profile([legacy]), now)
    expect(history.days.at(-1).tables['7'].attempts).toBe(1)
    expect(history.days.at(-1).tables['7'].factors['3']).toEqual({ attempts: 1, correct: 1 })
  })

  it('keeps factor coverage and valid correct speed samples separate from attempts', () => {
    const records = [
      drill({ values: { a: 7, b: 1 }, speedTimeSec: 4 }),
      drill({ values: { a: 7, b: 2 }, correct: false, speedTimeSec: 2 }),
      drill({ values: { a: 3, b: 7 }, speedTimeSec: 8, interruptionSuspected: true }),
      drill({ values: { a: 7, b: 4 }, speedTimeSec: 0 }),
      drill({ values: { a: 7, b: 5 }, speedTimeSec: 6, excludedFromSpeed: true })
    ]
    const table = buildTablePracticeHistory(profile(records), now).days.at(-1).tables['7']
    expect(table.attempts).toBe(5)
    expect(table.correct).toBe(4)
    expect(table.factors['1'].attempts).toBe(1)
    expect(table.factors['3'].attempts).toBe(1)
    expect(table.factors['3'].correct).toBe(1)
    expect(table.correctSpeedTimes).toEqual([4])
    const summary = buildTablePracticeProgress([student('a', buildTablePracticeHistory(profile(records), now))], { table: 7, now }).students[0].current
    expect(summary.factorsCorrect).toBe(4)
    expect(summary.factorCorrectCounts['2']).toBe(0)
  })

  it('marks fallback, capped, and lifetime-exceeding logs incomplete', () => {
    const fallback = buildTablePracticeHistory(profile([], { problemLog: [], recentProblems: [drill()] }), now)
    expect(fallback.source).toBe('recentProblems')
    expect(fallback.historyComplete).toBe(false)
    const capped = buildTablePracticeHistory(profile(Array.from({ length: 5000 }, () => drill())), now)
    expect(capped.exclusions.logAtCap).toBe(1)
    expect(capped.historyComplete).toBe(false)
    const short = buildTablePracticeHistory(profile([drill()], { stats: { lifetimeProblems: 9 } }), now)
    expect(short.exclusions.lifetimeExceedsStored).toBe(1)
    expect(short.historyComplete).toBe(false)
  })

  it('counts saved table-round completions independently from accuracy', () => {
    const p = profile([], { tableDrill: { completions: [{ table: 7, timestamp: now }, { table: 13, timestamp: now }] } })
    const history = buildTablePracticeHistory(p, now)
    expect(history.days.at(-1).tables['7'].completions).toBe(1)
    expect(history.exclusions.invalidCompletion).toBe(1)
  })

  it('uses answer-weighted cohort rates and excludes the selected student from peers', () => {
    const day = getStockholmDateKey(now)
    const bucket = (attempts, correct) => ({ attempts, correct, completions: 0, correctSpeedTimes: [], factors: {} })
    const historyA = historyWith({ [day]: { '7': bucket(10, 10) } })
    const historyB = historyWith({ [day]: { '7': bucket(1, 0) } })
    const historyC = historyWith({ [day]: { '7': bucket(3, 1) } })
    const result = buildTablePracticeProgress([
      student('selected', historyA), student('peer-a', historyB), student('peer-b', historyC)
    ], { table: 7, days: 7, studentId: 'selected', now })
    expect(result.selectedStudent.current.accuracy).toBe(1)
    expect(result.cohort.current.accuracy).toBe(0.25)
    expect(result.cohort.current.attempts).toBe(4)
    expect(result.cohort.includedStudents).toBe(2)
    expect(result.daily.at(-1).student.attempts).toBe(10)
    expect(result.daily.at(-1).peers.attempts).toBe(4)
  })

  it('returns 7- and 14-day periods and keeps missing or stale DTOs unknown', () => {
    const p = profile()
    const history = buildTablePracticeHistory(p, now)
    const seven = buildTablePracticeProgress([student('a', history), { studentId: 'old' }], { days: 7, now })
    const fourteen = buildTablePracticeProgress([student('a', history)], { days: 14, now })
    expect(seven.periods.currentStart).toBe(getStockholmDateKey(getStockholmDaysAgoStart(now, 6)))
    expect(seven.periods.previousStart).toBe(getStockholmDateKey(getStockholmDaysAgoStart(now, 13)))
    expect(fourteen.daily).toHaveLength(14)
    expect(seven.students.find(item => item.studentId === 'old').available).toBe(false)
    const stale = { ...history, updatedAt: getStockholmDaysAgoStart(now, 1) }
    expect(buildTablePracticeProgress([student('stale', stale)], { now, studentId: 'stale' }).selectedStudent.historyComplete).toBe(false)
  })
})
