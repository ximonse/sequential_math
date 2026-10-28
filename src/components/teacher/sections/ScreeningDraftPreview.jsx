import QuestionText from '../../QuestionText.jsx'
import ScreeningQuestionPreview from './ScreeningQuestionPreview.jsx'
import { diagnosticCatalog } from '../../../domains/arithmetic/diagnosticCatalog.browser.js'
import { summarizeDiagnosticObservation } from '../../../domains/arithmetic/diagnosticObservation.js'
import { createDiagnosticGrid } from '../../../domains/arithmetic/diagnosticGridModel.js'
import { isChoiceTask } from '../../../domains/arithmetic/screeningImageQuestions.js'

export default function ScreeningDraftPreview({ content }) {
  const tasks = [...content.selectedTasks.map(id => {
    const task = diagnosticCatalog.findTask(id)
    return task ? { ...task, ...content.itemOptions[id] } : { taskId: id, promptSv: 'Frågan finns inte längre i banken.', answerRule: 'teacher_review', answerType: 'text' }
  }), ...content.writtenTasks.map(task => ({ ...task, answerRule: 'custom_facit', answerType: 'text' })), ...content.imageTasks,
  ...(content.customPrompt.trim() ? [{ promptSv: content.customPrompt, answerType: 'text', answerRule: 'teacher_review', gridEnabled: content.customGrid, drawingEnabled: content.customDrawing }] : [])]
    .map((task, index) => ({ ...task, taskId: task.taskId || `draft-${index}`, taskVersion: task.taskVersion || 1 }))
  return <details className="mt-3 text-sm">
    <summary className="cursor-pointer font-semibold">Förhandsvisa frågor och facit ({tasks.length})</summary>
    <section aria-label="Genomgång av utkast" className="mt-2 space-y-3">
      <h3 className="font-semibold">{content.titleSv}</h3>
      {tasks.map((task, index) => {
        const grid = createDiagnosticGrid({ attemptId: 'preview', taskId: task.taskId || 'draft', taskVersion: task.taskVersion || 1, answerType: task.answerType || 'number',
          ...(isChoiceTask(task) ? { choiceConfig: { optionIds: task.options.map(option => option.id), multiple: task.responseMode === 'multiple' } } : {}) })
        const marking = summarizeDiagnosticObservation(task, grid)
        return <article key={index} className="border-b border-slate-200 pb-2">
          <h4 className="font-semibold">Fråga {index + 1}</h4><QuestionText>{task.promptSv}</QuestionText>
          <p>{marking.expectedAnswer !== null && marking.expectedAnswer !== undefined ? `Facit: ${marking.expectedAnswer}` : 'Lärarbedömning'}</p>
          <p>{task.gridEnabled !== false ? 'Räknehäfte' : 'Utan räknehäfte'}{task.drawingEnabled ? ' · Rityta' : ''}</p>
          {task.responseMode && <ScreeningQuestionPreview task={task} />}
        </article>
      })}
      {(content.writtenEditor.draft.prompt || content.imageEditor.draft.promptSv) && <p>Det finns en pågående fråga i redigeraren. Den sparas i utkastet men ingår i samlingen först när du lägger till eller sparar frågan.</p>}
      <p>Inga elevuppdrag skapas av denna förhandsvisning. Mottagare väljs separat vid utdelning.</p>
    </section>
  </details>
}
