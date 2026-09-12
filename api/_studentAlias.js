import { randomBytes } from 'node:crypto'

const COLORS = Object.freeze(['Blå', 'Grön', 'Gul', 'Lila', 'Röd', 'Silver', 'Vit'])
const NATURE = Object.freeze(['Måne', 'Sol', 'Stjärna', 'Tall', 'Vind', 'Äng', 'Ö'])
const OBJECTS = Object.freeze(['Bok', 'Bro', 'Drake', 'Fyr', 'Karta', 'Nyckel', 'Pil'])
const CREATURES = Object.freeze(['Björn', 'Ekorre', 'Fisk', 'Katt', 'Räv', 'Uggla', 'Varg'])
const ALIAS_WORD_COUNT = new Set([3, 4])
const MAX_ALIAS_ATTEMPTS = 200

function canonicalAlias(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('sv-SE')
}

function randomIndex(length, randomBytesFn) {
  const limit = 256 - (256 % length)
  for (;;) {
    const value = randomBytesFn(1)[0]
    if (value < limit) return value % length
  }
}

function pick(words, randomBytesFn) {
  return words[randomIndex(words.length, randomBytesFn)]
}

function normalizeTakenAliases(taken) {
  if (taken == null) return new Set()
  if (!(taken instanceof Set) && !Array.isArray(taken)) {
    throw new TypeError('taken must be a Set or an array')
  }
  return new Set([...taken].map(canonicalAlias).filter(Boolean))
}

/**
 * Generates a child-safe, name-independent display alias. The alias is not an
 * authenticator; use the QR secret and PIN for authentication.
 */
export function generateDisplayAlias({ taken, randomBytesFn = randomBytes, wordCount } = {}) {
  if (typeof randomBytesFn !== 'function') throw new TypeError('randomBytesFn must be a function')
  if (wordCount != null && !ALIAS_WORD_COUNT.has(wordCount)) {
    throw new RangeError('wordCount must be 3 or 4')
  }
  const unavailable = normalizeTakenAliases(taken)
  const count = wordCount ?? (randomIndex(2, randomBytesFn) + 3)

  for (let attempt = 0; attempt < MAX_ALIAS_ATTEMPTS; attempt++) {
    const words = [pick(COLORS, randomBytesFn)]
    if (count === 4) words.push(pick(NATURE, randomBytesFn))
    words.push(pick(OBJECTS, randomBytesFn), pick(CREATURES, randomBytesFn))
    const alias = words.join(' ')
    if (!unavailable.has(canonicalAlias(alias))) return alias
  }

  throw new Error('Could not generate an unused student display alias')
}

export function isValidStudentDisplayAlias(alias) {
  const words = String(alias || '').trim().split(/\s+/).filter(Boolean)
  if (!ALIAS_WORD_COUNT.has(words.length)) return false
  const expected = words.length === 4
    ? [COLORS, NATURE, OBJECTS, CREATURES]
    : [COLORS, OBJECTS, CREATURES]
  return words.every((word, index) => expected[index].includes(word))
}

/** Returns a cryptographically random PIN with exactly four decimal digits. */
export function generateStudentPin({ randomBytesFn = randomBytes } = {}) {
  if (typeof randomBytesFn !== 'function') throw new TypeError('randomBytesFn must be a function')
  for (;;) {
    const bytes = randomBytesFn(2)
    const value = (bytes[0] << 8) | bytes[1]
    if (value < 60_000) return String(value % 10_000).padStart(4, '0')
  }
}

export const STUDENT_ALIAS_WORDS = Object.freeze({ colors: COLORS, nature: NATURE, objects: OBJECTS, creatures: CREATURES })
