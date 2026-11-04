import { analyzeDiagnosticColumnAlignment } from './diagnosticColumnAlignment.js'
import { analyzeDiagnosticVisibleResult } from './diagnosticVisibleResult.js'
import { analyzeDiagnosticSubtractionPattern } from './diagnosticSubtractionPattern.js'

// Strict reading and reading with exchange marks are separate named evidence
// layers. Consumers must not silently substitute one for the other.
export function diagnosticWorkAnalysis(task, snapshot) {
  if (task.operation === 'geometry_response') {
    const unavailable = { status: 'not_applicable', analysisVersion: 1 }
    return { columnAlignment: unavailable, visibleResult: unavailable, subtractionPattern: unavailable,
      visibleResultWithExchangeMarks: unavailable }
  }
  return { columnAlignment: analyzeDiagnosticColumnAlignment(task, snapshot),
    visibleResult: analyzeDiagnosticVisibleResult(task, snapshot),
    subtractionPattern: analyzeDiagnosticSubtractionPattern(task, snapshot),
    visibleResultWithExchangeMarks: analyzeDiagnosticVisibleResult(task, snapshot, { allowExchangeMarks: true }) }
}
