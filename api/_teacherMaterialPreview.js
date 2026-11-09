import { resolveTeacherAudience } from './_teacherAudience.js'
import { getLiveTeacherAuthPayload } from './_helpers.js'
import { readPupilEvidence, assertEvidenceSourceAccess, assertPupilEvidenceAccess } from './_pupilEvidenceRead.js'
import { prepareDiagnosticAssignment } from './_diagnosticAssignmentStore.js'
import { evidenceError, evidenceHash } from './_pupilEvidence.js'
import { encodeAssignmentPayload, decodeAssignmentPayload } from '../src/lib/assignments.js'
import { summarizeDiagnosticObservation } from '../src/domains/arithmetic/diagnosticObservation.js'
import { createDiagnosticGrid } from '../src/domains/arithmetic/diagnosticGridModel.js'
import { isChoiceTask } from '../src/domains/arithmetic/screeningImageQuestions.js'
import { buildMaterialInvestigation, buildMaterialInvestigations } from '../src/lib/materialInvestigation.js'
import { materialReportReview } from '../src/lib/materialReportReview.js'
import { readPupilAnalysisState } from './_pupilAnalysisStore.js'
import { stockholmDay } from '../src/lib/evidencePeriod.js'
import { questionFingerprint } from '../src/domains/predictableErrors/questionFingerprint.js'
import { evidenceProblem } from '../src/lib/evidenceProblem.js'
import { practiceExposureKeys } from '../src/lib/practiceExposureKeys.js'

const fail = message => { throw evidenceError(400, 'invalid_material', message) }
function text(value, max = 1000) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) fail('Text saknas eller är för lång.')
  return value.trim()
}
function object(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !keys.includes(key))) fail('Okänt materialfält.')
  return value
}

async function fullAudience(req, selection) {
  object(selection, ['targetType', 'targetId', 'rosterRevision'])
  if (!selection.rosterRevision) fail('Läs aktuellt urval och ange rosterRevision.')
  const first = await resolveTeacherAudience({ ...req, headers: req.headers, query: { ...selection, limit: 100 } })
  const pupils = [...first.pupils]
  let offset = first.nextOffset
  while (offset !== null) {
    const page = await resolveTeacherAudience({ ...req, headers: req.headers, query: { ...selection, limit: 100, offset } })
    pupils.push(...page.pupils); offset = page.nextOffset
  }
  if (!pupils.length) fail('Välj minst en aktuell mottagare.')
  return { ...first, pupils, nextOffset: null }
}

async function analysisBasis(req, auth, basis, audience, onEvidence) {
  if (!Array.isArray(basis) || basis.length > 100) fail('Ogiltigt analysunderlag, högst 100 källurval.')
  const result = []
  for (const item of basis) {
    object(item, ['studentId', 'classId', 'from', 'to', 'source', 'snapshotRevision', 'supportRefs', 'counterRefs', 'reasonSv'])
    const pupil = audience.pupils.find(p => p.studentId === item.studentId)
    if (!pupil?.classIds.includes(item.classId)) fail('Analysens elev/klass ingår inte i det valda aktuella urvalet.')
    for (const list of [item.supportRefs, item.counterRefs]) {
      if (!Array.isArray(list) || list.length > 20 || list.some(ref => !/^[a-f0-9]{64}$/u.test(ref)) || new Set(list).size !== list.length) fail('Ogiltiga analysreferenser.')
    }
    if (!item.supportRefs.length || item.counterRefs.some(ref => item.supportRefs.includes(ref))) fail('Analysen kräver skilda stöd och motexempel.')
    if (!/^[a-f0-9]{64}$/u.test(item.snapshotRevision)) fail('Analysens källrevision saknas.')
    const evidence = await readPupilEvidence({ ...req, headers: req.headers, query: {
      classId: item.classId, from: item.from, to: item.to, source: item.source || 'practice', snapshotRevision: item.snapshotRevision
    } }, auth, item.studentId, { unpaged: true })
    const known = new Set(evidence.entries.map(entry => entry.ref))
    if ([...item.supportRefs, ...item.counterRefs].some(ref => !known.has(ref))) fail('Analysreferens saknas i aktuellt underlag.')
    onEvidence?.(item, evidence)
    result.push({ ...item, source: evidence.source, reasonSv: text(item.reasonSv), coverage: evidence.coverage })
  }
  return result
}

function practiceContent(input, title) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('Träningsram saknas.')
  const allowed = ['standard', 'ncm', 'math_practice', 'subitizing', 'table', 'focus']
  if (!allowed.includes(input.kind)) fail('Träningsformatet stöds inte.')
  const normalized = decodeAssignmentPayload(encodeAssignmentPayload({ ...input, id: 'material-preview', title, createdAt: 1 }))
  if (!normalized) fail('Ogiltig träningsram.')
  if (normalized.kind === 'standard' && !normalized.problemTypes.length) fail('Välj uttryckliga uppgiftstyper.')
  for (const [key, value] of Object.entries(input)) {
    if (['id', 'title', 'createdAt'].includes(key) || !Object.hasOwn(normalized, key)
      || evidenceHash(value) !== evidenceHash(normalized[key])) fail(`Träningsvalet ${key} stöds inte med angivet värde. Ingen tyst anpassning har gjorts.`)
  }
  if (normalized.kind === 'math_practice') {
    for (const range of Object.values(normalized.numberRange)) {
      // The existing generator falls back to unfiltered values for an empty set.
      // Reject that frame here rather than approving different pupil content.
      const step = { even: 2, odd: 2, ten: 10, five: 5, all: 1 }[range.filter]
      const offset = range.filter === 'odd' ? 1 : 0
      const first = Math.ceil((range.min - offset) / step) * step + offset
      if (!Number.isSafeInteger(range.min) || !Number.isSafeInteger(range.max) || range.max - range.min > 10000 || first > range.max) {
        fail('Talintervallet måste innehålla heltal som matchar filtret och omfatta högst 10 001 tal.')
      }
    }
  }
  const { id: _id, createdAt: _createdAt, ...frame } = normalized
  return { frame, sequence: 'generated_not_frozen' }
}

export async function previewTeacherMaterial(req, auth, input) {
  object(input, ['schemaVersion', 'kind', 'mode', 'titleSv', 'goalSv', 'instructionSv', 'sourceMaterials', 'audience', 'basis', 'content', 'classContexts', 'investigation', 'investigations'])
  if (input.investigation !== undefined && input.investigations !== undefined) fail('Ange en prövningsavsikt eller flera, inte båda.')
  if (input.schemaVersion !== 1 || !['practice', 'screening'].includes(input.kind)
    || !['general', 'specific'].includes(input.mode)) fail('Ogiltig materialtyp eller version.')
  const titleSv = text(input.titleSv, 100), goalSv = text(input.goalSv), instructionSv = text(input.instructionSv, 2000)
  const sourceMaterials = input.sourceMaterials ?? []
  if (!Array.isArray(sourceMaterials) || sourceMaterials.length > 10) fail('Högst tio materialkällor stöds.')
  const sources = sourceMaterials.map(item => {
    object(item, ['label', 'excerpt']); return { label: text(item.label, 200), excerpt: text(item.excerpt, 10000) }
  })
  const audience = await fullAudience(req, input.audience)
  const requestedContexts = input.classContexts ?? {}
  object(requestedContexts, audience.pupils.map(pupil => pupil.studentId))
  const classContexts = {}
  for (const pupil of audience.pupils) {
    const selected = requestedContexts[pupil.studentId] || (audience.targetType === 'class' ? audience.targetId
      : pupil.classIds.length === 1 ? pupil.classIds[0] : '')
    if (selected && (!pupil.classIds.includes(selected) || (audience.targetType === 'class' && selected !== audience.targetId))) fail('Ogiltig klasskontext för en mottagare.')
    if (!selected && input.kind === 'screening') fail(`Välj uttrycklig klasskontext för eleven ${pupil.codeName}.`)
    if (selected) classContexts[pupil.studentId] = selected
  }
  const basis = await analysisBasis(req, auth, input.basis ?? [], audience)
  if ((input.mode === 'specific') !== (basis.length > 0)) fail('Specifikt innehåll kräver analysbelägg; generellt innehåll använder instruktion/material.')
  let content
  if (input.kind === 'practice') content = practiceContent(input.content, titleSv)
  else {
    object(input.content, ['taskIds', 'customTasks', 'itemOptions'])
    if (input.content.customTasks !== undefined && !Array.isArray(input.content.customTasks)) fail('Ogiltig frågelista.')
    for (const custom of input.content.customTasks || []) object(custom, ['promptSv', 'gridEnabled', 'drawingEnabled', 'responseMode', 'images', 'options', 'correctOptionIds', 'answerKey'])
    for (const pupil of audience.pupils) assertEvidenceSourceAccess(auth, pupil.studentId, 'screening')
    let sequence = 0
    const prepared = await prepareDiagnosticAssignment({ ...input.content, taskIds: input.content.taskIds ?? [],
      teacherId: auth.teacherId, classId: audience.pupils[0].classIds[0], studentIds: [audience.pupils[0].studentId], titleSv },
    { makeId: () => `preview-${++sequence}` })
    content = { items: prepared.items.map(({ taskSnapshot: task }) => {
      const grid = createDiagnosticGrid({ attemptId: 'preview', taskId: task.taskId, taskVersion: task.taskVersion,
        answerType: task.answerType || 'number', ...(isChoiceTask(task) ? { choiceConfig: {
          optionIds: task.options.map(option => option.id), multiple: task.responseMode === 'multiple' } } : {}) })
      return { task, marking: summarizeDiagnosticObservation(task, grid) }
    }), evidenceClass: 'diagnostic_only' }
  }
  // Detect changed membership and changed session after potentially slow source reads.
  const current = await fullAudience(req, input.audience)
  if (current.rosterRevision !== audience.rosterRevision) throw evidenceError(409, 'audience_changed', 'Urvalet har ändrats.')
  const live = await getLiveTeacherAuthPayload(req)
  if (!live || evidenceHash(live) !== evidenceHash(auth)) throw evidenceError(403, 'access_changed', 'Lärarens åtkomst har ändrats.')
  const records = []
  if (basis.length) await analysisBasis(req, live, input.basis, current, (basis, evidence) => records.push({ basis, evidence }))
  let reportReview, reportState
  if (input.investigation && input.investigation.reportReview !== undefined) {
    const reference = input.investigation.reportReview
    object(reference, ['studentId', 'reportId', 'hypothesisId', 'checkInRevision', 'reopen'])
    if (!audience.pupils.some(pupil => pupil.studentId === reference.studentId)) fail('Rapportens elev måste vara mottagare.')
    reportState = await readPupilAnalysisState(reference.studentId, classContexts[reference.studentId], live.teacherId)
    reportReview = materialReportReview(reference, reportState, records, input.investigation.modelId,
      { rebase: Boolean(input.investigation.didactic) })
  }
  const investigation = input.investigation === undefined ? undefined : buildMaterialInvestigation(input.investigation,
    { kind: input.kind, mode: input.mode, audience, classContexts, records, items: content.items, reportReview, reportState })
  // Several suspicions: each target keeps its own report hypothesis and support answers.
  let investigations
  if (input.investigations !== undefined) {
    if (!Array.isArray(input.investigations)) fail('Ogiltig prövningsavsikt.')
    const states = new Map(), reportReviews = []
    for (const target of input.investigations) {
      const reference = target?.reportReview
      if (reference === undefined) { reportReviews.push(undefined); continue }
      object(reference, ['studentId', 'reportId', 'hypothesisId', 'checkInRevision', 'reopen'])
      if (!audience.pupils.some(pupil => pupil.studentId === reference.studentId)) fail('Rapportens elev måste vara mottagare.')
      if (!states.has(reference.studentId)) states.set(reference.studentId,
        await readPupilAnalysisState(reference.studentId, classContexts[reference.studentId], live.teacherId))
      const targetRecords = (Array.isArray(target.basisIndexes) ? target.basisIndexes : []).map(index => records[index]).filter(Boolean)
      reportReviews.push(materialReportReview(reference, states.get(reference.studentId), targetRecords, target.modelId))
    }
    investigations = buildMaterialInvestigations(input.investigations, { kind: input.kind, mode: input.mode, audience, classContexts,
      records, items: content.items, reportReviews }).map(plan => ({ ...plan, revision: evidenceHash(plan) }))
  }
  // Publication retries reuse their frozen assignment identities. Fresh draft
  // and approval reads check novelty; do not block receipt repair after answers.
  if (investigation?.didactic && req.body?.action !== 'publish') {
    const selected = new Set(content.items.map(item => questionFingerprint(evidenceProblem({ question: item.task }))))
    for (const pupil of audience.pupils) {
      const history = await readPupilEvidence({ ...req, headers: req.headers, query: {
        classId: classContexts[pupil.studentId], source: 'all', from: '2024-01-01', to: stockholmDay() } }, live, pupil.studentId, { unpaged: true })
      if (history.coverage?.screening?.invalidRecords > 0) fail('Historiken behöver granskas innan en ny kontroll kan föreslås.')
      const exposures = practiceExposureKeys(await assertPupilEvidenceAccess(req, pupil.studentId, classContexts[pupil.studentId]))
      if ([...selected].some(key => exposures.has(key)) || history.entries.some(entry => selected.has(questionFingerprint(evidenceProblem(entry))))) fail('Eleven har redan mött en vald kontrollfråga. Upprepa den inte som en ny kontroll.')
    }
  }
  const material = { schemaVersion: 1, kind: input.kind, mode: input.mode, titleSv, goalSv, instructionSv,
    sourceMaterials: sources, audience, classContexts, basis, content,
    pupilsWithoutAnalysis: audience.pupils.filter(p => !basis.some(item => item.studentId === p.studentId)).map(p => p.studentId),
    ...(investigation ? { investigation: { ...investigation, revision: evidenceHash(investigation) } } : {}),
    ...(investigations ? { investigations, investigationsRevision: evidenceHash(investigations.map(plan => plan.revision)) } : {}) }
  return { material, contentRevision: evidenceHash(material), saved: false, assigned: false, approval: 'not_requested' }
}
