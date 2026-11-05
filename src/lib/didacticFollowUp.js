import { decimalMultiplicationPackage as pack, decimalMultiplicationTasks as tasks } from '../domains/arithmetic/decimalMultiplicationPackage.js'
const fail = message => { throw Object.assign(new Error(message), { status: 400, code: 'invalid_didactic_followup' }) }
export const didacticPackage = modelId => modelId === pack.modelId ? pack : null

export function validateTeachingRecord(input, report) {
  if (!input || Array.isArray(input) || Object.keys(input).some(key => !['hypothesisId', 'packageId', 'packageVersion', 'draftId', 'materialVersion', 'taughtOn', 'help', 'noteSv', 'kind'].includes(key))
    || !['teaching', 'control_observation'].includes(input.kind)
    || input.packageId !== pack.id || input.packageVersion !== pack.version
    || !report.hypotheses.some(h => h.id === input.hypothesisId && h.signalCode === pack.modelId)
    || !/^[A-Za-z0-9_-]{1,128}$/u.test(input.draftId || '') || !Number.isSafeInteger(input.materialVersion) || input.materialVersion < 1
    || !/^\d{4}-\d{2}-\d{2}$/u.test(input.taughtOn || '') || !Number.isFinite(Date.parse(`${input.taughtOn}T12:00:00Z`))
    || new Date(`${input.taughtOn}T12:00:00Z`).toISOString().slice(0, 10) !== input.taughtOn
    || !['unknown', 'given', 'none_reported'].includes(input.help)
    || typeof input.noteSv !== 'string' || !input.noteSv.trim() || input.noteSv.length > 1500) fail('Undervisningsnoteringen behöver giltigt underlag, datum, hjälpstatus och text.')
  return { ...input, noteSv: input.noteSv.trim() }
}

export function resolveDidacticPlan(input, { reportState, reportReview, items, modelId }) {
  if (input !== undefined && (!input || typeof input !== 'object' || Array.isArray(input))) fail('Ogiltig didaktisk prövningsavsikt.')
  const selected = items.filter(item => item.task?.didacticPackageId === pack.id)
  if (!input && !selected.length) return null
  if (modelId !== pack.modelId || !reportReview || selected.length !== items.length) fail('Paketets prövning behöver en sparad rapport och rätt modell.')
  const phase = input?.phase ?? 'contrast'
  if (input && (Object.keys(input).some(key => !['packageId', 'packageVersion', 'phase', 'teachingRevision'].includes(key))
    || input.packageId !== pack.id || input.packageVersion !== pack.version)) fail('Okänt didaktikpaket.')
  if (!['contrast', 'independent_check', 'later_check'].includes(phase)
    || items.length !== (phase === 'contrast' ? 2 : 1)
    || items.some(item => item.task.didacticRole !== phase || !tasks.some(task => task.taskId === item.task.taskId && task.taskVersion === item.task.taskVersion))) fail('Valda frågor hör inte till detta prövningssteg.')
  let teaching
  if (phase !== 'contrast') {
    const report = reportState?.reports.find(report => report.id === reportReview.reportId)
    const check = report?.checkIns.find(check => check.revision === input.teachingRevision)
    teaching = check?.teaching
    if (!teaching || teaching.kind !== 'teaching' || teaching.hypothesisId !== reportReview.hypothesisId || teaching.packageId !== pack.id) fail('Spara en undervisningsnotering för denna hypotes före en ny kontroll.')
    teaching = { ...teaching, checkInRevision: check.revision, recordedAt: check.createdAt }
  }
  const controls = reportState?.reports.find(report => report.id === reportReview.reportId)?.checkIns
    .filter(check => check.teaching?.kind === 'control_observation' && check.teaching.hypothesisId === reportReview.hypothesisId)
    .map(check => ({ ...check.teaching, checkInRevision: check.revision })) || []
  return { packageId: pack.id, packageVersion: pack.version, phase, ...(teaching ? { teaching } : {}), controlObservations: controls }
}
