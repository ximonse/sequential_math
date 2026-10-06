import { summarizeDiagnosticObservation } from './diagnosticObservation.js'
import { analyzeDiagnosticColumnAlignment } from './diagnosticColumnAlignment.js'
import { analyzeDiagnosticVisibleResult } from './diagnosticVisibleResult.js'
import { analyzeDiagnosticSubtractionPattern } from './diagnosticSubtractionPattern.js'

// Share the existing versioned rules; the class matrix must not invent diagnoses.
export function summarizeDiagnosticScreening(task, snapshot) {
  const observation = summarizeDiagnosticObservation(task, snapshot)
  const column = analyzeDiagnosticColumnAlignment(task, snapshot)
  const visible = analyzeDiagnosticVisibleResult(task, snapshot)
  const subtraction = analyzeDiagnosticSubtractionPattern(task, snapshot)
  const signals = []
  if (column.status === 'observed' && column.alignment === 'misaligned') signals.push({
    code: 'P', label: 'Entalen står i olika kolumner',
    message: 'Uppställningen är förskjuten. Detta visar placeringen, inte orsaken.' })
  if (visible.status === 'observed' && visible.consistency === 'different') signals.push({
    code: 'Ö', label: 'Olika svar i häfte och svarsfält',
    message: `${visible.visibleResult} i räknehäftet och ${visible.explicitAnswer} i svarsfältet. Skillnaden bevisar inte slarv.` })
  if (subtraction.status === 'matched') signals.push({ code: 'M', label: 'Möjligt subtraktionsmönster',
    message: 'Resultatet är förenligt med större minus mindre i varje kolumn. Mönstret bevisar inte metoden.' })
  return { explicitAnswer: observation.explicitAnswer, expectedAnswer: observation.expectedAnswer,
    answerStatus: observation.answerStatus, signals }
}
