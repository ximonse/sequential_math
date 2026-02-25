import {
  getSpeedTime,
  inferOperationFromProblemType as inferOperation,
  median
} from './mathUtils'

const ABSOLUTE_TIME_CAP_SECONDS = 180
const INTERRUPTION_HIDDEN_SECONDS = 20
const INTERRUPTION_BLUR_MIN_TIME_SECONDS = 90
const PERSONAL_OUTLIER_FACTOR = 2.8
const MIN_PERSONAL_BASELINE_SAMPLES = 6

export function deriveTimingMetrics(profile, problem, timeSpent, options = {}) {
  const rawTimeSec = Math.max(0, Number(timeSpent) || 0)
  const hiddenDurationSec = Math.max(0, Number(options?.interruption?.hiddenDurationSec) || 0)
  const blurCount = Math.max(0, Number(options?.interruption?.blurCount) || 0)
  const interruptionSuspected = hiddenDurationSec >= INTERRUPTION_HIDDEN_SECONDS
    || (blurCount > 0 && rawTimeSec >= INTERRUPTION_BLUR_MIN_TIME_SECONDS)
  const baselineTimes = getPersonalBaselineTimes(profile, problem)
  const personalMedianSec = median(baselineTimes)
  const personalBaselineCount = baselineTimes.length

  let excludedFromSpeed = false
  let exclusionReason = null

  if (rawTimeSec <= 0) {
    excludedFromSpeed = true
    exclusionReason = 'invalid_time'
  } else if (rawTimeSec > ABSOLUTE_TIME_CAP_SECONDS) {
    excludedFromSpeed = true
    exclusionReason = 'hard_cap'
  } else if (interruptionSuspected) {
    excludedFromSpeed = true
    exclusionReason = 'interruption'
  } else if (
    personalBaselineCount >= MIN_PERSONAL_BASELINE_SAMPLES
    && Number.isFinite(personalMedianSec)
    && rawTimeSec > Math.max(45, personalMedianSec * PERSONAL_OUTLIER_FACTOR)
  ) {
    excludedFromSpeed = true
    exclusionReason = 'personal_outlier'
  }

  return {
    rawTimeSec,
    speedTimeSec: excludedFromSpeed ? null : rawTimeSec,
    excludedFromSpeed,
    exclusionReason,
    interruptionSuspected,
    hiddenDurationSec,
    blurCount,
    personalMedianSec,
    personalBaselineCount
  }
}

export function classifyErrorCategory(problem, studentAnswer, correct, options = {}, errorAnalysis = null) {
  if (correct) return 'none'

  const domainCategory = String(errorAnalysis?.category || '').trim().toLowerCase()
  if (domainCategory === 'inattention' || domainCategory === 'knowledge' || domainCategory === 'misconception') {
    return domainCategory
  }

  if (!options?.isMixedMode) return 'knowledge'

  const a = Number(problem?.values?.a)
  const b = Number(problem?.values?.b)
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 'knowledge'

  if (problem?.type === 'subtraction') {
    const inattentiveCandidate = a + b
    if (Math.abs(studentAnswer - inattentiveCandidate) < 0.0001) {
      return 'inattention'
    }
  }

  return 'knowledge'
}

export function getStartOfWeekTimestamp() {
  const now = new Date()
  const day = now.getDay() // 0 = söndag, 1 = måndag
  const diffToMonday = day === 0 ? 6 : day - 1
  now.setDate(now.getDate() - diffToMonday)
  now.setHours(0, 0, 0, 0)
  return now.getTime()
}

function getPersonalBaselineTimes(profile, problem) {
  const recent = Array.isArray(profile?.recentProblems) ? profile.recentProblems : []
  if (recent.length === 0) return []

  const skillTag = String(problem?.metadata?.skillTag || problem?.template || '')
  const templateId = String(problem?.template || '')
  const level = Math.round(Number(problem?.difficulty?.conceptual_level || 1))
  const operation = inferOperation(templateId)

  const valid = recent.filter(item => Number.isFinite(getSpeedTime(item)))

  const bySkill = valid.filter(item => {
    const itemLevel = Math.round(Number(item?.difficulty?.conceptual_level || item?.targetLevel || 1))
    return String(item.skillTag || '') === skillTag && itemLevel === level
  })
  if (bySkill.length >= 4) {
    return bySkill.slice(-20).map(item => getSpeedTime(item)).filter(Number.isFinite)
  }

  const byOperationLevel = valid.filter(item => {
    const itemLevel = Math.round(Number(item?.difficulty?.conceptual_level || item?.targetLevel || 1))
    return inferOperation(item.problemType) === operation && itemLevel === level
  })
  if (byOperationLevel.length > 0) {
    return byOperationLevel.slice(-25).map(item => getSpeedTime(item)).filter(Number.isFinite)
  }

  return valid.slice(-25).map(item => getSpeedTime(item)).filter(Number.isFinite)
}
