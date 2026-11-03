import { diagnosticCatalog } from '../../../domains/arithmetic/diagnosticCatalog.browser'

// Screening-level choices (Simon 2026-11-02): "Huvudräkning" hides the notebook grid
// and "Rityta" adds the drawing area, for every question at once. Each question can
// still be changed afterwards. Image and choice questions have neither.
export default function ScreeningWholeOptions({ draft, patch, disabled }) {
  const bank = draft.selectedTasks.filter(id => !diagnosticCatalog.findTask(id)?.responseMode)
  const custom = draft.customPrompt.trim() ? 1 : 0
  const texts = draft.textTasks || []
  const total = bank.length + draft.writtenTasks.length + texts.length + custom
  const all = (bankValue, writtenValue, customValue) => total > 0
    && bank.every(id => bankValue(draft.itemOptions[id] || {}))
    && draft.writtenTasks.every(writtenValue) && texts.every(writtenValue) && (!custom || customValue)
  const mental = all(o => o.gridEnabled === false, t => t.gridEnabled === false, draft.customGrid === false)
  const drawing = all(o => Boolean(o.drawingEnabled), t => Boolean(t.drawingEnabled), Boolean(draft.customDrawing))
  const setAll = (key, value) => patch({
    itemOptions: { ...draft.itemOptions, ...Object.fromEntries(bank.map(id => [id, { ...draft.itemOptions[id], [key]: value }])) },
    writtenTasks: draft.writtenTasks.map(task => ({ ...task, [key]: value })),
    textTasks: texts.map(task => ({ ...task, [key]: value })),
    ...(key === 'gridEnabled' ? { customGrid: value } : { customDrawing: value })
  })
  return <fieldset className="mt-2 flex flex-wrap items-center gap-x-3 text-sm" disabled={disabled || total === 0}>
    <legend className="sr-only">Val för hela screeningen</legend>
    <label><input type="checkbox" checked={mental} onChange={event => setAll('gridEnabled', !event.target.checked)} /> Huvudräkning för alla frågor</label>
    <label><input type="checkbox" checked={drawing} onChange={event => setAll('drawingEnabled', event.target.checked)} /> Rityta för alla frågor</label>
  </fieldset>
}
