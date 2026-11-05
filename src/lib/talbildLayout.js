import { pickFromRotation } from './rotationPicker.js'
import { recordCoverageSample, fluencyLevelTargetSec } from './coverageFluency.js'

export const DIE_SIZE = 240
export const BASE_DOT_SIZE = 22
export const MAX_TALBILD_LEVEL = 3

const DOT_GAP_PX = 10
const EDGE_MARGIN_PX = 26
const MAX_PLACEMENT_ATTEMPTS = 400

export const DICE_PATTERNS = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[50, 50], [25, 25], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]]
}

function canonicalDots(count) {
  return (DICE_PATTERNS[count] || []).map(([x, y]) => ({ x, y, size: BASE_DOT_SIZE }))
}

function splitCounts(value, level, rng) {
  if (value <= 5) return [value]
  if (level >= 1) {
    const options = []
    for (let left = 1; left <= 5; left += 1) {
      if (value - left >= 1 && value - left <= 5 && left !== 5) options.push(left)
    }
    if (options.length > 0) {
      const left = options[Math.floor(rng() * options.length)]
      return [left, value - left]
    }
  }
  return [5, value - 5]
}

export function nextTalbildValue(previousValue, rng = Math.random) {
  if (!Number.isInteger(previousValue) || previousValue < 1 || previousValue > 10) {
    return Math.floor(rng() * 10) + 1
  }
  return ((previousValue - 1 + Math.floor(rng() * 9) + 1) % 10) + 1
}

// Rejection sampling with pairwise minimum distance; null when the die is too crowded.
function scatterDots(count, varySizes, rng) {
  const inner = DIE_SIZE - 6
  const dots = []
  for (let index = 0; index < count; index += 1) {
    const size = varySizes ? 16 + Math.round(rng() * 16) : BASE_DOT_SIZE
    let placed = false
    for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS && !placed; attempt += 1) {
      const margin = EDGE_MARGIN_PX + size / 2
      const px = margin + rng() * (inner - margin * 2)
      const py = margin + rng() * (inner - margin * 2)
      const clear = dots.every(dot => (
        Math.hypot(dot.px - px, dot.py - py) >= (dot.size + size) / 2 + DOT_GAP_PX
      ))
      if (clear) {
        dots.push({ px, py, size })
        placed = true
      }
    }
    if (!placed) return null
  }
  return dots.map(dot => ({ x: (dot.px / inner) * 100, y: (dot.py / inner) * 100, size: dot.size }))
}

function arrangeDie(count, level, rng) {
  if (level >= 2) {
    for (let retry = 0; retry < 5; retry += 1) {
      const scattered = scatterDots(count, level >= 3, rng)
      if (scattered) return scattered
    }
  }
  return canonicalDots(count)
}

// level 0 = classic dice, 1 = uneven split, 2 = scattered, 3 = scattered + varied dot sizes.
export function createTalbildLayout(value, level = 0, rng = Math.random) {
  const counts = splitCounts(value, level, rng)
  return counts.map(count => arrangeDie(count, level, rng))
}

export const TALBILD_LEVEL_COUNT = 12
export const TALBILD_ADVANCE_MAX_MS = 2000

// Internal progress levels are 0–11; layout stages remain 0–3.
export function talbildLayoutStage(level) {
  return level < 6 ? 0 : level < 8 ? 1 : level < 10 ? 2 : 3
}

export function nextTalbildLevel(level, recent) {
  let samples = {}
  const required = Array.from({ length: 10 }, (_, i) => String(i + 1))
  const targetSec = fluencyLevelTargetSec(level + 1)
  for (const entry of recent) {
    const round = recordCoverageSample(samples, String(entry.correctAnswer), entry.timeMs / 1000,
      entry.isCorrect, required, targetSec)
    samples = round.samples
    if (round.complete) return { level: Math.min(11, level + 1), resetWindow: true, complete: level === 11 }
  }
  return { level, resetWindow: false }
}


export function nextTalbildRoundValue(previous, level) {
  const values = Array.from({ length: 10 }, (_, i) => i + 1)
  const key = `talbild:level${level}`
  const first = Number(pickFromRotation(key, values))
  return first === previous ? Number(pickFromRotation(key, values)) : first
}
