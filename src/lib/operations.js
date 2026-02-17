/**
 * Central lista för räknesätt i elevvyer.
 * Om nya räknesätt tillkommer: lägg till id + label här.
 */
import { inferOperationFromProblemType } from './mathUtils'

export const OPERATION_LABELS = {
  addition: 'Addition',
  subtraction: 'Subtraktion',
  multiplication: 'Multiplikation',
  division: 'Division'
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
