import {
  resolveProblemOperation
} from '../../../lib/mathUtils'
import { getOperationLabel } from '../../../lib/operations'
import {
  getNcmSkillMappingFromProblem
} from '../../../lib/ncmSkillMap'
import { formatNcmAssignmentScope } from '../../../lib/ncmProblemBank'
import {
  getProblemLevel
} from './dashboardCoreHelpers'
import { ALL_OPERATIONS } from './dashboardConstants'

export function summarizeAssignmentAdherence(problems, assignment) {
  const attempts = Array.isArray(problems) ? problems.length : 0
  if (!assignment) {
    return {
      attempts,
      matchedAttempts: 0,
      rate: null,
      missedByOperation: 0,
      missedByLevel: 0
    }
  }

  let matchedAttempts = 0
  let missedByOperation = 0
  let missedByLevel = 0

  if (assignment.kind === 'ncm') {
    const codeSet = new Set(
      (Array.isArray(assignment.ncmCodes) ? assignment.ncmCodes : [])
        .map(item => String(item || '').trim().toUpperCase())
        .filter(Boolean)
    )
    const abilitySet = new Set(
      (Array.isArray(assignment.ncmAbilityTags) ? assignment.ncmAbilityTags : [])
        .map(item => String(item || '').trim())
        .filter(Boolean)
    )

    for (const problem of problems) {
      const mapping = getNcmSkillMappingFromProblem(problem.problemType, problem.skillTag)
      const code = String(mapping?.code || '').trim().toUpperCase()
      const abilities = Array.isArray(mapping?.abilityTags) ? mapping.abilityTags : []
      const codeMatch = codeSet.size === 0 || codeSet.has(code)
      const abilityMatch = abilitySet.size === 0 || abilities.some(tag => abilitySet.has(tag))

      if (codeMatch && abilityMatch) matchedAttempts += 1
      else if (!codeMatch) missedByOperation += 1
      else if (!abilityMatch) missedByLevel += 1
    }

    return {
      attempts,
      matchedAttempts,
      rate: attempts > 0 ? matchedAttempts / attempts : null,
      missedByOperation,
      missedByLevel
    }
  }

  for (const problem of problems) {
    const operation = resolveProblemOperation(problem, { fallback: '', allowUnknownPrefix: false })
    const level = getProblemLevel(problem)
    const operationMatch = assignment.problemTypes.includes(operation)
    const levelMatch = level === null
      ? true
      : level >= assignment.minLevel && level <= assignment.maxLevel

    if (operationMatch && levelMatch) matchedAttempts += 1
    else if (!operationMatch) missedByOperation += 1
    else if (!levelMatch) missedByLevel += 1
  }

  return {
    attempts,
    matchedAttempts,
    rate: attempts > 0 ? matchedAttempts / attempts : null,
    missedByOperation,
    missedByLevel
  }
}

export function buildRiskSignals(input, activeAssignment) {
  const {
    attempts,
    lastActive,
    inactiveDays,
    weekAttempts,
    weekSuccessRate,
    weekEvidenceStatus,
    weekAssignment,
    todayAttempts,
    todaySuccessRate,
    todayStruggle
  } = input

  const strongSignals = []
  const followUpSignals = []

  if (!lastActive && attempts === 0) {
    strongSignals.push('Inte kommit igång')
  } else if (inactiveDays >= 7) {
    strongSignals.push('Inaktiv minst 7 dagar')
  } else if (inactiveDays >= 2) {
    followUpSignals.push('Inaktiv minst 2 dagar')
  }

  if (weekAttempts >= 6 && weekSuccessRate < 0.55) {
    strongSignals.push(`Låg träff: ${Math.round(weekSuccessRate * 100)}% av ${weekAttempts} svar`)
  } else if (weekAttempts >= 6 && weekSuccessRate < 0.7) {
    followUpSignals.push(`Osäker träff: ${Math.round(weekSuccessRate * 100)}% av ${weekAttempts} svar`)
  }

  if (todayAttempts >= 4 && todaySuccessRate < 0.5) {
    followUpSignals.push('Tuff träning idag')
  }

  if (todayStruggle && todayStruggle.wrong >= 3) {
    followUpSignals.push(`Återkommande fel: ${todayStruggle.skillLabel}`)
  }

  if (activeAssignment && weekAssignment.attempts >= 4 && (weekAssignment.rate ?? 1) < 0.45) {
    followUpSignals.push('Tränar ofta utanför uppdraget')
  }

  const riskLevel = strongSignals.length > 0
    ? 'high'
    : followUpSignals.length > 0
      ? 'medium'
      : 'low'
  const priorityRank = riskLevel === 'high' ? 2 : riskLevel === 'medium' ? 1 : 0
  const riskCodes = [...strongSignals, ...followUpSignals]
  const limitedHistory = weekEvidenceStatus !== 'complete'
  const evidenceLabel = weekAttempts === 0
    ? 'Inga svar denna vecka'
    : weekAttempts < 6
      ? `${weekAttempts} svar – för lite för prestationssignal`
      : `${weekAttempts} svar denna vecka${limitedHistory ? ' · begränsad historik' : ''}`

  let nextAction = 'Ingen särskild åtgärd utifrån aktuell data.'
  if (strongSignals.some(signal => signal.startsWith('Inte kommit') || signal.startsWith('Inaktiv'))) {
    nextAction = 'Kontrollera åtkomst och hjälp eleven att komma igång.'
  } else if (strongSignals.some(signal => signal.startsWith('Låg träff'))) {
    nextAction = 'Titta på några felsvar och välj ett smalt träningsområde.'
  } else if (todayStruggle && todayStruggle.wrong >= 3) {
    nextAction = `Titta på felsvaren i ${todayStruggle.skillLabel} innan nytt uppdrag.`
  } else if (riskCodes.includes('Tränar ofta utanför uppdraget')) {
    nextAction = 'Kontrollera att eleven hittar och förstår uppdraget.'
  } else if (riskLevel === 'medium') {
    nextAction = 'Följ upp kort och kontrollera elevens lösningsstrategi.'
  }

  return {
    riskLevel,
    riskScore: priorityRank,
    supportScore: priorityRank,
    supportLabel: riskLevel === 'high' ? 'Prioritera' : riskLevel === 'medium' ? 'Följ upp' : 'Ingen signal',
    riskCodes,
    evidenceLabel,
    nextAction
  }
}

export function buildQuickAssignmentPreset(row, variant) {
  const operation = pickFocusOperation(row)
  const operationLabel = getOperationLabel(operation)
  const level = pickFocusLevel(row, operation)

  if (variant === 'warmup') {
    const minLevel = clampLevel(level - 2)
    const maxLevel = clampLevel(Math.max(minLevel, level - 1))
    return {
      title: `Värm upp ${row.name} | ${operationLabel} nivå ${minLevel}-${maxLevel}`,
      problemTypes: [operation],
      minLevel,
      maxLevel,
      targetCount: 10
    }
  }

  if (variant === 'challenge') {
    const minLevel = clampLevel(level)
    const maxLevel = clampLevel(level + 2)
    return {
      title: `Utmaning ${row.name} | Mix nivå ${minLevel}-${maxLevel}`,
      problemTypes: [...ALL_OPERATIONS],
      minLevel,
      maxLevel,
      targetCount: 16
    }
  }

  const minLevel = clampLevel(level - 1)
  const maxLevel = clampLevel(level + 1)
  return {
    title: `Fokus ${row.name} | ${operationLabel} nivå ${minLevel}-${maxLevel}`,
    problemTypes: [operation],
    minLevel,
    maxLevel,
    targetCount: 14
  }
}

export function formatAssignmentSummaryLine(assignment) {
  if (!assignment || typeof assignment !== 'object') return 'Uppdrag'
  if (assignment.kind === 'ncm') {
    const scope = formatNcmAssignmentScope(assignment)
    return scope || 'NCM-uppdrag'
  }

  const types = Array.isArray(assignment.problemTypes)
    ? assignment.problemTypes.map(type => getOperationLabel(type))
    : []
  const typeText = types.length > 0 ? types.join(', ') : 'Blandat'
  return `${typeText} | Nivå ${assignment.minLevel}-${assignment.maxLevel}`
}

function pickFocusOperation(row) {
  if (row.weekStruggle?.operation) return row.weekStruggle.operation
  if (row.todayStruggle?.operation) return row.todayStruggle.operation
  if (row.primaryOperation && ALL_OPERATIONS.includes(row.primaryOperation)) return row.primaryOperation
  return 'addition'
}

function pickFocusLevel(row, operation) {
  const direct = Number(row.weekStruggle?.avgLevel)
  if (Number.isFinite(direct)) return clampLevel(Math.round(direct))

  const match = Array.isArray(row.weekBySkill)
    ? row.weekBySkill.find(item => item.operation === operation && Number.isFinite(item.avgLevel))
    : null
  if (match && Number.isFinite(match.avgLevel)) return clampLevel(Math.round(match.avgLevel))

  const opAbility = Number(row.operationAbilities?.[operation])
  if (Number.isFinite(opAbility) && opAbility > 0) return clampLevel(Math.round(opAbility))
  return clampLevel(Math.round(Number(row.currentDifficulty) || 1))
}

function clampLevel(value) {
  return Math.max(1, Math.min(12, Number(value) || 1))
}
