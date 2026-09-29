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

// What should happen after the pupil's Nth answer: finish, break, praise, or nothing.
export function getFluencyStep(answered, target) {
  if (answered >= target) return { kind: 'done' }
  if (answered % FLUENCY_BREAK_EVERY === 0) return { kind: 'break' }
  if (answered % FLUENCY_BREAK_EVERY === FLUENCY_PRAISE_AT) {
    return { kind: 'praise', message: PRAISE_MESSAGES[Math.floor(answered / FLUENCY_BREAK_EVERY) % PRAISE_MESSAGES.length] }
  }
  return { kind: 'none' }
}
