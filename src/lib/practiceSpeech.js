export const PRACTICE_SPEECH_MODES = [
  ['manual', 'På begäran'],
  ['automatic', 'Automatiskt'],
  ['off', 'Avstängt']
]

export const DEFAULT_PRACTICE_SPEECH_MODE = 'manual'

export function resolvePracticeSpeechMode(assignment) {
  const mode = assignment?.speechMode
  if (PRACTICE_SPEECH_MODES.some(([value]) => value === mode)) return mode
  return assignment?.conceptSpeechByDefault === true ? 'automatic' : DEFAULT_PRACTICE_SPEECH_MODE
}
