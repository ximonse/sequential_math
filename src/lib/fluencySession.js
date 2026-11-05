const FLUENCY_SKILLS = ['number_bonds', 'doubles']

export const FLUENCY_DEFAULT_TARGET = 20
export const FLUENCY_BREAK_EVERY = 15
export const FLUENCY_PRAISE_AT = 8
export const FLUENCY_BREAK_MINUTES = 2

const PRAISE_MESSAGES = ['Starkt jobbat!!', 'Snyggt! Fortsätt så!', 'Du är på gång!', 'Riktigt bra kämpat!']

export function isFluencyAssignment(assignment) {
  const types = assignment?.problemTypes
  return Array.isArray(types) && types.length > 0 && types.every(type => FLUENCY_SKILLS.includes(type))
}

// A focused free lap runs to its highest level; teacher task caps remain explicit.
export function getFluencyPractice(assignment, mode, fixedLevel) {
  if (assignment) return isFluencyAssignment(assignment) ? assignment : null
  if (mode !== 'number_bonds' || Number(fixedLevel) > 0) return null
  return { problemTypes: ['number_bonds'], minLevel: 1, maxLevel: 12, freeLap: true }
}

export function getFluencyTarget(assignment) {
  if (assignment?.freeLap) return Infinity
  const target = Number(assignment?.targetCount)
  return Number.isFinite(target) && target > 0 ? Math.floor(target) : FLUENCY_DEFAULT_TARGET
}

export const FLUENCY_LAP_STREAK = 3

function clampLevel(level, fallback, maximum = 12) {
  const value = Math.round(Number(level))
  return Number.isFinite(value) ? Math.max(1, Math.min(maximum, value)) : fallback
}

export function getFluencyLevelRange(assignment) {
  const maximum = 12
  const min = clampLevel(assignment?.minLevel, 1, maximum)
  return [min, Math.max(min, clampLevel(assignment?.maxLevel, maximum, maximum))]
}

// Finish only after completing the top level's streak, including on every restarted lap.
export function isFluencyTopLevelFinish(problem, correct, assignment, lap) {
  return Boolean(correct) && Number(problem?.level) >= getFluencyLevelRange(assignment)[1]
    && (!lap || Number(lap.streak) >= FLUENCY_LAP_STREAK)
    && (!(problem?.skill === 'number_bonds' && Number(problem?.level) >= 10) || lap?.targets?.length === 3)
}

// A restarted lap climbs from the bottom again: one level up per streak of correct answers.
export function startFluencyLap(assignment) {
  return { level: getFluencyLevelRange(assignment)[0], streak: 0 }
}

export function advanceFluencyLap(lap, correct, assignment, problem = null) {
  if (!lap) return lap
  if (!correct) return { ...lap, streak: 0 }
  if (problem?.skill === 'number_bonds' && lap.level >= 10) {
    const targets = [...new Set([...(lap.targets || []), Number(problem?.values?.target)])].filter(value => [10, 15, 20].includes(value))
    const streak = lap.streak + 1
    if (streak >= FLUENCY_LAP_STREAK && targets.length === 3 && lap.level < getFluencyLevelRange(assignment)[1]) {
      return { level: lap.level + 1, streak: 0 }
    }
    return { ...lap, streak, targets }
  }
  const streak = lap.streak + 1
  if (streak < FLUENCY_LAP_STREAK || lap.level >= getFluencyLevelRange(assignment)[1]) return { ...lap, streak }
  return { level: lap.level + 1, streak: 0 }
}

// What should happen after the pupil's Nth answer: finish, break, praise, or nothing.
export function getFluencyStep(answered, target) {
  if (answered >= target) return { kind: 'done' }
  if (answered % FLUENCY_BREAK_EVERY === 0) return { kind: 'break' }
  if (answered % FLUENCY_BREAK_EVERY === FLUENCY_PRAISE_AT) {
    return { kind: 'praise', message: PRAISE_MESSAGES[Math.floor(answered / FLUENCY_BREAK_EVERY) % PRAISE_MESSAGES.length] }
  }
  return { kind: 'none' }
}
