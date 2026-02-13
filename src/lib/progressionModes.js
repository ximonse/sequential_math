export const PROGRESSION_MODE_CHALLENGE = 'challenge'
export const PROGRESSION_MODE_STEADY = 'steady'

export const PROGRESSION_MODE_LABELS = {
  [PROGRESSION_MODE_CHALLENGE]: 'Utmaning',
  [PROGRESSION_MODE_STEADY]: 'Lugn'
}

export function normalizeProgressionMode(value, fallback = PROGRESSION_MODE_CHALLENGE) {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === PROGRESSION_MODE_CHALLENGE) return PROGRESSION_MODE_CHALLENGE
  if (normalized === PROGRESSION_MODE_STEADY) return PROGRESSION_MODE_STEADY
  return fallback
}

export function getProgressionModeLabel(mode) {
  const normalized = normalizeProgressionMode(mode)
  return PROGRESSION_MODE_LABELS[normalized] || PROGRESSION_MODE_LABELS[PROGRESSION_MODE_CHALLENGE]
}
