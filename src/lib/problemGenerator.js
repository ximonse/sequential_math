/**
 * Problem Generator - Genererar matematikproblem från templates
 */

import { additionTemplates } from '../data/templates/additionTemplates'
import { multiplicationTemplates } from '../data/templates/multiplicationTemplates'
import { subtractionTemplates } from '../data/templates/subtractionTemplates'
import { divisionTemplates } from '../data/templates/divisionTemplates'

const allTemplates = [
  ...additionTemplates,
  ...subtractionTemplates,
  ...multiplicationTemplates,
  ...divisionTemplates
]

/**
 * Generera ett slumptal inom intervall
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Runda tal för att undvika flyttalsartefakter (t.ex. 0.1 + 0.2)
 */
function roundTo(value, decimals = 6) {
  const factor = 10 ** decimals
  return Math.round((value + Number.EPSILON) * factor) / factor
}

/**
 * Generera tal utifrån constraint (heltal eller decimal med step)
 */
function randomFromConstraint(constraint) {
  const { min, max, step } = constraint

  if (typeof step === 'number' && step > 0 && step < 1) {
    const steps = Math.floor((max - min) / step)
    const n = Math.floor(Math.random() * (steps + 1))
    return roundTo(min + n * step, 6)
  }

  return randomInt(min, max)
}

/**
 * Räkna antal tiövergångar i addition
 */
function countCarries(a, b) {
  const maxLen = Math.max(String(a).length, String(b).length)
  const aStr = String(a).padStart(maxLen, '0')
  const bStr = String(b).padStart(maxLen, '0')

  let carryCount = 0
  let carry = 0

  for (let i = aStr.length - 1; i >= 0; i--) {
    const sum = parseInt(aStr[i], 10) + parseInt(bStr[i], 10) + carry
    if (sum >= 10) {
      carryCount++
      carry = 1
    } else {
      carry = 0
    }
  }

  return carryCount
}

/**
 * Räkna antal växlingar (borrow) i subtraktion a - b
 */
function countBorrows(a, b) {
  const maxLen = Math.max(
    String(Math.floor(Math.abs(a))).length,
    String(Math.floor(Math.abs(b))).length
  )
  const aStr = String(Math.floor(Math.abs(a))).padStart(maxLen, '0')
  const bStr = String(Math.floor(Math.abs(b))).padStart(maxLen, '0')

  let borrowCount = 0
  let borrow = 0

  for (let i = aStr.length - 1; i >= 0; i--) {
    const top = parseInt(aStr[i], 10) - borrow
    const bottom = parseInt(bStr[i], 10)
    if (top < bottom) {
      borrowCount++
      borrow = 1
    } else {
      borrow = 0
    }
  }

  return borrowCount
}

/**
 * Kontrollera om addition har tiövergang (legacy, använder countCarries)
 */
function hasCarry(a, b) {
  return countCarries(a, b) > 0
}

/**
 * Kontrollera om problem är trivialt (t.ex. +0, +1)
 */
function isTrivial(a, b) {
  return a <= 1 || b <= 1
}

/**
 * Kontrollera om talen är för lika (förvirrande)
 */
function isConfusing(a, b) {
  // Exakt samma tal
  if (a === b) return true

  // Samma siffror i olika ordning (t.ex. 23 och 32)
  const aDigits = String(a).split('').sort().join('')
  const bDigits = String(b).split('').sort().join('')
  if (aDigits === bDigits && a !== b) return true

  return false
}

/**
 * Generera ett problem från en template
 */
export function generateProblem(template, maxAttempts = 100) {
  const { generator, difficulty, type } = template
  const { constraints } = generator

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Generera slumpmässiga värden
    const a = randomFromConstraint(constraints.a)
    const b = randomFromConstraint(constraints.b)

    // Beräkna resultat
    let result
    switch (type) {
      case 'addition':
        result = roundTo(a + b)
        break
      case 'subtraction':
        result = roundTo(a - b)
        break
      case 'multiplication':
        result = roundTo(a * b)
        break
      case 'division':
        result = roundTo(a / b)
        break
      default:
        result = roundTo(a + b)
    }

    // Validera

    // 1. Resultat inom gränser
    if (constraints.result) {
      const minResult = Number(constraints.result.min)
      const maxResult = Number(constraints.result.max)
      if (Number.isFinite(minResult) && result < minResult) continue
      if (Number.isFinite(maxResult) && result > maxResult) continue
    }

    // 2. Tiövergang-krav
    if (type === 'addition') {
      const problemHasCarry = hasCarry(a, b)
      if (difficulty.procedural.requires_carry && !problemHasCarry) continue
      if (!difficulty.procedural.requires_carry && problemHasCarry) continue
    }

    // 2b. Växlings-krav för subtraktion
    if (type === 'subtraction') {
      if (a <= b) continue
      const problemHasBorrow = countBorrows(a, b) > 0
      if (difficulty.procedural.requires_borrow && !problemHasBorrow) continue
      if (!difficulty.procedural.requires_borrow && problemHasBorrow) continue
    }

    // 2c. Exakt division (utan rest)
    if (type === 'division') {
      if (b === 0) continue
      const exactDivisionRequired = difficulty.procedural?.exact_division
      if (exactDivisionRequired && !Number.isInteger(a / b)) continue
    }

    // 3. Inte trivialt
    if (isTrivial(a, b)) continue

    // 4. Inte förvirrande
    if (isConfusing(a, b)) continue

    // Slumpa ordning för mixed_digits templates
    let finalA = a
    let finalB = b
    let termOrder = 'equal'

    const isCommutative = type === 'addition' || type === 'multiplication'
    if (template.difficulty.procedural.mixed_digits && isCommutative) {
      // Slumpa om vi ska ha stort eller litet tal först
      const bigFirst = Math.random() < 0.5
      if (a > b) {
        termOrder = bigFirst ? 'bigFirst' : 'smallFirst'
        if (!bigFirst) {
          finalA = b
          finalB = a
        }
      } else {
        termOrder = bigFirst ? 'bigFirst' : 'smallFirst'
        if (bigFirst) {
          finalA = b
          finalB = a
        }
      }
    }

    // Räkna tiövergångar/växlingar
    const carryCount = countCarries(finalA, finalB)
    const borrowCount = type === 'subtraction' ? countBorrows(finalA, finalB) : 0

    // Allt OK - returnera problem
    return {
      id: `${template.id}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      template: template.id,
      type: template.type,
      values: { a: finalA, b: finalB },
      result,
      difficulty: template.difficulty,
      metadata: {
        ...template.metadata,
        termOrder,
        carryCount,
        borrowCount
      },
      generated_at: Date.now()
    }
  }

  // Fallback om vi inte lyckas generera
  console.warn(`Could not generate valid problem for ${template.id} after ${maxAttempts} attempts`)

  const a = constraints.a.min
  const b = constraints.b.min
  let fallbackResult = a + b
  if (template.type === 'subtraction') fallbackResult = a - b
  if (template.type === 'multiplication') fallbackResult = roundTo(a * b)
  if (template.type === 'division') fallbackResult = roundTo(a / b)
  return {
    id: `${template.id}_fallback_${Date.now()}`,
    template: template.id,
    type: template.type,
    values: { a, b },
    result: fallbackResult,
    difficulty: template.difficulty,
    metadata: {
      ...template.metadata,
      termOrder: 'equal',
      carryCount: template.type === 'addition' ? countCarries(a, b) : 0,
      borrowCount: template.type === 'subtraction' ? countBorrows(a, b) : 0
    },
    generated_at: Date.now()
  }
}

/**
 * Generera problem baserat på svårighetsgrad
 */
export function generateByDifficulty(level) {
  return generateByDifficultyWithOptions(level, {})
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

export function generateMultiplicationTableDrillProblem(tableSet, options = {}) {
  const normalizedTables = Array.isArray(tableSet)
    ? tableSet
      .map(v => Number(v))
      .filter(v => Number.isInteger(v) && v >= 2 && v <= 12)
    : []

  const tables = normalizedTables.length > 0 ? normalizedTables : [2, 3, 4, 5]
  const table = tables[Math.floor(Math.random() * tables.length)]
  const level = clamp(Math.round(Number(options.level) || 4), 1, 12)

  let maxFactor = 6
  if (level >= 4) maxFactor = 10
  if (level >= 6) maxFactor = 12

  const other = randomInt(1, maxFactor)
  const tableFirst = Math.random() < 0.5
  const a = tableFirst ? table : other
  const b = tableFirst ? other : table
  const result = a * b

  return {
    id: `mul_table_${table}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    template: 'mul_table_drill',
    type: 'multiplication',
    values: { a, b },
    result,
    difficulty: {
      conceptual_level: clamp(level, 3, 6),
      cognitive_load: {
        working_memory: 1,
        steps_required: 1,
        intermediate_values: 0
      },
      procedural: {
        num_terms: 2,
        requires_carry: false,
        mixed_digits: false
      },
      magnitude: {
        a_digits: 1,
        b_digits: 1
      }
    },
    metadata: {
      table,
      skillTag: `mul_table_${table}`,
      selectionReason: 'table_drill',
      description: `Tabellovning ${table}:an`
    },
    generated_at: Date.now()
  }
}

/**
 * Generera problem baserat på svårighetsgrad med valfri styrning av räknesätt
 */
export function generateByDifficultyWithOptions(level, options = {}) {
  const { preferredType = null, allowedTypes = null } = options
  const targetLevel = clamp(Math.round(Number(level) || 1), 1, 12)

  const byTypeCandidates = Array.isArray(allowedTypes) && allowedTypes.length > 0
    ? allTemplates.filter(t => allowedTypes.includes(t.type))
    : allTemplates
  const candidates = byTypeCandidates.length > 0 ? byTypeCandidates : allTemplates

  const levelCandidates = candidates.filter(
    t => t.difficulty.conceptual_level === targetLevel
  )

  // Försök först med önskat räknesätt på exakt nivå
  if (preferredType) {
    const preferredAtLevel = levelCandidates.filter(t => t.type === preferredType)
    if (preferredAtLevel.length > 0) {
      const picked = preferredAtLevel[Math.floor(Math.random() * preferredAtLevel.length)]
      return generateProblem(picked)
    }
  }

  // Annars valfri template på exakt nivå
  if (levelCandidates.length > 0) {
    const picked = levelCandidates[Math.floor(Math.random() * levelCandidates.length)]
    return generateProblem(picked)
  }

  // Fallback: närmaste nivå, helst samma räknesätt om önskat
  const pool = preferredType
    ? candidates.filter(t => t.type === preferredType)
    : candidates
  const safePool = pool.length > 0 ? pool : allTemplates

  const closest = safePool.reduce((prev, curr) => {
    const prevDiff = Math.abs(prev.difficulty.conceptual_level - targetLevel)
    const currDiff = Math.abs(curr.difficulty.conceptual_level - targetLevel)
    return currDiff < prevDiff ? curr : prev
  })

  return generateProblem(closest)
}

/**
 * Formatera problem som sträng för visning
 */
export function formatProblem(problem) {
  const { values, type } = problem
  const { a, b } = values

  const operators = {
    addition: '+',
    subtraction: '-',
    multiplication: '×',
    division: '÷'
  }

  return `${a} ${operators[type]} ${b} = ?`
}
