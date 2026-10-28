import { kv } from '@vercel/kv'
import { getLiveTeacherAuthPayload } from './_helpers.js'
import { readMaterialDraft } from './_teacherMaterialStore.js'
import { readMaterialDispatch, recordMaterialDispatch } from './_teacherMaterialDispatchStore.js'
import { previewTeacherMaterial } from './_teacherMaterialPreview.js'
import { evidenceError, evidenceHash } from './_pupilEvidence.js'
import { assertPupilEvidenceAccess, assertEvidenceSourceAccess } from './_pupilEvidenceRead.js'
import { mutateStudentRecord } from './_studentStore.js'
import { assertTeacherStudentAccess } from './_studentAccess.js'
import { authCanManageGroup } from './_groupStore.js'
import { readActiveAssignments, withActiveAssignment } from '../src/lib/activeAssignments.js'
import { encodeAssignmentPayload } from '../src/lib/assignments.js'
import { prepareDiagnosticAssignment, createDiagnosticAssignment } from './_diagnosticAssignmentStore.js'

const fail = message => { throw evidenceError(409, 'publication_conflict', message) }
function unitsFor(item) {
  const pupils = item.material.audience.pupils
  if (item.material.kind === 'practice') return pupils.map(pupil => ({ id: pupil.studentId, pupils: [pupil], classId: item.material.classContexts?.[pupil.studentId] || '' }))
  const classes = new Map()
  for (const pupil of pupils) {
    const classId = item.material.classContexts?.[pupil.studentId]
    if (!classId) fail('En screeningmottagare saknar vald klasskontext. Spara och granska en aktuell version.')
    classes.set(classId, [...(classes.get(classId) || []), pupil])
  }
  return [...classes].sort(([a], [b]) => a.localeCompare(b)).flatMap(([classId, members]) => {
    const result = []
    for (let index = 0; index < members.length; index += 100) result.push({ id: `${classId}:${index / 100}`, classId, pupils: members.slice(index, index + 100) })
    return result
  })
}

async function assertUnitAccess(req, auth, state, item, unit) {
  const live = await getLiveTeacherAuthPayload(req)
  if (!live || evidenceHash(live) !== evidenceHash(auth)) throw evidenceError(403, 'publication_denied', 'Lärarens åtkomst har ändrats.')
  const current = await readMaterialDraft(state.teacherId, state.draftId)
  if (current?.versions.at(-1)?.version !== item.version || current.versions.at(-1).contentRevision !== item.contentRevision) fail('En ny utkastversion finns. Återstående utdelning har stoppats.')
  if (item.material.audience.targetType === 'group') {
    const group = await kv.get(`group:${item.material.audience.targetId}`)
    if (!authCanManageGroup(live, group) || unit.pupils.some(pupil => !group.pupilIds.includes(pupil.studentId))) fail('Gruppens medlemskap eller åtkomst har ändrats.')
  }
  for (const pupil of unit.pupils) {
    if (unit.classId) await assertPupilEvidenceAccess(req, pupil.studentId, unit.classId)
    if (item.material.kind === 'screening') assertEvidenceSourceAccess(live, pupil.studentId, 'screening')
  }
}

async function practice(req, auth, state, item, unit, createdAt) {
  const assignmentId = `material_${evidenceHash({ draftId: state.draftId, version: item.version }).slice(0, 24)}`
  const payload = encodeAssignmentPayload({ ...item.material.content.frame, id: assignmentId, createdAt })
  await mutateStudentRecord(unit.pupils[0].studentId, async current => {
    if (!current) throw evidenceError(410, 'pupil_unavailable', 'Eleven är inte längre tillgänglig.')
    await assertUnitAccess(req, auth, state, item, unit)
    await assertTeacherStudentAccess(req, current)
    if (unit.classId && ![current.classId, ...(current.classIds || [])].includes(unit.classId)) fail('Eleven har bytt klass.')
    const existing = readActiveAssignments(current).find(row => row.assignment.id === assignmentId)
    if (existing) {
      if (existing.payload !== payload) fail('Ett annat innehåll finns redan under uppdragets ID.')
      return undefined
    }
    return { ...current, ...withActiveAssignment(current, payload, { activatedBy: auth.teacherId, now: createdAt }) }
  })
  return assignmentId
}

async function screening(auth, state, item, unit) {
  const input = { ...item.input.content, taskIds: item.input.content.taskIds || [], classId: unit.classId,
    studentIds: unit.pupils.map(pupil => pupil.studentId), teacherId: auth.teacherId, titleSv: item.material.titleSv }
  const factory = () => { let index = 0; return () => `material_${evidenceHash({ draftId: state.draftId, version: item.version, unit: unit.id, index: ++index }).slice(0, 24)}` }
  const candidate = await prepareDiagnosticAssignment(input, { makeId: factory() })
  async function existing() {
    const value = await kv.get(`diagnostic_assignment:${candidate.assignmentId}`)
    if (!value) return null
    if (value.status !== 'active' || evidenceHash({ ...value, createdAt: 0 }) !== evidenceHash({ ...candidate, createdAt: 0 })) {
      fail('Samlingen har avslutats eller ändrats. Ett återförsök skapar inte en ny samling.')
    }
    return value.assignmentId
  }
  const prior = await existing()
  if (prior) return prior
  try { return (await createDiagnosticAssignment(input, { makeId: factory() })).assignmentId } catch (error) {
    const concurrent = await existing()
    if (concurrent) return concurrent
    throw error
  }
}

function remainingUnits(units, dispatch, requestId) {
  return units.filter(unit => unit.pupils.some(pupil => {
    const receipt = dispatch?.receipts.find(row => row.studentId === pupil.studentId)
    return receipt?.status !== 'confirmed' && receipt?.lastAttemptId !== requestId
  }))
}

export async function publishMaterialDraft(req, auth, state, command) {
  const item = state.versions.at(-1)
  if (auth.authSource !== 'cookie') throw evidenceError(403, 'publication_denied', 'Utdelning kräver lärarens inloggade granskningsvy.')
  if (!/^[A-Za-z0-9_-]{8,100}$/u.test(command.requestId || '') || command.version !== item.version || command.contentRevision !== item.contentRevision
    || state.revision !== command.expectedRevision) fail('Utdelningsbegäran stämmer inte med aktuell granskad version.')
  const approval = [...(state.approvals || [])].reverse().find(value => value.version === item.version && value.contentRevision === item.contentRevision
    && value.rosterRevision === item.material.audience.rosterRevision)
  if (!approval) throw evidenceError(403, 'approval_required', 'Granska och godkänn aktuell version och mottagare först.')
  const units = unitsFor(item)
  let dispatch = await readMaterialDispatch(state, item.version)
  if (dispatch?.status === 'complete') return { dispatch, hasMore: false }
  const preview = await previewTeacherMaterial(req, auth, item.input)
  if (preview.contentRevision !== item.contentRevision) fail('Underlag eller mottagare har ändrats. Granska en ny version före utdelning.')
  dispatch ||= await recordMaterialDispatch(state, item, [])
  // Bound one API call; the explicit UI action may continue in further pages.
  for (const unit of remainingUnits(units, dispatch, command.requestId).slice(0, 5)) {
    let rows
    try {
      await assertUnitAccess(req, auth, state, item, unit)
      const assignmentId = item.material.kind === 'practice' ? await practice(req, auth, state, item, unit, approval.createdAt)
        : await screening(auth, state, item, unit)
      rows = unit.pupils.map(pupil => ({ studentId: pupil.studentId, classId: unit.classId || null,
        assignmentId, status: 'confirmed', confirmedAt: Date.now(), lastAttemptId: command.requestId }))
    } catch (error) {
      rows = unit.pupils.map(pupil => ({ studentId: pupil.studentId, classId: unit.classId || null, status: error.status ? 'failed' : 'unknown',
        message: error.status ? error.message : 'Kvittensen är osäker. Läs status och återförsök samma utdelning.', lastAttemptId: command.requestId }))
    }
    dispatch = await recordMaterialDispatch(state, item, rows)
  }
  return { dispatch, hasMore: remainingUnits(units, dispatch, command.requestId).length > 0 }
}
