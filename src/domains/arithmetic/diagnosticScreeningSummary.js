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

export function diagnosticWorkSignals({ columnAlignment: column, visibleResult: visible, subtractionPattern: subtraction }) {
  const signals = []
  if (column.status === 'observed' && column.alignment === 'misaligned') signals.push({
    code: 'P', label: 'Entalen står i olika kolumner',
    message: 'Uppställningen är förskjuten. Detta visar placeringen, inte orsaken.' })
  if (visible.status === 'observed' && visible.consistency === 'different') signals.push({
    code: 'Ö', label: 'Olika svar i häfte och svarsfält',
    message: `${visible.visibleResult} i räknehäftet och ${visible.explicitAnswer} i svarsfältet. Skillnaden bevisar inte slarv.` })
  if (subtraction.status === 'matched') signals.push({ code: 'M', label: 'Möjligt subtraktionsmönster',
    message: 'Resultatet är förenligt med större minus mindre i varje kolumn. Mönstret bevisar inte metoden.' })
  return signals
}
