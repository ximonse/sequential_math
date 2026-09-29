import { getSpeedTime } from './mathUtils.js'
import { getFluencyTargetSec, MASTERY_MIN_ATTEMPTS } from './operations.js'

function median(values) {
  const sorted = values
    .filter(value => Number.isFinite(value))
    .sort((left, right) => left - right)
  if (sorted.length === 0) return null
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle]
}

export function applyFluencyMasteryRequirement({
  mastery,
  problems,
  operation,
  level,
  windowSize,
  minSamples = MASTERY_MIN_ATTEMPTS,
  countsAsMastery
}) {
  const targetSec = getFluencyTargetSec(operation, level)
  if (!Number.isFinite(targetSec)) return mastery

  const recent = problems.slice(-windowSize)
  const samples = recent
    .filter(problem => (
      countsAsMastery(problem)
      && !problem?.excludedFromSpeed
      && !problem?.interruptionSuspected
    ))
    .map(problem => getSpeedTime(problem))
    .filter(value => Number.isFinite(value) && value > 0)
  const medianSpeedSec = median(samples)
  const fluencyMastered = samples.length >= minSamples && medianSpeedSec <= targetSec

  return {
    ...mastery,
    isMastered: mastery.isMastered && fluencyMastered,
    fluency: {
      targetSec,
      samples: samples.length,
      medianSpeedSec,
      isMastered: fluencyMastered
    }
  }
}
