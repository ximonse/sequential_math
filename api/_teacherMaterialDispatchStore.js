import { kv } from '@vercel/kv'
import { materialKey } from './_teacherMaterialStore.js'
import { evidenceError } from './_pupilEvidence.js'
import { studentDeletedKey } from './_studentStore.js'

export const MATERIAL_DISPATCH_CAS = `
local parent = redis.call('GET', KEYS[2])
if not parent then return -1 end
local draft = cjson.decode(parent)
local latest = draft.versions[#draft.versions]
if latest.version ~= tonumber(ARGV[3]) or latest.contentRevision ~= ARGV[4] then return -1 end
local approved = false
for _, approval in ipairs(draft.approvals or {}) do
  if approval.version == latest.version and approval.contentRevision == latest.contentRevision then approved = true end
end
if not approved then return -1 end
for i = 3, #KEYS do if redis.call('EXISTS', KEYS[i]) == 1 then return -2 end end
local current = redis.call('GET', KEYS[1])
local revision = current and cjson.decode(current).revision or 0
if revision ~= tonumber(ARGV[1]) then return 0 end
redis.call('SET', KEYS[1], ARGV[2])
return 1
`
export const dispatchKey = (teacherId, draftId, version) => `teacher_material_dispatch:${teacherId}:${draftId}:${version}`

export async function readMaterialDispatch(state, version, { store = kv } = {}) {
  const value = await store.get(dispatchKey(state.teacherId, state.draftId, version))
  if (value && (value.teacherId !== state.teacherId || value.draftId !== state.draftId || value.version !== version || !Array.isArray(value.receipts))) {
    throw evidenceError(409, 'dispatch_inconsistent', 'Utdelningskvittot behöver granskas.')
  }
  return value
}

export async function recordMaterialDispatch(state, item, incoming, { store = kv } = {}) {
  const material = item.material, pupilIds = material.audience.pupils.map(pupil => pupil.studentId)
  for (let attempt = 0; attempt < 8; attempt++) {
    const current = await readMaterialDispatch(state, item.version, { store }) || {
      schemaVersion: 1, teacherId: state.teacherId, draftId: state.draftId, version: item.version,
      contentRevision: item.contentRevision, rosterRevision: material.audience.rosterRevision,
      studentIds: pupilIds, revision: 0, receipts: [] }
    if (current.contentRevision !== item.contentRevision || current.rosterRevision !== material.audience.rosterRevision) {
      throw evidenceError(409, 'dispatch_conflict', 'Utdelningsversionen stämmer inte.')
    }
    const merged = new Map(current.receipts.map(row => [row.studentId, row]))
    for (const row of incoming) {
      if (!pupilIds.includes(row.studentId)) throw evidenceError(400, 'dispatch_invalid', 'Mottagaren ingår inte i den granskade listan.')
      const prior = merged.get(row.studentId)
      if (prior?.status === 'confirmed' && row.status === 'confirmed' && prior.assignmentId !== row.assignmentId) {
        throw evidenceError(409, 'dispatch_inconsistent', 'Två olika uppdrags-ID:n finns för samma granskade mottagare.')
      }
      if (prior?.status !== 'confirmed') merged.set(row.studentId, row)
    }
    const receipts = [...merged.values()]
    const confirmed = receipts.filter(row => row.status === 'confirmed').length
    const failed = receipts.filter(row => row.status === 'failed').length
    const unknown = receipts.filter(row => row.status === 'unknown').length
    const pending = pupilIds.length - confirmed - failed - unknown
    const next = { ...current, revision: current.revision + 1, receipts, confirmed, failed, unknown,
      pending, status: confirmed === pupilIds.length ? 'complete' : pending ? 'in_progress' : confirmed ? 'partial' : unknown ? 'uncertain' : 'failed' }
    const result = Number(await store.eval(MATERIAL_DISPATCH_CAS,
      [dispatchKey(state.teacherId, state.draftId, item.version), materialKey(state.teacherId, state.draftId),
        ...pupilIds.flatMap(id => [studentDeletedKey(id), `student_deleted:${id}`])],
      [current.revision, JSON.stringify(next), item.version, item.contentRevision]))
    if (result === 1) return next
    if (result === -1) throw evidenceError(409, 'dispatch_conflict', 'En ny innehållsversion eller ett nytt godkännande behöver granskas.')
    if (result === -2) throw evidenceError(410, 'dispatch_unavailable', 'En mottagare har tagits bort; utdelningen har stoppats.')
  }
  throw evidenceError(409, 'dispatch_conflict', 'En annan utdelning pågår. Läs senaste kvitto före återförsök.')
}
