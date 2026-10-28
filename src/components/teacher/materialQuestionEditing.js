import { emptyImageEditor, emptyWrittenEditor } from '../../domains/arithmetic/screeningDraft.js'

export const emptyMaterialQuestionEditor = key => key.startsWith('image') ? emptyImageEditor() : emptyWrittenEditor()
export const pendingMaterialQuestionEditor = states => Object.keys(states).find(key =>
  JSON.stringify(states[key]) !== JSON.stringify(emptyMaterialQuestionEditor(key)))

// Editors also return normalized marking metadata. The material API accepts
// only authoring fields and freezes its own marking snapshot on the server.
const fields = ['promptSv', 'gridEnabled', 'drawingEnabled', 'responseMode', 'images', 'options', 'correctOptionIds', 'answerKey']
export const materialQuestionInput = task => Object.fromEntries(Object.entries(task).filter(([key]) => fields.includes(key)))
