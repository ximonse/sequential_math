import { useEffect, useState } from 'react'
import { useQuestionEditorState } from './useQuestionEditorState.js'
import { searchScreeningFigures } from '../../../domains/arithmetic/screeningFigures.js'
import { normalizeImageQuestion, isChoiceTask } from '../../../domains/arithmetic/screeningImageQuestions.js'
import { normalizeScreeningImage } from '../../../lib/normalizeScreeningImage.js'
import ScreeningImageQuestion, { ScreeningImage } from '../../student/ScreeningImageQuestion.jsx'
import { diagnosticRequest as request } from './diagnosticRequest.js'

const context = { teacher: true }
const empty = () => ({ promptSv: '', responseMode: 'single', images: [], options: [], correctOptionIds: [] })
const field = 'rounded border border-slate-400 px-1 py-0.5'
export default function ScreeningImageEditor({ tasks, onTasks, disabled, editorState, onEditorState }) {
  const [draft, setDraft, editing, setEditing] = useQuestionEditorState(editorState, onEditorState, empty)
  const [query, setQuery] = useState('')
  const [library, setLibrary] = useState([])
  const [target, setTarget] = useState('options')
  const [uploadName, setUploadName] = useState('')
  const [status, setStatus] = useState('')
  const [uploading, setUploading] = useState(false)
  const [previewSelection, setPreviewSelection] = useState([])
  const patch = value => { setDraft(previous => ({ ...previous, ...value })); setPreviewSelection([]) }
  useEffect(() => {
    let active = true
    request('/api/teacher-diagnostic-assignments?resource=images').then(result => {
      if (!result.ok) throw new Error(result.data.error || 'Kunde inte hämta bildbiblioteket.')
      if (active) setLibrary(result.data.images)
    }).catch(error => { if (active) setStatus(error.message) })
    return () => { active = false }
  }, [])
  function addImage(ref) {
    if (target === 'images' || ['text', 'name'].includes(draft.responseMode)) {
      if (draft.images.length >= 8) return setStatus('Högst åtta frågebilder.')
      patch({ images: [...draft.images, ref] })
    } else {
      if (draft.options.length >= 12) return setStatus('Högst tolv alternativ.')
      patch({ options: [...draft.options, { id: `option-${crypto.randomUUID()}`, image: ref }] })
    }
  }
  async function upload(file) {
    if (!file) return
    setUploading(true); setStatus('')
    try {
      const dataUrl = await normalizeScreeningImage(file)
      const result = await request('/api/teacher-diagnostic-assignments', { method: 'POST',
        body: JSON.stringify({ action: 'upload_image', nameSv: uploadName.trim() || file.name.replace(/\.[^.]+$/u, ''), dataUrl }) })
      if (!result.ok) throw new Error(result.data.error || 'Kunde inte spara bilden.')
      setLibrary(previous => [...previous, result.data.image]); setUploadName(''); setStatus('Bilden är sparad i ditt bibliotek.')
    } catch (error) { setStatus(error.message) } finally { setUploading(false) }
  }
  async function hideImage(id) {
    try {
      const result = await request('/api/teacher-diagnostic-assignments', { method: 'PATCH', body: JSON.stringify({ action: 'hide_image', id }) })
      if (!result.ok) throw new Error(result.data.error || 'Kunde inte dölja bilden.')
      setLibrary(previous => previous.filter(image => image.id !== id))
      setStatus('Bilden är dold i biblioteket. Utdelade frågor behåller bilden.')
    } catch (error) { setStatus(error.message) }
  }
  function addQuestion() {
    try {
      if (!draft.promptSv.trim()) throw new Error('Skriv en frågetext.')
      if (tasks.length >= 12 && editing < 0) throw new Error('Högst tolv egna bildfrågor per samling.')
      const question = { promptSv: draft.promptSv.trim(), ...normalizeImageQuestion(draft) }
      onTasks(editing < 0 ? [...tasks, question] : tasks.map((task, index) => index === editing ? question : task))
      setDraft(empty()); setEditing(-1); setPreviewSelection([]); setStatus('Frågan är tillagd i samlingen.')
    } catch (error) { setStatus(error.message) }
  }
  function removeQuestion(index) {
    onTasks(tasks.filter((_, i) => i !== index))
    if (editing === index) {
      setDraft(empty()); setEditing(-1); setPreviewSelection([])
    } else if (editing > index) setEditing(editing - 1)
  }
  return <details className="mt-3 text-sm">
    <summary className="cursor-pointer font-semibold">Lägg till bildfrågor</summary>
    <fieldset disabled={disabled || uploading} className="mt-2 space-y-2">
      <legend className="sr-only">Skapa bildfråga</legend>
      {tasks.map((task, index) => <div key={index} className="flex flex-wrap items-center gap-2">
        <span>{index + 1}. {task.promptSv}</span>
        <button type="button" className={field} onClick={() => { setDraft(structuredClone(task)); setEditing(index); setPreviewSelection([]) }}>Redigera bildfråga {index + 1}</button>
        <button type="button" className={field} onClick={() => removeQuestion(index)}>Ta bort bildfråga {index + 1}</button>
      </div>)}
      <label className="block">Bildfrågans text<textarea className={`${field} block w-full`} value={draft.promptSv} maxLength={2000} onChange={event => patch({ promptSv: event.target.value })} /></label>
      <label className="block">Bildfrågans svarssätt <select className={field} value={draft.responseMode} onChange={event => patch({ responseMode: event.target.value, options: [], correctOptionIds: [] })}>
        <option value="single">Välj en bild</option><option value="multiple">Välj flera bilder</option><option value="name">Välj namn</option><option value="text">Skriv svar</option>
      </select></label>
      {['single', 'multiple'].includes(draft.responseMode) && <label className="block">Lägg bilden som <select className={field} value={target} onChange={event => setTarget(event.target.value)}><option value="options">Svarsalternativ</option><option value="images">Frågebild</option></select></label>}
      <details><summary className="cursor-pointer font-semibold">Välj ur figurbanken</summary>
        <label>Sök figur <input type="search" className={field} value={query} onChange={event => setQuery(event.target.value)} /></label>
        <div className="screening-library">{searchScreeningFigures(query).map(figure => <button key={figure.id} type="button" aria-label={`Lägg till ${figure.nameSv}`} onClick={() => addImage({ source: 'bank', id: figure.id, version: figure.version })}>
          <ScreeningImage image={{ source: 'bank', id: figure.id, version: figure.version }} /><span className="block">{figure.nameSv}</span>
        </button>)}</div>
      </details>
      <details><summary className="cursor-pointer font-semibold">Mitt bildbibliotek</summary>
        <label className="block">Bildens namn <input className={field} value={uploadName} maxLength={100} onChange={event => setUploadName(event.target.value)} /></label>
        <label className="block">Ladda upp figur <input type="file" accept="image/png,image/jpeg,image/webp" onChange={event => { void upload(event.target.files[0]); event.target.value = '' }} /></label>
        <div className="screening-library">{library.map(image => <div key={image.id}>
          <button type="button" aria-label={`Lägg till ${image.nameSv}`} onClick={() => addImage({ source: 'upload', id: image.id, version: image.version })}><ScreeningImage image={image} context={context} /><span className="block">{image.nameSv}</span></button>
          <button type="button" className="block" onClick={() => hideImage(image.id)}>Dölj {image.nameSv}</button>
        </div>)}</div>
      </details>
      {draft.images.map((image, index) => <div key={index} className="inline-flex flex-col"><ScreeningImage image={image} context={context} /><button type="button" onClick={() => patch({ images: draft.images.filter((_, i) => i !== index) })}>Ta bort frågebild {index + 1}</button></div>)}
      {draft.responseMode === 'name' && <button type="button" className={field} onClick={() => patch({ options: [...draft.options, { id: `option-${crypto.randomUUID()}`, labelSv: '' }] })} disabled={draft.options.length >= 12}>Lägg till namnalternativ</button>}
      {isChoiceTask(draft) && <fieldset><legend className="font-semibold">Alternativ och facit</legend>{draft.options.map((option, index) => <div key={option.id} className="flex flex-wrap items-center gap-2">
        {option.image && <ScreeningImage image={option.image} context={context} />}
        {draft.responseMode === 'name' ? <input aria-label={`Namn alternativ ${index + 1}`} className={field} value={option.labelSv} maxLength={100} onChange={event => patch({ options: draft.options.map(item => item.id === option.id ? { ...item, labelSv: event.target.value } : item) })} /> : <span>Bild {index + 1}</span>}
        <label><input type="checkbox" checked={draft.correctOptionIds.includes(option.id)} onChange={event => patch({ correctOptionIds: event.target.checked ? draft.responseMode === 'multiple' ? [...draft.correctOptionIds, option.id] : [option.id] : draft.correctOptionIds.filter(id => id !== option.id) })} />Rätt alternativ {index + 1}</label>
        <button type="button" onClick={() => patch({ options: draft.options.filter(item => item.id !== option.id), correctOptionIds: draft.correctOptionIds.filter(id => id !== option.id) })}>Ta bort alternativ {index + 1}</button>
      </div>)}</fieldset>}
      <section aria-label="Elevförhandsvisning av bildfråga" className="rounded border border-slate-300 bg-white p-2">
        <p className="font-semibold">Elevförhandsvisning</p><p>{draft.promptSv}</p>
        <ScreeningImageQuestion task={draft} selected={previewSelection} onChange={setPreviewSelection} context={context} />
        {draft.responseMode === 'text' && <textarea aria-label="Förhandsvisning skrivsvar" placeholder="Elevens svar" />}
      </section>
      <button type="button" className={field} onClick={addQuestion}>{editing < 0 ? 'Lägg till bildfrågan i samlingen' : 'Spara ändrad bildfråga'}</button>
      {editing >= 0 && <button type="button" className={field} onClick={() => { setDraft(empty()); setEditing(-1) }}>Avbryt redigering</button>}
      <p>Endast tillagda frågor följer med när samlingen delas ut.</p>
    </fieldset>
    <p role="status">{uploading ? 'Sparar bilden…' : status}</p>
  </details>
}
