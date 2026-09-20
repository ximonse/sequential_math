export const TRAINING_CONTEXT_VERSION = 1

export const TRAINING_MODES = Object.freeze({
  FREE_ADAPTIVE: 'free_adaptive',
  AREA_FOCUS: 'area_focus',
  LEVEL_FOCUS: 'level_focus',
  TEACHER_ADAPTIVE: 'teacher_adaptive',
  TEACHER_LOCKED: 'teacher_locked',
  NCM_ASSIGNMENT: 'ncm_assignment',
  TABLE_DRILL: 'table_drill'
})

export const TRAINING_SOURCES = Object.freeze({
  FREE_TRAINING: 'free_training',
  STUDENT_FOCUS: 'student_focus',
  TEACHER_ASSIGNMENT: 'teacher_assignment'
})

const KNOWN_MODES = new Set(Object.values(TRAINING_MODES))
const KNOWN_SOURCES = new Set(Object.values(TRAINING_SOURCES))

function cleanString(value, maxLength = 100) {
  return String(value || '').trim().slice(0, maxLength)
}

function cleanSkills(values) {
  if (!Array.isArray(values)) return []
  return Array.from(new Set(values
    .map(value => cleanString(value))
    .filter(Boolean)))
    .slice(0, 20)
}

function cleanLevel(value) {
  const numeric = Number(value)
  if (!Number.isInteger(numeric) || numeric < 1 || numeric > 12) return null
  return numeric
}

function cleanLevelRange(minLevel, maxLevel) {
  const min = cleanLevel(minLevel)
  const max = cleanLevel(maxLevel)
  if (min === null || max === null || min > max) return null
  return [min, max]
}

function cleanTableSet(values) {
  if (!Array.isArray(values)) return []
  return Array.from(new Set(values
    .map(Number)
    .filter(value => Number.isInteger(value) && value >= 2 && value <= 12)))
    .sort((a, b) => a - b)
}

export function buildTrainingContext({
  sessionId,
  assignment,
  mode,
  fixedLevel,
  isTableDrill = false,
  tableSet = [],
  freeOps = [],
  progressionMode = ''
} = {}) {
  const frameId = cleanString(sessionId, 200)
  const assignmentId = cleanString(assignment?.id)
  const assignmentKind = assignment?.kind === 'ncm' ? 'ncm' : assignment ? 'standard' : ''
  const selectedMode = cleanString(mode)
  const selectedLevel = cleanLevel(fixedLevel)
  const normalizedTables = cleanTableSet(tableSet)
  const normalizedFreeOps = cleanSkills(freeOps)

  const base = {
    version: TRAINING_CONTEXT_VERSION,
    frameId,
    mode: TRAINING_MODES.FREE_ADAPTIVE,
    source: TRAINING_SOURCES.FREE_TRAINING,
    assignmentId: '',
    assignmentKind: '',
    allowedSkills: normalizedFreeOps,
    levelRange: null,
    tableSet: [],
    progressionMode: cleanString(progressionMode, 40)
  }

  if (isTableDrill || normalizedTables.length > 0) {
    return {
      ...base,
      mode: TRAINING_MODES.TABLE_DRILL,
      source: TRAINING_SOURCES.STUDENT_FOCUS,
      allowedSkills: ['multiplication'],
      tableSet: normalizedTables
    }
  }

  if (assignmentKind === 'ncm') {
    return {
      ...base,
      mode: TRAINING_MODES.NCM_ASSIGNMENT,
      source: TRAINING_SOURCES.TEACHER_ASSIGNMENT,
      assignmentId,
      assignmentKind,
      allowedSkills: cleanSkills(assignment?.ncmAbilityTags)
    }
  }

  if (assignmentKind === 'standard') {
    const levelRange = cleanLevelRange(assignment?.minLevel, assignment?.maxLevel)
    return {
      ...base,
      mode: levelRange && levelRange[0] === levelRange[1]
        ? TRAINING_MODES.TEACHER_LOCKED
        : TRAINING_MODES.TEACHER_ADAPTIVE,
      source: TRAINING_SOURCES.TEACHER_ASSIGNMENT,
      assignmentId,
      assignmentKind,
      allowedSkills: cleanSkills(assignment?.problemTypes),
      levelRange
    }
  }

  if (selectedMode && selectedLevel !== null) {
    return {
      ...base,
      mode: TRAINING_MODES.LEVEL_FOCUS,
      source: TRAINING_SOURCES.STUDENT_FOCUS,
      allowedSkills: [selectedMode],
      levelRange: [selectedLevel, selectedLevel]
    }
  }

  if (selectedMode) {
    return {
      ...base,
      mode: TRAINING_MODES.AREA_FOCUS,
      source: TRAINING_SOURCES.STUDENT_FOCUS,
      allowedSkills: [selectedMode]
    }
  }

  return base
}

export function isValidTrainingContext(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  if (!Number.isInteger(Number(value.version)) || Number(value.version) < 1) return false
  if (typeof value.frameId !== 'string' || value.frameId.length > 200) return false
  if (!KNOWN_MODES.has(value.mode) || !KNOWN_SOURCES.has(value.source)) return false
  if (typeof value.assignmentId !== 'string' || value.assignmentId.length > 100) return false
  if (!['', 'standard', 'ncm'].includes(value.assignmentKind)) return false
  if (!Array.isArray(value.allowedSkills) || value.allowedSkills.length > 20
    || value.allowedSkills.some(skill => typeof skill !== 'string' || !skill || skill.length > 100)) return false
  if (value.levelRange !== null && (!Array.isArray(value.levelRange)
    || value.levelRange.length !== 2
    || value.levelRange.some(level => !Number.isInteger(Number(level)) || Number(level) < 1 || Number(level) > 12)
    || Number(value.levelRange[0]) > Number(value.levelRange[1]))) return false
  if (!Array.isArray(value.tableSet) || value.tableSet.length > 11
    || value.tableSet.some(table => !Number.isInteger(Number(table)) || Number(table) < 2 || Number(table) > 12)) return false
  if (typeof value.progressionMode !== 'string' || value.progressionMode.length > 40) return false
  return true
}
