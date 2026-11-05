import { candidatesForEvidence } from '../domains/predictableErrors/index.js'

const pick = (value, keys) => Object.fromEntries(keys.filter(key => value?.[key] !== undefined).map(key => [key, value[key]]))

// Same source projection in API evidence, class view and detailed CSV. Historical
// grading/labels are retained, and current candidates never update the source.
export function practiceObservation(value) {
  const status = value.isPartial === true ? 'partial' : value.correct === true ? 'correct'
    : value.correct === false ? 'incorrect' : 'unknown'
  return {
    question: pick(value, ['problemId', 'domain', 'skill', 'operation', 'problemType', 'promptText', 'values']),
    answer: { status, studentAnswer: value.studentAnswer ?? null, correctAnswer: value.correctAnswer ?? null,
      partialCode: value.partialCode ?? null, partialDetail: value.partialDetail ?? null },
    context: pick(value, ['classIdAtAttempt', 'level', 'targetLevel', 'contentSkill', 'contentLevel',
      'evidenceSkill', 'evidenceLevel', 'evidenceClass', 'evidenceRuleVersion', 'trainingContext',
      'trainingMode', 'trainingPurpose', 'timeSpent', 'speedTimeSec', 'excludedFromSpeed',
      'speedExclusionReason', 'interruptionSuspected']),
    interpretation: { category: ['none', 'knowledge', 'inattention', 'misconception', 'input'].includes(value.errorCategory) ? value.errorCategory : 'unknown',
      patterns: Array.isArray(value.errorPatterns) ? value.errorPatterns : Array.isArray(value.patterns) ? value.patterns : [],
      detail: value.errorDetail ?? null }
  }
}

export function currentPracticeCandidates(value) {
  return candidatesForEvidence({ source: 'practice', ...practiceObservation(value) })
}
