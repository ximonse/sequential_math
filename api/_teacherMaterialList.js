import { kv } from '@vercel/kv'
import { getLiveTeacherAuthPayload } from './_helpers.js'
import { evidenceError, evidenceHash } from './_pupilEvidence.js'
import { assertMaterialDraftAccess } from './_teacherMaterialAccess.js'
import { materialIndex, readMaterialDraft } from './_teacherMaterialStore.js'

const fail = message => { throw evidenceError(400, 'invalid_draft_list', message) }
function integer(value, fallback, min, max) {
  if (value === undefined) return fallback
  if (!/^\d+$/u.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) < min || Number(value) > max) fail('Ogiltig sida eller sidstorlek.')
  return Number(value)
}

// The index is private to the session owner. Page by stable IDs rather than
// loading every version of every draft, and authorize history before metadata.
export async function listMaterialDrafts(req, auth, { store = kv } = {}) {
  const query = req.query || {}
  if (Object.keys(query).some(key => !['resource', 'limit', 'offset', 'indexRevision'].includes(key))) fail('Listan tar inte emot andra urvalsparametrar.')
  const limit = integer(query.limit, 10, 1, 20), offset = integer(query.offset, 0, 0, 100)
  const ids = [...new Set(await store.smembers(materialIndex(auth.teacherId)) || [])].sort()
  if (ids.length > 100 || ids.some(id => typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/u.test(id))) {
    throw evidenceError(409, 'draft_list_inconsistent', 'Utkastindexet behöver granskas.')
  }
  const indexRevision = evidenceHash(ids)
  if (query.indexRevision !== undefined && query.indexRevision !== indexRevision) {
    throw evidenceError(409, 'draft_list_changed', 'Utkastlistan har ändrats. Läs listan från början.')
  }
  const drafts = []
  // Bound overlapping history checks; each draft retains all of its checks and
  // Promise.all preserves the stable index order even when reads finish early.
  const pageIds = ids.slice(offset, offset + limit)
  for (let start = 0; start < pageIds.length; start += 4) {
    const batch = await Promise.all(pageIds.slice(start, start + 4).map(async draftId => {
      const state = await readMaterialDraft(auth.teacherId, draftId, { store })
      if (!state) return null
      try { await assertMaterialDraftAccess(req, state) }
      catch (error) {
        if ([403, 404, 410].includes(error.status)) return null
        throw error
      }
      const latest = state.versions.at(-1), material = latest?.material
      if (!Number.isSafeInteger(latest?.version) || latest.version < 1 || typeof material?.titleSv !== 'string'
        || !['practice', 'screening'].includes(material.kind) || !['general', 'specific'].includes(material.mode)) {
        throw evidenceError(409, 'draft_inconsistent', 'Utkastlagringen behöver granskas.')
      }
      return { draftId, revision: state.revision, version: latest.version, titleSv: material.titleSv,
        kind: material.kind, mode: material.mode, updatedAt: latest.createdAt,
        approval: (state.approvals || []).some(item => item.version === latest.version && item.contentRevision === latest.contentRevision) ? 'approved' : 'not_requested',
        reviewPath: `/teacher/material/${draftId}?version=${latest.version}` }
    }))
    drafts.push(...batch.filter(Boolean))
  }
  const live = await getLiveTeacherAuthPayload(req)
  if (!live || evidenceHash(live) !== evidenceHash(auth)) throw evidenceError(403, 'draft_access_denied', 'Lärarsessionen har ändrats.')
  return { drafts, indexRevision, nextOffset: offset + limit < ids.length ? offset + limit : null }
}
