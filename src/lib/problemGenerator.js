/**
 * Problem Generator - Genererar matematikproblem från templates
 */

import { additionTemplates, getTemplateByLevel } from '../data/templates/additionTemplates'

/**
 * Generera ett slumptal inom intervall
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
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
    const sum = parseInt(aStr[i]) + parseInt(bStr[i]) + carry
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
    const a = randomInt(constraints.a.min, constraints.a.max)
    const b = randomInt(constraints.b.min, constraints.b.max)

    // Beräkna resultat
    let result
    switch (type) {
      case 'addition':
        result = a + b
        break
      case 'subtraction':
        result = a - b
        break
      case 'multiplication':
        result = a * b
        break
      case 'division':
        result = Math.floor(a / b)
        break
      default:
        result = a + b
    }

    // Validera

    // 1. Resultat inom gränser
    if (constraints.result) {
      if (constraints.result.min && result < constraints.result.min) continue
      if (constraints.result.max && result > constraints.result.max) continue
    }

    // 2. Tiövergang-krav
    if (type === 'addition') {
      const problemHasCarry = hasCarry(a, b)
      if (difficulty.procedural.requires_carry && !problemHasCarry) continue
      if (!difficulty.procedural.requires_carry && problemHasCarry) continue
    }

    // 3. Inte trivialt
    if (isTrivial(a, b)) continue

    // 4. Inte förvirrande
    if (isConfusing(a, b)) continue

    // Slumpa ordning för mixed_digits templates
    let finalA = a
    let finalB = b
    let termOrder = 'equal'

    if (template.difficulty.procedural.mixed_digits) {
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

    // Räkna tiövergångar
    const carryCount = countCarries(finalA, finalB)

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
        carryCount
      },
      generated_at: Date.now()
    }
  }

  // Fallback om vi inte lyckas generera
  console.warn(`Could not generate valid problem for ${template.id} after ${maxAttempts} attempts`)

  const a = constraints.a.min
  const b = constraints.b.min
  return {
    id: `${template.id}_fallback_${Date.now()}`,
    template: template.id,
    type: template.type,
    values: { a, b },
    result: a + b,
    difficulty: template.difficulty,
    metadata: {
      ...template.metadata,
      termOrder: 'equal',
      carryCount: countCarries(a, b)
    },
    generated_at: Date.now()
  }
}

/**
 * Generera problem baserat på svårighetsgrad
 */
export function generateByDifficulty(level) {
  const template = getTemplateByLevel(level)
  if (!template) {
    // Fallback till närmaste nivå
    const closest = additionTemplates.reduce((prev, curr) => {
      const prevDiff = Math.abs(prev.difficulty.conceptual_level - level)
      const currDiff = Math.abs(curr.difficulty.conceptual_level - level)
      return currDiff < prevDiff ? curr : prev
    })
    return generateProblem(closest)
  }
  return generateProblem(template)
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
