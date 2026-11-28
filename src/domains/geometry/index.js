import { attachEvidenceClaim, EVIDENCE_CLASSES } from '../../lib/evidenceContract.js'
import { choiceObservation, normalizeImageQuestion } from '../arithmetic/screeningImageQuestions.js'
import { decodeGeometrySelection, encodeGeometrySelection, geometryQuestionById, geometryQuestions } from './questions.js'
import { geometryGroups } from './groups.js'

function generate(skill, level, { recentGeometry } = {}) {
  const bank = geometryQuestions[skill].filter(task => task.minimumLevel <= level)
  const lastId = recentGeometry?.findLast(entry => entry.skill === skill)?.values?.geometryTaskId
  const next = (bank.findIndex(task => task.taskId === lastId) + 1) % bank.length
  const entry = bank[next]
  const options = [...entry.options]
  for (let index = options.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1))
    const option = options[index]
    options[index] = options[other]
    options[other] = option
  }
  return attachEvidenceClaim({
    domain: 'geometry', skill, level, type: skill,
    display: { text: entry.promptSv },
    choiceTask: { ...entry, options },
    values: { geometryTaskId: entry.taskId, geometryVersion: entry.taskVersion, geometryConcept: entry.concept,
      optionOrder: options.map(option => option.id) },
    difficulty: { conceptual_level: level },
    answer: { type: 'choice', correct: encodeGeometrySelection(entry.correctOptionIds) },
    metadata: {}
  }, { class: EVIDENCE_CLASSES.PRACTICE_ONLY })
}

function verifyContent(problem) {
  const { geometryTaskId, geometryVersion, geometryConcept, optionOrder } = problem.values || {}
  const entry = geometryQuestionById[geometryTaskId]
  if (!entry || entry.taskVersion !== geometryVersion || entry.concept !== geometryConcept || entry.skill !== problem.skill) {
    return { valid: false, reason: 'Unknown geometry question' }
  }
  const normalized = normalizeImageQuestion(problem.choiceTask)
  const options = normalized.options.map(option => option.id)
  const expectedOptions = new Map(entry.options.map(option => [option.id, option]))
  const valid = encodeGeometrySelection(options) === encodeGeometrySelection(entry.options.map(option => option.id))
    && normalized.options.every(option => JSON.stringify(option) === JSON.stringify(expectedOptions.get(option.id)))
    && JSON.stringify(normalized.images) === JSON.stringify(entry.images)
    && normalized.responseMode === entry.responseMode && problem.display?.text === entry.promptSv
    && problem.choiceTask.explanationSv === entry.explanationSv
    && JSON.stringify(optionOrder) === JSON.stringify(options)
    && encodeGeometrySelection(entry.correctOptionIds) === problem.answer.correct
    && encodeGeometrySelection(normalized.correctOptionIds) === problem.answer.correct
  return { valid, reason: valid ? '' : 'Geometry options or answer differ from the bank' }
}

export default {
  id: 'geometry', label: 'Geometri',
  skills: Object.entries(geometryGroups).map(([id, label]) => ({ id, label, levels: [1, 2] })),
  generate, verifyContent,
  evaluate(problem, answer) {
    const observation = choiceObservation(problem.choiceTask, { selectedOptionIds: decodeGeometrySelection(answer) })
    const correct = observation.answerStatus === 'correct'
    return { correct, isReasonable: correct, correctAnswer: problem.answer.correct }
  },
  analyzeError(problem, answer) {
    return { category: problem.answer.correct === answer ? 'none' : 'unclassified', patterns: [], detail: '' }
  }
}
