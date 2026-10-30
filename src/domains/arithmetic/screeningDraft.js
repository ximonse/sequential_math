import { normalizeScreeningAnswerKey } from './screeningAnswerKey.js'
import { normalizeImageQuestion, validateImageReference } from './screeningImageQuestions.js'

export const emptyWrittenEditor = () => ({ draft: { prompt: '', format: 'number', keyText: '', unit: '', requireDenominator: false, gridEnabled: true }, editing: -1 })
export const emptyImageEditor = () => ({ draft: { promptSv: '', responseMode: 'single', images: [], options: [], correctOptionIds: [] }, editing: -1 })
export const emptyScreeningDraft = () => ({ titleSv: 'Screening', selectedTasks: [], itemOptions: {}, writtenTasks: [], imageTasks: [], customPrompt: '', customGrid: false, customDrawing: false, writtenEditor: emptyWrittenEditor(), imageEditor: emptyImageEditor() })
const fail = () => { throw new Error('Utkastet har ett ogiltigt innehåll.') }
const id = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/u.test(value)
const string = (value, max) => { if (typeof value !== 'string' || value.length > max) fail(); return value }
const bool = value => { if (typeof value !== 'boolean') fail(); return value }
const keys = (object, allowed) => { if (!object || typeof object !== 'object' || Array.isArray(object) || Object.keys(object).some(key => !allowed.includes(key))) fail() }
const list = (value, max) => { if (!Array.isArray(value) || value.length > max) fail(); return value }

// Incomplete editor fields are intentional: a draft need not be ready to send.
export function normalizeScreeningDraft(input) {
  keys(input, ['titleSv', 'selectedTasks', 'itemOptions', 'writtenTasks', 'imageTasks', 'customPrompt', 'customGrid', 'customDrawing', 'writtenEditor', 'imageEditor'])
  if (JSON.stringify(input).length > 60000) fail()
  const titleSv = string(input.titleSv, 100)
  if (!titleSv.trim()) throw new Error('Ge utkastet ett namn.')
  const selectedTasks = list(input.selectedTasks, 100)
  if (!selectedTasks.every(id) || new Set(selectedTasks).size !== selectedTasks.length) fail()
  keys(input.itemOptions, selectedTasks)
  for (const options of Object.values(input.itemOptions)) {
    keys(options, ['answerType', 'gridEnabled', 'drawingEnabled'])
    if (options.answerType !== undefined && !['number', 'text'].includes(options.answerType)) fail()
    for (const field of ['gridEnabled', 'drawingEnabled']) if (options[field] !== undefined) bool(options[field])
  }
  const writtenTasks = list(input.writtenTasks, 12).map(task => {
    keys(task, ['promptSv', 'answerKey', 'gridEnabled', 'drawingEnabled'])
    return { promptSv: string(task.promptSv, 2000), answerKey: normalizeScreeningAnswerKey(task.answerKey), gridEnabled: bool(task.gridEnabled), drawingEnabled: bool(task.drawingEnabled) }
  })
  const imageTasks = list(input.imageTasks, 12).map(task => ({ promptSv: string(task.promptSv, 2000), ...normalizeImageQuestion(task) }))
  const writtenEditor = input.writtenEditor ?? emptyWrittenEditor(), imageEditor = input.imageEditor ?? emptyImageEditor()
  for (const [state, tasks] of [[writtenEditor, writtenTasks], [imageEditor, imageTasks]]) {
    keys(state, ['draft', 'editing'])
    if (!Number.isInteger(state.editing) || state.editing < -1 || state.editing >= tasks.length) fail()
  }
  const written = writtenEditor.draft
  keys(written, ['prompt', 'format', 'keyText', 'unit', 'requireDenominator', 'gridEnabled'])
  string(written.prompt, 2000); string(written.keyText, 200); string(written.unit, 20)
  if (!['number', 'fraction', 'mixed', 'numbers', 'text'].includes(written.format)) fail()
  bool(written.requireDenominator); bool(written.gridEnabled)
  const image = imageEditor.draft
  keys(image, ['promptSv', 'responseMode', 'images', 'options', 'correctOptionIds', 'gridEnabled', 'drawingEnabled', 'operation', 'answerType', 'answerRule'])
  string(image.promptSv, 2000)
  if (!['single', 'multiple', 'name', 'text'].includes(image.responseMode)) fail()
  list(image.images, 8).forEach(validateImageReference)
  list(image.options, 12).forEach(option => {
    keys(option, ['id', 'image', 'labelSv'])
    if (!id(option.id)) fail()
    if (option.image) validateImageReference(option.image)
    if (option.labelSv !== undefined) string(option.labelSv, 100)
  })
  if (!list(image.correctOptionIds, 12).every(id)) fail()
  return structuredClone({ titleSv, selectedTasks, itemOptions: input.itemOptions, writtenTasks, imageTasks,
    customPrompt: string(input.customPrompt, 2000), customGrid: bool(input.customGrid), customDrawing: bool(input.customDrawing), writtenEditor, imageEditor })
}
