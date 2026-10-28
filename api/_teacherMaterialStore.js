import { kv } from '@vercel/kv'
import { evidenceError, evidenceHash } from './_pupilEvidence.js'
import { studentDeletedKey } from './_studentStore.js'

export const MATERIAL_DRAFT_CAS = `
for i = 3, #KEYS do if redis.call('EXISTS', KEYS[i]) == 1 then return -1 end end
local raw = redis.call('GET', KEYS[1])
local revision = raw and cjson.decode(raw).revision or 0
if revision ~= tonumber(ARGV[1]) then return 0 end
if not raw and redis.call('SCARD', KEYS[2]) >= 100 then return -2 end
redis.call('SET', KEYS[1], ARGV[2])
redis.call('SADD', KEYS[2], ARGV[3])
return 1
`
export const materialKey = (teacherId, draftId) => `teacher_material:${teacherId}:${draftId}`
export const materialIndex = teacherId => `teacher_material_index:${teacherId}`
const validId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/u.test(value)

export async function readMaterialDraft(teacherId, draftId, { store = kv } = {}) {
  if (!validId(draftId)) throw evidenceError(400, 'invalid_draft', 'Ogiltigt utkast-ID.')
  const state = await store.get(materialKey(teacherId, draftId))
  if (!state) return null
  if (state.teacherId !== teacherId || state.draftId !== draftId || state.schemaVersion !== 1
    || !Number.isSafeInteger(state.revision) || !Array.isArray(state.versions)) {
    throw evidenceError(409, 'draft_inconsistent', 'Utkastlagringen behöver granskas.')
  }
  return state
}

export async function saveMaterialDraft(teacherId, command, preview, { store = kv, now = Date.now() } = {}) {
  const { requestId, expectedRevision, expectedContentRevision, material: input } = command
  if (!validId(requestId) || requestId.length < 8 || requestId.length > 100 || !Number.isSafeInteger(expectedRevision) || expectedRevision < 0
    || expectedContentRevision !== preview.contentRevision) {
    throw evidenceError(409, 'draft_conflict', 'Förhandsvisningen eller lagringsrevisionen stämmer inte. Läs om och granska aktuell version.')
  }
  const draftId = command.draftId || `mat_${evidenceHash({ teacherId, requestId }).slice(0, 24)}`
  const state = await readMaterialDraft(teacherId, draftId, { store }) || { schemaVersion: 1, teacherId, draftId, revision: 0, versions: [] }
  const prior = state.versions.find(version => version.requestId === requestId)
  if (prior) {
    if (prior.contentRevision !== preview.contentRevision) throw evidenceError(409, 'request_reused', 'Begäran har redan använts för annat innehåll.')
    return { state, savedVersion: prior.version }
  }
  if (state.revision !== expectedRevision) throw evidenceError(409, 'draft_conflict', 'En annan version är sparad. Behåll din text och jämför.')
  if (state.versions.length >= 20) throw evidenceError(413, 'draft_full', 'Utkastet har 20 versioner; tidigare versioner har bevarats.')
  const next = { ...state, revision: state.revision + 1, versions: [...state.versions, {
    version: state.versions.length + 1, requestId, createdAt: now, contentRevision: preview.contentRevision, input, material: preview.material
  }] }
  if (Buffer.byteLength(JSON.stringify(next)) > 2 * 1024 * 1024) throw evidenceError(413, 'draft_full', 'Utkastets historik är för stor.')
  const pupils = [...new Set(next.versions.flatMap(version => version.material.audience.pupils.map(p => p.studentId)))]
  const classes = [...new Set(next.versions.flatMap(version => version.material.audience.pupils.flatMap(p => p.classIds)))]
  const saved = Number(await store.eval(MATERIAL_DRAFT_CAS,
    [materialKey(teacherId, draftId), materialIndex(teacherId), ...pupils.flatMap(id => [studentDeletedKey(id), `student_deleted:${id}`]),
      ...classes.map(id => `class_deleted:${id}`)], [expectedRevision, JSON.stringify(next), draftId]))
  if (saved === -1) throw evidenceError(410, 'draft_unavailable', 'En elev eller klass har tagits bort.')
  if (saved === -2) throw evidenceError(413, 'draft_full', 'Lärarkontot har redan 100 utkast.')
  if (saved === 0) {
    const current = await readMaterialDraft(teacherId, draftId, { store })
    const same = current?.versions.find(version => version.requestId === requestId && version.contentRevision === preview.contentRevision)
    if (same) return { state: current, savedVersion: same.version }
  }
  if (saved !== 1) throw evidenceError(409, 'draft_conflict', 'En annan skrivning hann före. Läs senaste version innan återförsök.')
  return { state: next, savedVersion: next.versions.at(-1).version }
}

export async function approveMaterialDraft(state, command, preview, { store = kv, now = Date.now() } = {}) {
  const item = state.versions.at(-1)
  if (!validId(command.requestId) || command.requestId.length < 8 || command.requestId.length > 100
    || command.version !== item.version || command.contentRevision !== item.contentRevision
    || preview.contentRevision !== item.contentRevision) {
    throw evidenceError(409, 'approval_conflict', 'Innehåll, underlag eller mottagare har ändrats. Granska en aktuell version.')
  }
  const previous = (state.approvals || []).find(value => value.requestId === command.requestId)
  if (previous) {
    if (previous.version !== item.version || previous.contentRevision !== item.contentRevision) throw evidenceError(409, 'request_reused', 'Begäran har redan använts för ett annat godkännande.')
    return { state, approval: previous }
  }
  if (state.revision !== command.expectedRevision) throw evidenceError(409, 'approval_conflict', 'Utkastet har ändrats; läs senaste version.')
  const approval = { id: `approval_${evidenceHash({ draftId: state.draftId, requestId: command.requestId }).slice(0, 24)}`,
    version: item.version, contentRevision: item.contentRevision, rosterRevision: item.material.audience.rosterRevision,
    requestId: command.requestId, createdAt: now }
  if ((state.approvals || []).length >= 100) throw evidenceError(413, 'approval_full', 'Godkännandehistoriken är full. Äldre poster har bevarats.')
  const next = { ...state, revision: state.revision + 1, approvals: [...(state.approvals || []), approval] }
  if (Buffer.byteLength(JSON.stringify(next)) > 2 * 1024 * 1024) throw evidenceError(413, 'draft_full', 'Utkastets historik är för stor.')
  const pupils = [...new Set(next.versions.flatMap(version => version.material.audience.pupils.map(p => p.studentId)))]
  const classes = [...new Set(next.versions.flatMap(version => version.material.audience.pupils.flatMap(p => p.classIds)))]
  const saved = Number(await store.eval(MATERIAL_DRAFT_CAS,
    [materialKey(state.teacherId, state.draftId), materialIndex(state.teacherId),
      ...pupils.flatMap(id => [studentDeletedKey(id), `student_deleted:${id}`]), ...classes.map(id => `class_deleted:${id}`)],
    [state.revision, JSON.stringify(next), state.draftId]))
  if (saved === -1) throw evidenceError(410, 'draft_unavailable', 'En elev eller klass har tagits bort.')
  if (saved !== 1) throw evidenceError(409, 'approval_conflict', 'En annan ändring hann före. Läs senaste status innan återförsök.')
  return { state: next, approval }
}
