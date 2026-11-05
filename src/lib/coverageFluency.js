// Each item has one vote in the mean; repeating easy items cannot hide a slow one.
export function recordCoverageSample(samples, key, seconds, correct, requiredKeys, targetSec) {
  if (!correct || !Number.isFinite(seconds) || seconds <= 0 || !requiredKeys.includes(key)) {
    return { samples: {}, complete: false }
  }
  const next = { ...samples, [key]: seconds }
  if (!requiredKeys.every(item => Number.isFinite(next[item]))) return { samples: next, complete: false }
  const meanSec = requiredKeys.reduce((sum, item) => sum + next[item], 0) / requiredKeys.length
  return { samples: {}, complete: meanSec < targetSec, meanSec }
}

export const FOUNDATION_TARGETS_SEC = [10, 8, 6, 4, 3, 2]

export function numberBondTargets(level) {
  return level <= 6 ? [10] : level <= 8 ? [15] : level <= 10 ? [20] : [10, 15, 20]
}

export function numberBondCoverageKeys(level) {
  return numberBondTargets(level).flatMap(target => Array.from({ length: target + 1 }, (_, term) => `${target}:${term}`))
}

export function fluencyLevelTargetSec(level) {
  return level <= 6 ? FOUNDATION_TARGETS_SEC[level - 1] : level % 2 === 1 ? 5 : 2
}
