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

export function getFluencyTarget(assignment) {
  const target = Number(assignment?.targetCount)
  return Number.isFinite(target) && target > 0 ? Math.floor(target) : FLUENCY_DEFAULT_TARGET
}

export const FLUENCY_LAP_STREAK = 3

function clampLevel(level, fallback) {
  const value = Math.round(Number(level))
  return Number.isFinite(value) ? Math.max(1, Math.min(12, value)) : fallback
}

export function getFluencyLevelRange(assignment) {
  const min = clampLevel(assignment?.minLevel, 1)
  return [min, Math.max(min, clampLevel(assignment?.maxLevel, 12))]
}

// Any correct answer on the assignment's top level offers the pupil a choice.
export function isFluencyTopLevelFinish(problem, correct, assignment) {
  return Boolean(correct) && Number(problem?.level) >= getFluencyLevelRange(assignment)[1]
}

// A restarted lap climbs from the bottom again: one level up per streak of correct answers.
export function startFluencyLap(assignment) {
  return { level: getFluencyLevelRange(assignment)[0], streak: 0 }
}

export function advanceFluencyLap(lap, correct, assignment) {
  if (!lap) return lap
  if (!correct) return { ...lap, streak: 0 }
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
