import { figureRef, findScreeningFigure } from './screeningFigures.js'

export const isChoiceTask = task => ['single', 'multiple', 'name'].includes(task?.responseMode)
const validId = id => typeof id === 'string' && /^[A-Za-z0-9_-]{1,128}$/u.test(id)
export function validateImageReference(ref) {
  if (!ref || !['bank', 'upload'].includes(ref.source) || !validId(ref.id) || ref.version !== 1
    || (ref.source === 'bank' && !findScreeningFigure(ref.id, ref.version))) throw new Error('Ogiltig bildreferens.')
  return { source: ref.source, id: ref.id, version: ref.version }
}
export function normalizeImageQuestion(input) {
  if (!['single', 'multiple', 'name', 'text'].includes(input.responseMode)) throw new Error('Välj ett giltigt svarssätt.')
  const images = (input.images || []).map(validateImageReference)
  if (images.length > 8) throw new Error('Högst åtta frågebilder tillåts.')
  const base = { responseMode: input.responseMode, images, gridEnabled: false, drawingEnabled: false,
    operation: 'geometry_response', answerType: isChoiceTask(input) ? 'choice' : 'text',
    answerRule: isChoiceTask(input) ? 'exact_choices' : 'teacher_review' }
  if (!isChoiceTask(input)) {
    if (!images.length) throw new Error('Välj minst en bild.')
    return base
  }
  if (!Array.isArray(input.options) || input.options.length < 2 || input.options.length > 12) throw new Error('Ange 2–12 svarsalternativ.')
  const options = input.options.map(option => {
    if (!validId(option?.id)) throw new Error('Ogiltigt alternativ-ID.')
    if (input.responseMode === 'name') {
      if (typeof option.labelSv !== 'string' || !option.labelSv.trim() || option.labelSv.length > 100) throw new Error('Ange alternativens namn.')
      return { id: option.id, labelSv: option.labelSv.trim() }
    }
    return { id: option.id, image: validateImageReference(option.image) }
  })
  const correctOptionIds = input.correctOptionIds
  if (new Set(options.map(option => option.id)).size !== options.length
    || !Array.isArray(correctOptionIds) || !correctOptionIds.length
    || new Set(correctOptionIds).size !== correctOptionIds.length
    || correctOptionIds.some(id => !options.some(option => option.id === id))
    || (input.responseMode !== 'multiple' && correctOptionIds.length !== 1)
    || (input.responseMode === 'name' && !images.length)) throw new Error('Ange ett giltigt facit.')
  return { ...base, options, correctOptionIds: [...correctOptionIds] }
}
export function imageQuestionRefs(task) {
  return [...(task.images || []), ...(task.options || []).flatMap(option => option.image ? [option.image] : [])]
}
export function choiceObservation(task, snapshot) {
  const selected = snapshot.selectedOptionIds || []
  const expected = task.correctOptionIds || []
  const correctSelections = selected.filter(id => expected.includes(id))
  const missedOptions = expected.filter(id => !selected.includes(id))
  const incorrectSelections = selected.filter(id => !expected.includes(id))
  const describe = id => task.options.findIndex(option => option.id === id) + 1
  return { selectedOptionIds: selected, correctSelections, missedOptions, incorrectSelections,
    explicitAnswer: selected.length ? selected.map(id => task.options.find(option => option.id === id)?.labelSv || `Bild ${describe(id)}`).join(', ') : null,
    expectedAnswer: expected.map(id => task.options.find(option => option.id === id)?.labelSv || `Bild ${describe(id)}`).join(', '),
    answerStatus: !selected.length ? 'unanswered' : !missedOptions.length && !incorrectSelections.length ? 'correct' : 'incorrect' }
}
const option = (id, figure) => ({ id, image: figureRef(figure) })
export const geometryTasks = [
  { taskId: 'geometry-name-cylinder', promptSv: 'Vad heter kroppen?', responseMode: 'name', images: [figureRef('cylinder-standard')],
    options: [{ id: 'cylinder', labelSv: 'Cylinder' }, { id: 'cone', labelSv: 'Kon' }, { id: 'cuboid', labelSv: 'Rätblock' }], correctOptionIds: ['cylinder'] },
  { taskId: 'geometry-all-rhombi', promptSv: 'Välj alla figurer som är romber.', responseMode: 'multiple',
    options: [option('square', 'square-rotated'), option('rectangle', 'rectangle-standard'), option('rhombus', 'rhombus-standard'), option('triangle', 'triangle-small')], correctOptionIds: ['square', 'rhombus'] },
  { taskId: 'geometry-one-triangle', promptSv: 'Välj triangeln.', responseMode: 'single',
    options: [option('circle', 'circle-standard'), option('triangle', 'triangle-rotated'), option('square', 'square-small')], correctOptionIds: ['triangle'] },
  { taskId: 'geometry-cube-corners', promptSv: 'Hur många hörn har kroppen? Skriv ditt svar.', responseMode: 'text', images: [figureRef('cube-standard')] }
].map(task => ({ ...task, ...normalizeImageQuestion(task), taskVersion: 1, sourceKind: 'original_geometry' }))
export const geometryPack = { id: 'geometry-original', labelSv: 'Geometri · egna bildfrågor', taskIds: geometryTasks.map(task => task.taskId) }
