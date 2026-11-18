import { summarizeDiagnosticObservation } from './diagnosticObservation.js'
import { diagnosticWorkAnalysis } from './diagnosticWorkAnalysis.js'

// Share the existing versioned rules; the class matrix must not invent diagnoses.
export function summarizeDiagnosticScreening(task, snapshot, work) {
  const observation = summarizeDiagnosticObservation(task, snapshot)
  if (task.operation === 'geometry_response') return { explicitAnswer: observation.explicitAnswer,
    expectedAnswer: observation.expectedAnswer, answerStatus: observation.answerStatus, signals: [] }
  return { explicitAnswer: observation.explicitAnswer, expectedAnswer: observation.expectedAnswer,
    answerStatus: observation.answerStatus, signals: diagnosticWorkSignals(work ?? diagnosticWorkAnalysis(task, snapshot)) }
}

// The former signal M (larger minus smaller, one task only) is left to the error
// model, which covers every task and shows on the misconception cards (2026-11-18, K7).
export function diagnosticWorkSignals({ columnAlignment: column, visibleResult: visible }) {
  const signals = []
  if (column.status === 'observed' && column.alignment === 'misaligned') signals.push({
    code: 'P', label: 'Entalen står i olika kolumner',
    message: 'Uppställningen är förskjuten. Detta visar placeringen, inte orsaken.' })
  if (visible.status === 'observed' && visible.consistency === 'different') signals.push({
    code: 'Ö', label: 'Olika svar i häfte och svarsfält',
    message: `${visible.visibleResult} i räknehäftet och ${visible.explicitAnswer} i svarsfältet. Skillnaden bevisar inte slarv.` })
  return signals
}
