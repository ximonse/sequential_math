import {
  inferOperationFromProblemType
} from '../../../lib/mathUtils'
import { getOperationLabel } from '../../../lib/operations'
import {
  getNcmSkillMappingFromProblem
} from '../../../lib/ncmSkillMap'
import { formatNcmAssignmentScope } from '../../../lib/ncmProblemBank'
import {
  getProblemLevel
} from './dashboardCoreHelpers'

const ALL_OPERATIONS = ['addition', 'subtraction', 'multiplication', 'division', 'algebra_evaluate', 'algebra_simplify', 'arithmetic_expressions', 'fractions', 'percentage']

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
    const operation = inferOperationFromProblemType(problem.problemType)
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
    lastActive,
    inactiveDays,
    weekAttempts,
    weekWrongCount,
    weekSuccessRate,
    weekReasonableWrongCount,
    weekAvgTimePerProblemSec,
    weekAssignment,
    todayAttempts,
    todaySuccessRate,
    todayStruggle
  } = input

  const riskCodes = []
  let riskScore = 0

  if (!lastActive) {
    riskScore += 45
    riskCodes.push('Aldrig aktiv')
  } else if (inactiveDays >= 7) {
    riskScore += 35
    riskCodes.push('Inaktiv 7+ dagar')
  } else if (inactiveDays >= 2) {
    riskScore += 18
    riskCodes.push('Inaktiv 2+ dagar')
  }

  if (weekAttempts >= 6 && weekSuccessRate < 0.55) {
    riskScore += 24
    riskCodes.push('Låg träff vecka')
  } else if (weekAttempts >= 6 && weekSuccessRate < 0.7) {
    riskScore += 10
    riskCodes.push('Svajig träff vecka')
  }

  const reasonableWrongRate = weekWrongCount > 0
    ? weekReasonableWrongCount / weekWrongCount
    : 1
  if (weekWrongCount >= 4 && reasonableWrongRate < 0.45) {
    riskScore += 18
    riskCodes.push('Många orimliga fel')
  }

  if (weekAttempts >= 6 && weekAvgTimePerProblemSec >= 60) {
    riskScore += 8
    riskCodes.push('Lång svarstid')
  }

  if (todayAttempts >= 4 && todaySuccessRate < 0.5) {
    riskScore += 10
    riskCodes.push('Tuff dag idag')
  }

  if (todayStruggle && todayStruggle.wrong >= 3) {
    riskScore += 8
    riskCodes.push(`Kämpar: ${todayStruggle.skillLabel}`)
  }

  if (activeAssignment && weekAssignment.attempts >= 4 && (weekAssignment.rate ?? 1) < 0.45) {
    riskScore += 14
    riskCodes.push('Låg uppdragsföljsamhet')
  }

  const successPenalty = weekAttempts >= 4
    ? Math.max(0, (0.75 - weekSuccessRate) * 30)
    : 0
  const reasonablePenalty = weekWrongCount >= 3
    ? Math.max(0, (0.65 - reasonableWrongRate) * 20)
    : 0
  const supportScore = Math.min(100, Math.round(riskScore + successPenalty + reasonablePenalty))
  const riskLevel = supportScore >= 70 ? 'high' : supportScore >= 40 ? 'medium' : 'low'

  return {
    riskLevel,
    riskScore: Math.min(100, Math.round(riskScore)),
    supportScore,
    riskCodes
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
