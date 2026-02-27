/**
 * Central lista för räknesätt i elevvyer.
 * Om nya räknesätt tillkommer: lägg till id + label här.
 */
import { inferOperationFromProblemType } from './mathUtils'

export const STANDARD_OPERATIONS = ['addition', 'subtraction', 'multiplication', 'division']

export const OPERATION_LABELS = {
  addition: 'Addition',
  subtraction: 'Subtraktion',
  multiplication: 'Multiplikation',
  division: 'Division',
  algebra_evaluate: 'Algebra (räkna ut)',
  algebra_simplify: 'Algebra (förenkla)',
  arithmetic_expressions: 'Uttryck (prioriteringsregler)',
  fractions: 'Bråk',
  percentage: 'Procenträkning'
}

/**
 * Lägsta nivå som faktiskt har templates/generering per operation.
 * Division börjar på nivå 3 (inga templates för 1-2).
 * Alla andra startar på 1.
 */
export const OPERATION_MIN_LEVEL = {
  division: 3
}

export function getOperationMinLevel(operation) {
  return OPERATION_MIN_LEVEL[operation] || 1
}

export function getOperationLabel(operation) {
  if (OPERATION_LABELS[operation]) return OPERATION_LABELS[operation]
  if (!operation) return 'Okänd'
  return operation.charAt(0).toUpperCase() + operation.slice(1)
}

// Backward-compatible named helper used across older modules.
export function inferOperation(problemType, fallback = 'unknown') {
  return inferOperationFromProblemType(problemType, {
    fallback,
    allowUnknownPrefix: false
  })
}
