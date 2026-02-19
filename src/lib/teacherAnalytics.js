import {
  getSpeedTime,
  inferOperationFromProblemType as inferOperation,
  inferTableFromProblem as inferTable,
  median
} from './mathUtils'
import { getNcmSkillMappingFromProblem } from './ncmSkillMap'

const DAY_MS = 24 * 60 * 60 * 1000

export function buildAnalyticsSnapshot(profiles) {
  const safeProfiles = Array.isArray(profiles) ? profiles : []
  const rows = flattenProblems(safeProfiles)
  const templateLevelBenchmarks = buildTemplateLevelBenchmarks(rows)
  const tableBenchmarks = buildTableBenchmarks(rows)

  return {
    rows,
    templateLevelBenchmarks,
    tableBenchmarks
  }
}

export function buildDetailedProblemExportRows(snapshot) {
  const rows = snapshot?.rows || []
  const templateBenchmarks = snapshot?.templateLevelBenchmarks || {}
  const tableBenchmarks = snapshot?.tableBenchmarks || {}

  return rows.map(item => {
    const templateLevelKey = getTemplateLevelKey(item.problemType, item.level)
    const templateBenchmark = templateBenchmarks[templateLevelKey]
    const tableBenchmark = item.table ? tableBenchmarks[item.table] : null
    const peerMedian = templateBenchmark?.medianTimeCorrectSec || null
    const peerAccuracy = templateBenchmark?.accuracy || null
    const tablePeerMedian = tableBenchmark?.medianTimeCorrectSec || null

    return {
      DatumTid: formatTimestamp(item.timestamp),
      ElevNamn: item.name,
      ElevID: item.studentId,
      Klass: item.className || '',
      Räknesätt: item.operation,
      Problemtyp: item.problemType,
      SkillTag: item.skillTag,
      NCMKod: item.ncmCode || '',
      NCMDomän: item.ncmDomainTag || '',
      NCMOperation: item.ncmOperationTag || '',
      NCMFörmågor: item.ncmAbilityTags || '',
      Nivå: item.level,
      Rätt: item.correct ? 1 : 0,
      Felkategori: item.errorCategory,
      Kunskapsfel: item.isKnowledgeError ? 1 : 0,
      Ouppmärksamhetsfel: item.isInattentionError ? 1 : 0,
      RimligtSvar: item.isReasonable ? 1 : 0,
      SvarstidSek: toFixedOrEmpty(item.rawTimeSpentSec, 2),
      SpeedTidSek: toFixedOrEmpty(item.speedTimeSec, 2),
      ExkluderadSpeed: item.excludedFromSpeed ? 1 : 0,
      ExkluderingsOrsak: item.speedExclusionReason || '',
      AvbrottMisstänkt: item.interruptionSuspected ? 1 : 0,
      DoldTidSek: toFixedOrEmpty(item.hiddenDurationSec, 2),
      Progressionsläge: item.progressionMode,
      SelectionReason: item.selectionReason,
      DifficultyBucket: item.difficultyBucket,
      TargetLevel: item.targetLevel,
      AbilityBefore: toFixedOrEmpty(item.abilityBefore, 2),
      CarryCount: item.carryCount,
      BorrowCount: item.borrowCount,
      TermOrder: item.termOrder,
      PeerMedianTidTemplateNivå: toFixedOrEmpty(peerMedian, 2),
      PeerAccuracyTemplateNivå: toFixedOrEmpty(peerAccuracy, 3),
      SpeedIndexTemplateNivå: toFixedOrEmpty(computeSpeedIndex(peerMedian, item.speedTimeSec), 3),
      Tabell: item.table || '',
      PeerMedianTidTabell: toFixedOrEmpty(tablePeerMedian, 2),
      SpeedIndexTabell: toFixedOrEmpty(computeSpeedIndex(tablePeerMedian, item.speedTimeSec), 3)
    }
  })
}

export function buildSkillComparisonExportRows(snapshot) {
  const rows = snapshot?.rows || []
  const templateBenchmarks = snapshot?.templateLevelBenchmarks || {}
  const grouped = new Map()

  for (const item of rows) {
    const key = `${item.studentId}|${item.skillTag}|${item.level}`
    const existing = grouped.get(key) || {
      studentId: item.studentId,
      name: item.name,
      className: item.className,
      operation: item.operation,
      skillTag: item.skillTag,
      ncmCode: item.ncmCode,
      ncmDomainTag: item.ncmDomainTag,
      ncmOperationTag: item.ncmOperationTag,
      ncmAbilityTags: item.ncmAbilityTags,
      level: item.level,
      attempts: 0,
      correct: 0,
      knowledgeAttempts: 0,
      knowledgeCorrect: 0,
      recent: [],
      window7: [],
      previous7: [],
      window30: []
    }
    existing.attempts += 1
    if (item.correct) existing.correct += 1
    if (isKnowledgeAttempt(item)) {
      existing.knowledgeAttempts += 1
      if (item.correct) existing.knowledgeCorrect += 1
    }
    existing.recent.push(item)
    const ageDays = (Date.now() - item.timestamp) / DAY_MS
    if (ageDays <= 7) {
      existing.window7.push(item)
    } else if (ageDays <= 14) {
      existing.previous7.push(item)
    }
    if (ageDays <= 30) existing.window30.push(item)
    grouped.set(key, existing)
  }

  const output = []
  for (const entry of grouped.values()) {
    const recentSorted = [...entry.recent].sort((a, b) => a.timestamp - b.timestamp)
    const templateLevelKey = getTemplateLevelKey(recentSorted[0].problemType, entry.level)
    const templateBenchmark = templateBenchmarks[templateLevelKey]
    const studentMedian = median(recentSorted.filter(r => r.correct).map(r => r.speedTimeSec))
    const peerMedian = templateBenchmark?.medianTimeCorrectSec || null
    const accuracy = entry.knowledgeAttempts > 0
      ? entry.knowledgeCorrect / entry.knowledgeAttempts
      : (entry.attempts > 0 ? entry.correct / entry.attempts : null)
    const accuracy7 = rate(entry.window7, { knowledgeOnly: true })
    const accuracyPrev7 = rate(entry.previous7, { knowledgeOnly: true })
    const accuracy30 = rate(entry.window30, { knowledgeOnly: true })
    const median7 = median(entry.window7.filter(r => r.correct).map(r => r.speedTimeSec))
    const medianPrev7 = median(entry.previous7.filter(r => r.correct).map(r => r.speedTimeSec))

    output.push({
      ElevNamn: entry.name,
      ElevID: entry.studentId,
      Klass: entry.className || '',
      Räknesätt: entry.operation,
      SkillTag: entry.skillTag,
      NCMKod: entry.ncmCode || '',
      NCMDomän: entry.ncmDomainTag || '',
      NCMOperation: entry.ncmOperationTag || '',
      NCMFörmågor: entry.ncmAbilityTags || '',
      Nivå: entry.level,
      Försök: entry.attempts,
      Rätt: entry.correct,
      Träffsäkerhet: toFixedOrEmpty(accuracy, 3),
      MedianTidRättSek: toFixedOrEmpty(studentMedian, 2),
      PeerMedianTidSek: toFixedOrEmpty(peerMedian, 2),
      SpeedIndex: toFixedOrEmpty(computeSpeedIndex(peerMedian, studentMedian), 3),
      Accuracy7d: toFixedOrEmpty(accuracy7, 3),
      Accuracy30d: toFixedOrEmpty(accuracy30, 3),
      AccuracyTrend7d: toFixedOrEmpty(safeDiff(accuracy7, accuracyPrev7), 3),
      TidMedian7d: toFixedOrEmpty(median7, 2),
      TidMedianPrev7d: toFixedOrEmpty(medianPrev7, 2),
      SpeedTrend7d: toFixedOrEmpty(computeSpeedTrend(medianPrev7, median7), 3)
    })
  }

  return output.sort((a, b) => {
    if (a.ElevNamn !== b.ElevNamn) return String(a.ElevNamn).localeCompare(String(b.ElevNamn), 'sv')
    if (a.Räknesätt !== b.Räknesätt) return String(a.Räknesätt).localeCompare(String(b.Räknesätt), 'sv')
    return Number(a.Nivå) - Number(b.Nivå)
  })
}

export function buildTableDevelopmentExportRows(snapshot) {
  const rows = snapshot?.rows || []
  const tableBenchmarks = snapshot?.tableBenchmarks || {}
  const grouped = new Map()

  for (const item of rows) {
    if (!item.table) continue
    const key = `${item.studentId}|${item.table}`
    const existing = grouped.get(key) || {
      studentId: item.studentId,
      name: item.name,
      className: item.className,
      table: item.table,
      total: [],
      window7: [],
      previous7: []
    }
    existing.total.push(item)
    const ageDays = (Date.now() - item.timestamp) / DAY_MS
    if (ageDays <= 7) {
      existing.window7.push(item)
    } else if (ageDays <= 14) {
      existing.previous7.push(item)
    }
    grouped.set(key, existing)
  }

  const output = []
  for (const entry of grouped.values()) {
    const benchmark = tableBenchmarks[entry.table] || null
    const totalAttempts = entry.total.length
    const totalAccuracy = rate(entry.total)
    const totalMedian = median(entry.total.filter(r => r.correct).map(r => r.speedTimeSec))
    const acc7 = rate(entry.window7)
    const accPrev7 = rate(entry.previous7)
    const med7 = median(entry.window7.filter(r => r.correct).map(r => r.speedTimeSec))
    const medPrev7 = median(entry.previous7.filter(r => r.correct).map(r => r.speedTimeSec))

    output.push({
      ElevNamn: entry.name,
      ElevID: entry.studentId,
      Klass: entry.className || '',
      Tabell: entry.table,
      FörsökTotalt: totalAttempts,
      TräffsäkerhetTotalt: toFixedOrEmpty(totalAccuracy, 3),
      MedianTidTotaltSek: toFixedOrEmpty(totalMedian, 2),
      PeerMedianTidSek: toFixedOrEmpty(benchmark?.medianTimeCorrectSec, 2),
      SpeedIndexTotalt: toFixedOrEmpty(computeSpeedIndex(benchmark?.medianTimeCorrectSec, totalMedian), 3),
      Försök7d: entry.window7.length,
      Träffsäkerhet7d: toFixedOrEmpty(acc7, 3),
      TräffTrend7d: toFixedOrEmpty(safeDiff(acc7, accPrev7), 3),
      MedianTid7dSek: toFixedOrEmpty(med7, 2),
      MedianTidPrev7dSek: toFixedOrEmpty(medPrev7, 2),
      SpeedTrend7d: toFixedOrEmpty(computeSpeedTrend(medPrev7, med7), 3)
    })
  }

  return output.sort((a, b) => {
    if (a.ElevNamn !== b.ElevNamn) return String(a.ElevNamn).localeCompare(String(b.ElevNamn), 'sv')
    return Number(a.Tabell) - Number(b.Tabell)
  })
}

function flattenProblems(profiles) {
  const rows = []
  for (const profile of profiles) {
    const problems = getProblemsForAnalytics(profile)
    for (const problem of problems) {
      const operation = inferOperation(problem.problemType, {
        fallback: 'unknown',
        allowUnknownPrefix: false
      })
      const level = Number(problem?.difficulty?.conceptual_level || 1)
      const ncmMapping = getNcmSkillMappingFromProblem(problem.problemType, problem.skillTag)
      const ncmCode = String(ncmMapping?.code || '')
      rows.push({
        timestamp: Number(problem.timestamp || 0),
        studentId: String(profile.studentId || ''),
        name: String(profile.name || ''),
        className: String(profile.className || ''),
        operation,
        problemType: String(problem.problemType || ''),
        skillTag: String(problem.skillTag || problem.problemType || operation),
        level: Number.isFinite(level) ? level : 1,
        correct: Boolean(problem.correct),
        errorCategory: String(problem.errorCategory || (problem.correct ? 'none' : 'knowledge')),
        isInattentionError: Boolean(problem.isInattentionError || problem.errorCategory === 'inattention'),
        isKnowledgeError: Boolean(problem.isKnowledgeError || (!problem.correct && problem.errorCategory !== 'inattention')),
        isReasonable: Boolean(problem.isReasonable),
        rawTimeSpentSec: Number(problem.timeSpent || 0),
        speedTimeSec: getSpeedTime(problem),
        excludedFromSpeed: Boolean(problem.excludedFromSpeed),
        speedExclusionReason: String(problem.speedExclusionReason || ''),
        interruptionSuspected: Boolean(problem.interruptionSuspected),
        hiddenDurationSec: Number(problem.hiddenDurationSec || 0),
        progressionMode: String(problem.progressionMode || 'challenge'),
        selectionReason: String(problem.selectionReason || 'normal'),
        difficultyBucket: String(problem.difficultyBucket || 'core'),
        targetLevel: Number(problem.targetLevel || level || 1),
        abilityBefore: Number(problem.abilityBefore || 0),
        carryCount: Number(problem.carryCount || 0),
        borrowCount: Number(problem.borrowCount || 0),
        termOrder: String(problem.termOrder || 'equal'),
        table: inferTable(problem),
        ncmCode,
        ncmDomainTag: ncmCode ? String(ncmMapping?.domainTag || '') : '',
        ncmOperationTag: ncmCode ? String(ncmMapping?.operationTag || '') : '',
        ncmAbilityTags: ncmCode && Array.isArray(ncmMapping?.abilityTags)
          ? ncmMapping.abilityTags.join('|')
          : ''
      })
    }
  }
  return rows
}

function getProblemsForAnalytics(profile) {
  const log = Array.isArray(profile?.problemLog) ? profile.problemLog : []
  const recent = Array.isArray(profile?.recentProblems) ? profile.recentProblems : []
  if (log.length === 0) return recent
  if (recent.length === 0) return log

  const logLatest = getLatestTimestamp(log)
  const recentLatest = getLatestTimestamp(recent)
  if (recentLatest > logLatest) return recent
  if (logLatest > recentLatest) return log
  return log.length >= recent.length ? log : recent
}

function buildTemplateLevelBenchmarks(rows) {
  const grouped = new Map()

  for (const item of rows) {
    const key = getTemplateLevelKey(item.problemType, item.level)
    const existing = grouped.get(key) || {
      attempts: 0,
      correct: 0,
      correctTimes: []
    }
    existing.attempts += 1
    if (item.correct) {
      existing.correct += 1
      if (item.speedTimeSec > 0) existing.correctTimes.push(item.speedTimeSec)
    }
    grouped.set(key, existing)
  }

  const result = {}
  for (const [key, item] of grouped.entries()) {
    result[key] = {
      attempts: item.attempts,
      accuracy: item.attempts > 0 ? item.correct / item.attempts : null,
      medianTimeCorrectSec: median(item.correctTimes)
    }
  }
  return result
}

function buildTableBenchmarks(rows) {
  const grouped = new Map()

  for (const item of rows) {
    if (!item.table) continue
    const existing = grouped.get(item.table) || {
      attempts: 0,
      correct: 0,
      correctTimes: []
    }
    existing.attempts += 1
    if (item.correct) {
      existing.correct += 1
      if (item.speedTimeSec > 0) existing.correctTimes.push(item.speedTimeSec)
    }
    grouped.set(item.table, existing)
  }

  const result = {}
  for (const [table, item] of grouped.entries()) {
    result[table] = {
      attempts: item.attempts,
      accuracy: item.attempts > 0 ? item.correct / item.attempts : null,
      medianTimeCorrectSec: median(item.correctTimes)
    }
  }
  return result
}

function getTemplateLevelKey(problemType, level) {
  return `${String(problemType || '')}|${Number(level || 1)}`
}

function getLatestTimestamp(list) {
  if (!Array.isArray(list) || list.length === 0) return 0
  let maxTs = 0
  for (const item of list) {
    const ts = Number(item?.timestamp || 0)
    if (Number.isFinite(ts) && ts > maxTs) maxTs = ts
  }
  return maxTs
}

function formatTimestamp(timestamp) {
  if (!timestamp) return ''
  return new Date(timestamp).toISOString()
}

function rate(items, options = {}) {
  const list = Array.isArray(items) ? items : []
  const knowledgeOnly = Boolean(options.knowledgeOnly)
  const scoped = knowledgeOnly ? list.filter(isKnowledgeAttempt) : list
  if (scoped.length === 0) return null
  const correct = scoped.filter(item => item.correct).length
  return correct / scoped.length
}

function computeSpeedIndex(peerMedian, observed) {
  const p = Number(peerMedian)
  const o = Number(observed)
  if (!Number.isFinite(p) || p <= 0 || !Number.isFinite(o) || o <= 0) return null
  return p / o
}

function computeSpeedTrend(previousMedian, recentMedian) {
  const prev = Number(previousMedian)
  const recent = Number(recentMedian)
  if (!Number.isFinite(prev) || prev <= 0 || !Number.isFinite(recent) || recent <= 0) return null
  return (prev - recent) / prev
}

function safeDiff(a, b) {
  const left = Number(a)
  const right = Number(b)
  if (!Number.isFinite(left) || !Number.isFinite(right)) return null
  return left - right
}

function toFixedOrEmpty(value, digits = 2) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return ''
  return numeric.toFixed(digits)
}

function isKnowledgeAttempt(item) {
  return String(item?.errorCategory || '') !== 'inattention'
}
