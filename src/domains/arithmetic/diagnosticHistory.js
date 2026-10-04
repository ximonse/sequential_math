import { applyDiagnosticGridEvent, createDiagnosticGrid, replayDiagnosticGrid } from './diagnosticGridModel.js'

export function diagnosticHistoryFrame(snapshot, step) {
  replayDiagnosticGrid(snapshot)
  if (!Number.isInteger(step) || step < 0 || step > snapshot.events.length) {
    throw new Error('Invalid diagnostic history step')
  }
  let current = createDiagnosticGrid({ attemptId: snapshot.attemptId, taskId: snapshot.taskId,
    taskVersion: snapshot.taskVersion, rows: snapshot.rows, columns: snapshot.columns })
  for (const event of snapshot.events.slice(0, step)) {
    current = applyDiagnosticGridEvent(current, event)
  }
  return current
}

export function describeDiagnosticEvent(event) {
  if (!event) return 'Tomt rutnät, innan eleven började.'
  const place = event.position ? `rad ${event.position.row + 1}, kolumn ${event.position.column + 1}` : ''
  const kind = event.layer === 'note' ? 'minnessiffra' : 'stor siffra'
  if (event.type === 'write') return `${place}: ${event.before ? `ändrade ${kind} från ${event.before} till ${event.after}` : `skrev ${kind} ${event.after}`}.`
  if (event.type === 'erase') return `${place}: ${event.after ? `raderade sista siffran i minnessiffran ${event.before}` : `raderade ${kind} ${event.before}`}.`
  if (event.type === 'reclassify') return `${place}: ändrade ${event.value} till ${event.to === 'note' ? 'minnessiffra' : 'stor siffra'}.`
  if (event.type === 'cross_out') return `${place}: ${event.after ? 'strök över' : 'tog bort överstrykning'}.`
  // Placement is judged visually in the replayed grid, so the wording stays plain.
  if (event.type === 'line_add') return `Ett ${event.axis === 'horizontal' ? 'vågrätt' : 'lodrätt'} streck drogs.`
  if (event.type === 'line_remove') return 'Tog bort ett streck.'
  if (event.type === 'answer_change') return `Ändrade slutsvaret från ${event.before || 'tomt'} till ${event.after || 'tomt'}.`
  if (event.type === 'move') return `Flyttade markören till rad ${event.to.row + 1}, kolumn ${event.to.column + 1}.`
  if (event.type === 'layer') return `Valde ${event.to === 'note' ? 'minnessiffra' : 'stor siffra'} för nästa inmatning.`
  if (event.type === 'focus_lost') return 'Lämnade räknehäftets fokus.'
  if (event.type === 'pause') return 'Pausade arbetet.'
  if (event.type === 'resume') return 'Fortsatte arbetet.'
  if (event.type === 'submit') return 'Lämnade in försöket.'
  return 'Okänd händelse.'
}
