import ScreeningTaskChoices from './sections/ScreeningTaskChoices.jsx'
import ScreeningWrittenEditor from './sections/ScreeningWrittenEditor.jsx'
import ScreeningImageEditor from './sections/ScreeningImageEditor.jsx'
import { diagnosticCatalog } from '../../domains/arithmetic/diagnosticCatalog.browser.js'
import { emptyMaterialQuestionEditor, materialQuestionInput, pendingMaterialQuestionEditor } from './materialQuestionEditing.js'

export default function MaterialScreeningEditor({ content, onChange, disabled, states, onState }) {
  const tasks = content.customTasks || [], selected = content.taskIds || []
  const pending = pendingMaterialQuestionEditor(states)
  const change = patch => onChange({ ...content, ...patch })
  const blocked = key => disabled || Boolean(pending && pending !== key)
  const editorProps = key => ({ disabled: blocked(key), editorState: states[key] || emptyMaterialQuestionEditor(key),
    onEditorState: value => onState(key, value) })
  const replace = (index, replacements) => change({ customTasks: tasks.flatMap((task, i) => i === index ? replacements.map(materialQuestionInput) : [task]) })
  const append = replacements => change({ customTasks: [...tasks, ...replacements.map(materialQuestionInput)] })
  const pack = diagnosticCatalog.packs.find(pack => JSON.stringify(pack.taskIds) === JSON.stringify(selected))
  return <details className="material-question-editor">
    <summary>Bearbeta screeningfrågor</summary>
    <p>Ändringarna sparas som en ny materialversion. Granska och godkänn den före utdelning.</p>
    {pending && <div><p role="note">Spara eller avbryt den pågående frågeredigeringen innan du förhandsvisar eller godkänner materialet.</p>
      <button type="button" disabled={disabled} onClick={() => onState(pending, emptyMaterialQuestionEditor(pending))}>Avbryt pågående frågeutkast</button></div>}
    <ScreeningTaskChoices busy={disabled || Boolean(pending)} selectedTasks={selected}
      onSelectedTasks={taskIds => change({ taskIds, itemOptions: Object.fromEntries(taskIds.filter(id => content.itemOptions?.[id]).map(id => [id, content.itemOptions[id]])) })}
      usesNcm={selected.some(id => diagnosticCatalog.findTask(id)?.ncmCode)} selectedPack={pack}
      itemOptions={content.itemOptions || {}} onItemOptions={itemOptions => change({ itemOptions })} showCustomQuestion={false} />
    {tasks.map((task, index) => {
      const key = `${task.responseMode ? 'image' : 'written'}-${index}`
      return <fieldset key={index} aria-label={`Egen fråga ${index + 1}`} disabled={blocked(key)} className="material-question">
        <legend> Egen fråga {index + 1}</legend>
        {task.responseMode ? <ScreeningImageEditor tasks={[task]} onTasks={values => replace(index, values)} {...editorProps(key)} />
          : task.answerKey ? <>
              <ScreeningWrittenEditor tasks={[{ ...task, gridEnabled: task.gridEnabled !== false }]} maxQuestions={1}
                onTasks={values => replace(index, values.map(value => ({ ...value, drawingEnabled: Boolean(task.drawingEnabled) })))} {...editorProps(key)} />
              <label><input type="checkbox" disabled={disabled || Boolean(pending)} checked={Boolean(task.drawingEnabled)}
                onChange={event => replace(index, [{ ...task, drawingEnabled: event.target.checked }])} /> Rityta</label>
            </>
            : <>
              <label>Frågetext<textarea maxLength={2000} value={task.promptSv} onChange={event => replace(index, [{ ...task, promptSv: event.target.value }])} /></label>
              <label><input type="checkbox" checked={Boolean(task.gridEnabled)} onChange={event => replace(index, [{ ...task, gridEnabled: event.target.checked }])} /> Räknehäfte</label>{' '}
              <label><input type="checkbox" checked={Boolean(task.drawingEnabled)} onChange={event => replace(index, [{ ...task, drawingEnabled: event.target.checked }])} /> Rityta</label>
              <p>Lärarbedömning av elevens svar.</p><button type="button" onClick={() => replace(index, [])}>Ta bort frågan</button>
            </>}
      </fieldset>
    })}
    <fieldset disabled={disabled || Boolean(pending)}>
      <button type="button" disabled={tasks.length >= 12} onClick={() => append([{ promptSv: '', gridEnabled: true, drawingEnabled: false }])}>Lägg till fråga med lärarbedömning</button>
    </fieldset>
    <fieldset aria-label="Ny självrättande fråga"><ScreeningWrittenEditor tasks={[]} maxQuestions={12 - tasks.length} onTasks={append} {...editorProps('written-new')} /></fieldset>
    <fieldset aria-label="Ny bildfråga"><ScreeningImageEditor tasks={[]} onTasks={append} {...editorProps('image-new')} disabled={blocked('image-new') || tasks.length >= 12} /></fieldset>
  </details>
}
