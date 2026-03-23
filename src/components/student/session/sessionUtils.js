import { inferOperationFromProblemType as inferOperationFromType } from '../../../lib/mathUtils'
import { computeOperationLevelMasteryStatus, getPreferredProblemSource, recordMasteryAchievement } from '../../../lib/masteryCalculation'
import { getOperationAbility } from '../../../lib/difficultyAdapter'
import { MASTERY_MIN_ATTEMPTS, MASTERY_MIN_SUCCESS_RATE } from '../../../lib/operations'
import { normalizeProgressionMode } from '../../../lib/progressionModes'
import { filterNcmProblems } from '../../../lib/ncmProblemBank'

export const DEFAULT_BREAK_MINUTES = 1
export const SINGLE_DIGIT_BREAK_MINUTES = 2
export const LEVEL_MASTERY_MIN_ATTEMPTS = MASTERY_MIN_ATTEMPTS
export const LEVEL_MASTERY_MIN_SUCCESS_RATE = MASTERY_MIN_SUCCESS_RATE

export function getSessionRules(
  assignment,
  mode,
  warmup,
  solvedCount,
  tableSet = [],
  progressionMode = 'challenge',
  fixedLevel = null,
  freeOps = [],
  profile = null
) {
  const rules = { progressionMode: normalizeProgressionMode(progressionMode) }

  if (assignment) {
    if (assignment.kind === 'ncm') {
      rules.ncmFilter = {
        codes: Array.isArray(assignment.ncmCodes) ? assignment.ncmCodes : [],
        abilityTags: Array.isArray(assignment.ncmAbilityTags) ? assignment.ncmAbilityTags : []
      }
      return rules
    }
    rules.allowedTypes = assignment.problemTypes
    rules.levelRange = [assignment.minLevel, assignment.maxLevel]
    return rules
  }

  if (mode && isKnownMode(mode)) {
    rules.allowedTypes = [mode]
  }

  if (Array.isArray(tableSet) && tableSet.length > 0) {
    rules.allowedTypes = ['multiplication']
    rules.tableSet = tableSet
  }

  if (Number.isInteger(fixedLevel) && mode && isKnownMode(mode) && (!Array.isArray(tableSet) || tableSet.length === 0)) {
    const clampedLevel = Math.max(1, Math.min(12, fixedLevel))
    rules.allowedTypes = [mode]
    rules.levelRange = [clampedLevel, clampedLevel]
    rules.forcedLevel = clampedLevel
    rules.forcedType = mode
    rules.forceReason = 'manual_level_focus'
    rules.forceBucket = 'core'
    return rules
  }

  if (warmup && solvedCount < warmup.warmupCount) {
    const forcedLevel = Math.min(
      warmup.targetLevel,
      warmup.startLevel + solvedCount
    )
    rules.forcedLevel = forcedLevel
    rules.forcedType = warmup.operation
    rules.forceReason = 'operation_mode_warmup'
    rules.forceBucket = 'easy'
    return rules
  }

  if (
    mode
    && isKnownMode(mode)
    && !Number.isInteger(fixedLevel)
    && (!Array.isArray(tableSet) || tableSet.length === 0)
    && !assignment
  ) {
    rules.startAtLowestUnmastered = true
    rules.lockToMasteryFloor = true
    rules.startReason = 'single_domain_floor_lock'
    return rules
  }

  if (solvedCount === 0 && !assignment && (!Array.isArray(tableSet) || tableSet.length === 0)) {
    rules.startAtLowestUnmastered = true
  }

  const normalizedFreeOps = normalizeKnownFreeOperations(freeOps)
  if (
    !rules.allowedTypes
    && !assignment
    && (!mode || !isKnownMode(mode))
    && (!Array.isArray(tableSet) || tableSet.length === 0)
    && normalizedFreeOps.length > 0
    && profile
  ) {
    // Per-domän-progression i fri träning:
    // varje domän tränar på sitt eget mastery-golv, jämn rotation mellan alla.
    const picked = pickNextFreeOperation(profile, normalizedFreeOps)
    if (picked) {
      rules.allowedTypes = [picked]
      rules.startAtLowestUnmastered = true
      rules.lockToMasteryFloor = true
      rules.startReason = 'free_training_per_domain'
      return rules
    }
  }

  if (!rules.allowedTypes && Array.isArray(freeOps) && freeOps.length > 0) {
    const picked = freeOps[Math.floor(Math.random() * freeOps.length)]
    rules.allowedTypes = [picked]
  }

  return rules
}

export function parseTableSet(value) {
  if (!value) return []
  const entries = String(value)
    .split(',')
    .map(v => Number(v.trim()))
    .filter(v => Number.isInteger(v) && v >= 2 && v <= 12)

  return Array.from(new Set(entries)).sort((a, b) => a - b)
}

export function parsePracticeLevel(value) {
  if (value === null || value === undefined || value === '') return null
  const level = Number(value)
  if (!Number.isInteger(level)) return null
  if (level < 1 || level > 12) return null
  return level
}

export function createTableQueue(tableSet) {
  const queue = []
  for (const table of tableSet) {
    for (let factor = 1; factor <= 12; factor++) {
      queue.push({ table, factor })
    }
  }
  return shuffle(queue)
}

export function createTableProblem(item) {
  const table = Number(item.table)
  const factor = Number(item.factor)
  const tableFirst = Math.random() < 0.5
  const a = tableFirst ? table : factor
  const b = tableFirst ? factor : table
  const result = a * b

  return {
    id: `mul_table_${table}_${factor}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    template: 'mul_table_drill',
    type: 'multiplication',
    values: { a, b },
    result,
    difficulty: {
      conceptual_level: 4,
      cognitive_load: { working_memory: 1, steps_required: 1, intermediate_values: 0 },
      procedural: { num_terms: 2, requires_carry: false, mixed_digits: false },
      magnitude: { a_digits: 1, b_digits: 1 }
    },
    metadata: {
      table,
      factor,
      skillTag: `mul_table_${table}`,
      selectionReason: 'table_drill_queue',
      description: `Tabellovning ${table}:an`
    },
    generated_at: Date.now()
  }
}

function shuffle(items) {
  const array = [...items]
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = array[i]
    array[i] = array[j]
    array[j] = temp
  }
  return array
}

export function recordTableCompletion(profile, table) {
  if (!profile.tableDrill || typeof profile.tableDrill !== 'object') {
    profile.tableDrill = { completions: [] }
  }
  if (!Array.isArray(profile.tableDrill.completions)) {
    profile.tableDrill.completions = []
  }

  const now = Date.now()
  profile.tableDrill.completions.push({ table: Number(table), timestamp: now })

  if (profile.tableDrill.completions.length > 1000) {
    profile.tableDrill.completions = profile.tableDrill.completions.slice(-1000)
  }

  // Registrera mastery-faktum för tabellträning (multiplication + table som level)
  const tableNum = Number(table)
  if (tableNum >= 2 && tableNum <= 12) {
    recordMasteryAchievement(profile, 'multiplication', tableNum, {
      attempts: 1,
      correct: 1,
      rate: 1.0
    })
  }

  const startToday = new Date()
  startToday.setHours(0, 0, 0, 0)
  const startTs = startToday.getTime()

  return profile.tableDrill.completions.filter(
    item => Number(item.table) === Number(table) && item.timestamp >= startTs
  ).length
}

function hasMasteredTablesToday(profile, tables) {
  if (!profile?.tableDrill || !Array.isArray(profile.tableDrill.completions)) return false
  const required = new Set((tables || []).map(Number))
  if (required.size === 0) return false

  const startToday = new Date()
  startToday.setHours(0, 0, 0, 0)
  const startTs = startToday.getTime()

  const completedToday = new Set(
    profile.tableDrill.completions
      .filter(item => item.timestamp >= startTs)
      .map(item => Number(item.table))
  )

  for (const table of required) {
    if (!completedToday.has(table)) return false
  }
  return true
}

export function shouldTriggerDailyBoss(profile, tables) {
  if (!hasMasteredTablesToday(profile, tables)) return false
  return !isDailyBossAlreadyShown(profile)
}

function isDailyBossAlreadyShown(profile) {
  const shownDate = profile?.tableDrill?.dailyBossShownDate
  return shownDate === getTodayKey()
}

export function markDailyBossShown(profile) {
  if (!profile.tableDrill || typeof profile.tableDrill !== 'object') {
    profile.tableDrill = { completions: [] }
  }
  profile.tableDrill.dailyBossShownDate = getTodayKey()
}

const ALL_TABLES_RANGE = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

export function shouldTriggerAllTablesBoss(profile) {
  if (!hasMasteredTablesToday(profile, ALL_TABLES_RANGE)) return false
  const shownDate = profile?.tableDrill?.dailyAllTablesBossShownDate
  return shownDate !== getTodayKey()
}

export function markAllTablesBossShown(profile) {
  if (!profile.tableDrill || typeof profile.tableDrill !== 'object') {
    profile.tableDrill = { completions: [] }
  }
  profile.tableDrill.dailyAllTablesBossShownDate = getTodayKey()
}

function getTodayKey() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function makeSessionTelemetryId(studentId) {
  const normalized = String(studentId || 'student').toUpperCase()
  return `sess_${normalized}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function estimateOperationLevel(profile, operation) {
  const relevant = profile.recentProblems
    .filter(
      p => inferOperationFromType(p.problemType, { fallback: 'addition', allowUnknownPrefix: false }) === operation
    )
    .slice(-20)

  if (relevant.length === 0) return 1

  const sum = relevant.reduce((acc, p) => {
    const lvl = p.difficulty?.conceptual_level || Math.round(getOperationAbility(profile, operation)) || 1
    return acc + lvl
  }, 0)

  return sum / relevant.length
}

export function isKnownMode(mode) {
  return mode === 'addition'
    || mode === 'subtraction'
    || mode === 'multiplication'
    || mode === 'division'
    || mode === 'algebra_evaluate'
    || mode === 'algebra_simplify'
    || mode === 'arithmetic_expressions'
    || mode === 'fractions'
    || mode === 'percentage'
}

export function isMixedTrainingSession(mode, assignment, isTableDrill) {
  if (isTableDrill) return false
  if (mode && isKnownMode(mode)) return false
  if (!assignment) return true
  if (assignment.kind === 'ncm') return true
  const types = Array.isArray(assignment.problemTypes) ? assignment.problemTypes : []
  return types.length !== 1
}

export function getBreakPolicy(problem, isTableDrill) {
  if (isTableDrill) {
    return {
      enabled: false,
      questionThreshold: Infinity,
      recentWindow: 10,
      errorThreshold: 5,
      recommendedBreakMinutes: DEFAULT_BREAK_MINUTES
    }
  }

  if (isSingleDigitAddOrSubProblem(problem)) {
    return {
      enabled: true,
      questionThreshold: 20,
      recentWindow: 10,
      errorThreshold: 5,
      recommendedBreakMinutes: SINGLE_DIGIT_BREAK_MINUTES
    }
  }

  return {
    enabled: true,
    questionThreshold: 20,
    recentWindow: 10,
    errorThreshold: 5,
    recommendedBreakMinutes: DEFAULT_BREAK_MINUTES
  }
}

function isSingleDigitAddOrSubProblem(problem) {
  if (!problem || (problem.type !== 'addition' && problem.type !== 'subtraction')) return false

  const magnitude = problem.difficulty?.magnitude || {}
  const magA = Number(magnitude.a_digits)
  const magB = Number(magnitude.b_digits)
  if (Number.isFinite(magA) && Number.isFinite(magB)) {
    return magA <= 1 && magB <= 1
  }

  const a = Number(problem.values?.a)
  const b = Number(problem.values?.b)
  if (Number.isFinite(a) && Number.isFinite(b)) {
    return Math.abs(a) < 10 && Math.abs(b) < 10
  }

  return false
}

function normalizeKnownFreeOperations(freeOps) {
  if (!Array.isArray(freeOps) || freeOps.length === 0) return []
  const seen = new Set()
  const normalized = []
  for (const entry of freeOps) {
    const operation = String(entry || '').trim()
    if (!operation || !isKnownMode(operation) || seen.has(operation)) continue
    seen.add(operation)
    normalized.push(operation)
  }
  return normalized
}

function pickNextFreeOperation(profile, candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) return ''
  if (candidates.length === 1) return candidates[0]
  const source = Array.isArray(profile?.recentProblems) ? profile.recentProblems : []
  for (let i = source.length - 1; i >= 0; i -= 1) {
    const operation = inferOperationFromType(source[i]?.problemType, {
      fallback: '',
      allowUnknownPrefix: false
    })
    if (!candidates.includes(operation)) continue
    const currentIndex = candidates.indexOf(operation)
    return candidates[(currentIndex + 1) % candidates.length]
  }
  return candidates[0]
}

export function getLevelFocusNextLevelAction(profile, mode, fixedLevel) {
  if (!profile || !isKnownMode(mode) || !Number.isInteger(fixedLevel)) return null

  const lastOffer = profile?.adaptive?.lastAdvanceOffer
  if (!lastOffer || lastOffer.accepted !== false) return null

  const operation = String(lastOffer.operation || '')
  const fromLevel = Number(lastOffer.fromLevel)
  const nextLevel = Number(lastOffer.nextLevel)
  if (operation !== mode) return null
  if (!Number.isInteger(fromLevel) || fromLevel !== fixedLevel) return null
  if (!Number.isInteger(nextLevel) || nextLevel <= fixedLevel || nextLevel > 12) return null

  return {
    nextLevel,
    label: 'Gå till nästa nivå'
  }
}

export function getOperationLevelMasteryStatus(profile, operation, level) {
  if (!profile || !operation || !Number.isInteger(level)) {
    return { attempts: 0, correct: 0, rate: 0, successRate: 0, isMastered: false }
  }
  const source = getPreferredProblemSource(profile)
  const result = computeOperationLevelMasteryStatus(source, operation, level)
  return { ...result, successRate: result.rate }
}

export function createAttentionTracker() {
  return {
    hiddenSinceTs: null,
    hiddenDurationMs: 0,
    blurCount: 0
  }
}

export function beginHiddenTracking(tracker) {
  if (!tracker || tracker.hiddenSinceTs) return
  tracker.hiddenSinceTs = Date.now()
}

export function endHiddenTracking(tracker) {
  if (!tracker || !tracker.hiddenSinceTs) return
  tracker.hiddenDurationMs += Math.max(0, Date.now() - tracker.hiddenSinceTs)
  tracker.hiddenSinceTs = null
}

export function finalizeAttentionSnapshot(tracker) {
  if (!tracker) return { hiddenDurationSec: 0, blurCount: 0 }
  endHiddenTracking(tracker)
  return {
    hiddenDurationSec: tracker.hiddenDurationMs / 1000,
    blurCount: tracker.blurCount
  }
}

export function buildNcmAssignmentSkillPool(assignment) {
  const filter = {
    codes: Array.isArray(assignment?.ncmCodes) ? assignment.ncmCodes : [],
    abilityTags: Array.isArray(assignment?.ncmAbilityTags) ? assignment.ncmAbilityTags : []
  }
  const candidates = filterNcmProblems(filter)
  return Array.from(new Set(
    candidates
      .map(item => String(item?.skillTag || '').trim())
      .filter(Boolean)
  )).sort((a, b) => a.localeCompare(b, 'sv'))
}

export function getNcmAssignmentKey(assignment) {
  const id = String(assignment?.id || '').trim()
  if (id) return `assignment:${id}`

  return buildNcmAssignmentSignature(assignment)
}

function buildNcmAssignmentSignature(assignment) {
  const codes = Array.isArray(assignment?.ncmCodes)
    ? assignment.ncmCodes.map(item => String(item || '').trim()).filter(Boolean).sort((a, b) => a.localeCompare(b, 'sv'))
    : []
  const abilities = Array.isArray(assignment?.ncmAbilityTags)
    ? assignment.ncmAbilityTags.map(item => String(item || '').trim()).filter(Boolean).sort((a, b) => a.localeCompare(b, 'sv'))
    : []
  return `codes:${codes.join(',')}|abilities:${abilities.join(',')}`
}

export function readNcmAssignmentProgress(profile, assignmentKey) {
  if (!profile || !assignmentKey) return { completedSkillTags: [] }
  const store = getAssignmentProgressStore(profile)
  const raw = store[assignmentKey]
  if (!raw || typeof raw !== 'object') return { completedSkillTags: [] }

  const completedSkillTags = Array.isArray(raw.completedSkillTags)
    ? raw.completedSkillTags.map(item => String(item || '').trim()).filter(Boolean)
    : []
  return {
    ...raw,
    completedSkillTags
  }
}

export function markNcmSkillCompleted(profile, assignment, skillTag, totalSkillTags) {
  if (!profile || !assignment || !skillTag) return
  const assignmentKey = getNcmAssignmentKey(assignment)
  if (!assignmentKey) return

  const store = getAssignmentProgressStore(profile)
  const previous = readNcmAssignmentProgress(profile, assignmentKey)
  const completedSet = new Set(previous.completedSkillTags)
  completedSet.add(String(skillTag))
  const completedSkillTags = Array.from(completedSet)
  const now = Date.now()
  const total = Math.max(0, Number(totalSkillTags || 0))

  store[assignmentKey] = {
    kind: 'ncm',
    assignmentId: String(assignment?.id || ''),
    assignmentTitle: String(assignment?.title || ''),
    totalSkillTags: total,
    completedSkillTags,
    completedAt: total > 0 && completedSkillTags.length >= total
      ? now
      : Number(previous.completedAt || 0) || 0,
    updatedAt: now
  }
}

function getAssignmentProgressStore(profile) {
  if (!profile.assignmentProgress || typeof profile.assignmentProgress !== 'object') {
    profile.assignmentProgress = {}
  }
  return profile.assignmentProgress
}

export function peekNextNcmSkillTag(queue) {
  if (!Array.isArray(queue) || queue.length === 0) return ''
  return String(queue[0] || '').trim()
}
