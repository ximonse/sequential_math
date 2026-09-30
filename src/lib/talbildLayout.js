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

const WINDOW_SIZE = 5
const FAST_MS = 2600
const SLOW_MS = 5500

// Level climbs after five fast, correct answers in a row and drops after a slow or wrong-heavy window.
export function nextTalbildLevel(level, recent) {
  if (recent.length < WINDOW_SIZE) return { level, resetWindow: false }
  const window = recent.slice(-WINDOW_SIZE)
  const correct = window.filter(item => item.isCorrect)
  const avgMs = correct.length ? correct.reduce((sum, item) => sum + item.timeMs, 0) / correct.length : Infinity
  if (correct.length === WINDOW_SIZE && avgMs <= FAST_MS && level < MAX_TALBILD_LEVEL) {
    return { level: level + 1, resetWindow: true }
  }
  if ((correct.length <= 2 || avgMs >= SLOW_MS) && level > 0) {
    return { level: level - 1, resetWindow: true }
  }
  return { level, resetWindow: false }
}
