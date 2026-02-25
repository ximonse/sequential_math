import {
  pickStrongestNcmDomain,
  pickWeakestNcmDomain
} from './dashboardAnalyticsHelpers'
import {
  getTableProblemSourceForStudent,
  isKnowledgeError
} from './dashboardTableStatusUtils'
import { getSpeedTime } from '../../../lib/mathUtils'
import {
  getNcmDomainLabelSv,
  getNcmOperationLabelSv,
  getNcmSkillMappingFromProblem
} from '../../../lib/ncmSkillMap'
import { getNcmAbilityLabelSv } from '../../../lib/ncmProblemBank'
import { getStartOfWeekTimestamp } from '../../../lib/studentProfile'

export function buildNcmDetailForStudent(student) {
  const source = getTableProblemSourceForStudent(student)
  const weekStart = getStartOfWeekTimestamp()
  const codeStats = new Map()
  const domainStats = new Map()
  const recentRows = []
  let attemptsTotal = 0
  let correctTotal = 0
  let knowledgeWrongTotal = 0
  let inattentionWrongTotal = 0
  let attemptsWeek = 0
  let correctWeek = 0
  let knowledgeWrongWeek = 0
  let inattentionWrongWeek = 0
  let lastNcmCode = ''
  let lastTimestamp = 0

  for (const problem of source) {
    const mapping = getNcmSkillMappingFromProblem(problem?.problemType, problem?.skillTag)
    const ncmCode = String(mapping?.code || '').trim()
    if (!ncmCode) continue

    const domainTag = String(mapping?.domainTag || 'unknown').trim() || 'unknown'
    const operationTag = String(mapping?.operationTag || 'mixed').trim() || 'mixed'
    const abilityTags = Array.isArray(mapping?.abilityTags)
      ? mapping.abilityTags.map(item => String(item || '').trim()).filter(Boolean)
      : []
    const ts = Number(problem?.timestamp || 0)
    const inWeek = ts >= weekStart
    const correct = Boolean(problem?.correct)
    const knowledgeWrong = !correct && isKnowledgeError(problem)
    const inattentionWrong = !correct && String(problem?.errorCategory || '') === 'inattention'
    const speedTimeSec = getSpeedTime(problem)

    attemptsTotal += 1
    if (correct) correctTotal += 1
    if (knowledgeWrong) knowledgeWrongTotal += 1
    if (inattentionWrong) inattentionWrongTotal += 1

    if (inWeek) {
      attemptsWeek += 1
      if (correct) correctWeek += 1
      if (knowledgeWrong) knowledgeWrongWeek += 1
      if (inattentionWrong) inattentionWrongWeek += 1
    }

    if (ts >= lastTimestamp) {
      lastTimestamp = ts
      lastNcmCode = ncmCode
    }

    const codeEntry = codeStats.get(ncmCode) || {
      ncmCode,
      domainTag,
      operationTag,
      abilityTagSet: new Set(),
      attemptsTotal: 0,
      correctTotal: 0,
      knowledgeWrongTotal: 0,
      inattentionWrongTotal: 0,
      attemptsWeek: 0,
      correctWeek: 0,
      knowledgeWrongWeek: 0,
      inattentionWrongWeek: 0,
      lastTimestamp: 0
    }
    codeEntry.attemptsTotal += 1
    if (correct) codeEntry.correctTotal += 1
    if (knowledgeWrong) codeEntry.knowledgeWrongTotal += 1
    if (inattentionWrong) codeEntry.inattentionWrongTotal += 1
    if (inWeek) {
      codeEntry.attemptsWeek += 1
      if (correct) codeEntry.correctWeek += 1
      if (knowledgeWrong) codeEntry.knowledgeWrongWeek += 1
      if (inattentionWrong) codeEntry.inattentionWrongWeek += 1
    }
    if (ts > codeEntry.lastTimestamp) {
      codeEntry.lastTimestamp = ts
    }
    for (const tag of abilityTags) {
      codeEntry.abilityTagSet.add(tag)
    }
    codeStats.set(ncmCode, codeEntry)

    const domainEntry = domainStats.get(domainTag) || {
      domainTag,
      attemptsTotal: 0,
      correctTotal: 0,
      knowledgeWrongTotal: 0,
      inattentionWrongTotal: 0,
      attemptsWeek: 0,
      correctWeek: 0,
      knowledgeWrongWeek: 0,
      inattentionWrongWeek: 0
    }
    domainEntry.attemptsTotal += 1
    if (correct) domainEntry.correctTotal += 1
    if (knowledgeWrong) domainEntry.knowledgeWrongTotal += 1
    if (inattentionWrong) domainEntry.inattentionWrongTotal += 1
    if (inWeek) {
      domainEntry.attemptsWeek += 1
      if (correct) domainEntry.correctWeek += 1
      if (knowledgeWrong) domainEntry.knowledgeWrongWeek += 1
      if (inattentionWrong) domainEntry.inattentionWrongWeek += 1
    }
    domainStats.set(domainTag, domainEntry)

    recentRows.push({
      timestamp: ts,
      ncmCode,
      domainTag,
      domainLabel: getNcmDomainLabelSv(domainTag),
      operationTag,
      operationLabel: getNcmOperationLabelSv(operationTag),
      abilityTags,
      correct,
      errorCategory: String(problem?.errorCategory || ''),
      studentAnswer: problem?.studentAnswer,
      correctAnswer: problem?.correctAnswer,
      speedTimeSec: Number.isFinite(speedTimeSec) ? speedTimeSec : null
    })
  }

  const codeRows = Array.from(codeStats.values())
    .map(item => {
      const abilityLabels = Array.from(item.abilityTagSet)
        .map(tag => getNcmAbilityLabelSv(tag))
        .filter(Boolean)

      return {
        ncmCode: item.ncmCode,
        domainTag: item.domainTag,
        domainLabel: getNcmDomainLabelSv(item.domainTag),
        operationTag: item.operationTag,
        operationLabel: getNcmOperationLabelSv(item.operationTag),
        abilityLabels,
        abilityLabelText: abilityLabels.length > 0 ? abilityLabels.join(', ') : '-',
        attemptsTotal: item.attemptsTotal,
        correctTotal: item.correctTotal,
        knowledgeWrongTotal: item.knowledgeWrongTotal,
        inattentionWrongTotal: item.inattentionWrongTotal,
        successRateTotal: item.attemptsTotal > 0 ? item.correctTotal / item.attemptsTotal : null,
        attemptsWeek: item.attemptsWeek,
        correctWeek: item.correctWeek,
        knowledgeWrongWeek: item.knowledgeWrongWeek,
        inattentionWrongWeek: item.inattentionWrongWeek,
        successRateWeek: item.attemptsWeek > 0 ? item.correctWeek / item.attemptsWeek : null,
        lastTimestamp: item.lastTimestamp
      }
    })
    .sort((a, b) => {
      if (a.attemptsTotal !== b.attemptsTotal) return b.attemptsTotal - a.attemptsTotal
      return String(a.ncmCode || '').localeCompare(String(b.ncmCode || ''), 'sv')
    })

  const domainRows = Array.from(domainStats.values())
    .map(item => ({
      domainTag: item.domainTag,
      domainLabel: getNcmDomainLabelSv(item.domainTag),
      attemptsTotal: item.attemptsTotal,
      correctTotal: item.correctTotal,
      knowledgeWrongTotal: item.knowledgeWrongTotal,
      inattentionWrongTotal: item.inattentionWrongTotal,
      successRateTotal: item.attemptsTotal > 0 ? item.correctTotal / item.attemptsTotal : null,
      attemptsWeek: item.attemptsWeek,
      correctWeek: item.correctWeek,
      knowledgeWrongWeek: item.knowledgeWrongWeek,
      inattentionWrongWeek: item.inattentionWrongWeek,
      successRateWeek: item.attemptsWeek > 0 ? item.correctWeek / item.attemptsWeek : null
    }))
    .sort((a, b) => {
      if (a.attemptsTotal !== b.attemptsTotal) return b.attemptsTotal - a.attemptsTotal
      return String(a.domainLabel || '').localeCompare(String(b.domainLabel || ''), 'sv')
    })

  const assignmentRows = buildNcmAssignmentProgressRows(student)
  const weakestDomain = pickWeakestNcmDomain(domainRows)
  const strongestDomain = pickStrongestNcmDomain(domainRows)

  return {
    attemptsTotal,
    correctTotal,
    successRateTotal: attemptsTotal > 0 ? correctTotal / attemptsTotal : null,
    knowledgeWrongTotal,
    inattentionWrongTotal,
    attemptsWeek,
    correctWeek,
    successRateWeek: attemptsWeek > 0 ? correctWeek / attemptsWeek : null,
    knowledgeWrongWeek,
    inattentionWrongWeek,
    lastNcmCode,
    lastTimestamp,
    weakestDomainLabel: weakestDomain ? getNcmDomainLabelSv(weakestDomain.domainTag) : '-',
    strongestDomainLabel: strongestDomain ? getNcmDomainLabelSv(strongestDomain.domainTag) : '-',
    codeRows,
    domainRows,
    recentRows: recentRows
      .sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0))
      .slice(0, 30),
    assignmentRows
  }
}

function buildNcmAssignmentProgressRows(student) {
  const store = student?.assignmentProgress
  if (!store || typeof store !== 'object') return []

  const rows = []
  for (const [assignmentKey, raw] of Object.entries(store)) {
    if (!raw || typeof raw !== 'object') continue
    if (String(raw.kind || '').trim() !== 'ncm') continue

    const completedSkillTags = Array.isArray(raw.completedSkillTags)
      ? raw.completedSkillTags.map(item => String(item || '').trim()).filter(Boolean)
      : []
    const totalSkillTags = Math.max(0, Number(raw.totalSkillTags || 0))
    const completedCount = completedSkillTags.length
    const completionRate = totalSkillTags > 0 ? completedCount / totalSkillTags : null
    const completedAt = Number(raw.completedAt || 0) || 0
    const updatedAt = Number(raw.updatedAt || 0) || 0

    rows.push({
      assignmentKey: String(assignmentKey || ''),
      assignmentId: String(raw.assignmentId || '').trim(),
      assignmentTitle: String(raw.assignmentTitle || '').trim() || 'NCM-uppdrag',
      totalSkillTags,
      completedCount,
      completionRate,
      completedAt: completedAt > 0 ? completedAt : null,
      updatedAt: updatedAt > 0 ? updatedAt : null
    })
  }

  rows.sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))
  return rows
}
