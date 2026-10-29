import { beforeEach, expect, it, vi } from 'vitest'
const mock = vi.hoisted(() => ({ auth: vi.fn(), pupil: vi.fn(), source: vi.fn(), audience: vi.fn() }))
vi.mock('./_helpers.js', () => ({ getLiveTeacherAuthPayload: mock.auth }))
vi.mock('./_pupilEvidenceRead.js', () => ({ assertPupilEvidenceAccess: mock.pupil, assertEvidenceSourceAccess: mock.source }))
vi.mock('./_teacherAudience.js', () => ({ resolveTeacherAudience: mock.audience }))
import { listMaterialDrafts } from './_teacherMaterialList.js'

const auth = { teacherId: 'T', role: 'teacher' }
let records, indices, store
const version = (title, pupil = 'P', number = 1) => ({ version: number, createdAt: number, contentRevision: `content-${number}`,
  input: { instructionSv: 'PRIVATE_INSTRUCTION' }, material: { titleSv: title, kind: 'practice', mode: 'general', basis: [],
    audience: { targetType: 'class', targetId: 'C', pupils: [{ studentId: pupil, classIds: ['C'] }] } } })
function draft(id, versions = [version(id)]) {
  indices.set('teacher_material_index:T', [...(indices.get('teacher_material_index:T') || []), id])
  records.set(`teacher_material:T:${id}`, { schemaVersion: 1, teacherId: 'T', draftId: id, revision: versions.length, versions })
}
const req = query => ({ query: { resource: 'drafts', ...query } })
beforeEach(() => {
  vi.resetAllMocks(); mock.auth.mockResolvedValue(auth); mock.pupil.mockResolvedValue({}); mock.audience.mockResolvedValue({})
  records = new Map(); indices = new Map()
  store = { get: async key => structuredClone(records.get(key) || null), smembers: async key => indices.get(key) || [] }
})
it('lists only current-owner metadata and the latest version without private content, references or recipients', async () => {
  draft('draft-one', [version('Old'), version('Latest', 'Q', 2)])
  records.get('teacher_material:T:draft-one').approvals = [{ version: 1, contentRevision: 'content-1' }]
  const result = await listMaterialDrafts(req(), auth, { store })
  expect(result.drafts).toEqual([{ draftId: 'draft-one', revision: 2, version: 2, titleSv: 'Latest', kind: 'practice', mode: 'general',
    updatedAt: 2, approval: 'not_requested', reviewPath: '/teacher/material/draft-one?version=2' }])
  expect(JSON.stringify(result)).not.toMatch(/PRIVATE_INSTRUCTION|studentId|classIds|basis|contentRevision/u)
  expect(mock.pupil.mock.calls.map(([, id]) => id)).toEqual(['P', 'Q'])
  mock.auth.mockResolvedValue({ teacherId: 'OTHER', role: 'teacher' })
  expect((await listMaterialDrafts(req(), { teacherId: 'OTHER', role: 'teacher' }, { store })).drafts).toEqual([])
})
it('pages stable IDs and rejects changed indexes or attempts to select another owner', async () => {
  draft('draft-b'); draft('draft-a')
  const first = await listMaterialDrafts(req({ limit: '1' }), auth, { store })
  expect(first.drafts[0].draftId).toBe('draft-a'); expect(first.nextOffset).toBe(1)
  const next = await listMaterialDrafts(req({ limit: '1', offset: '1', indexRevision: first.indexRevision }), auth, { store })
  expect(next.drafts[0].draftId).toBe('draft-b'); expect(next.nextOffset).toBeNull()
  draft('draft-c')
  await expect(listMaterialDrafts(req({ offset: '1', indexRevision: first.indexRevision }), auth, { store })).rejects.toMatchObject({ code: 'draft_list_changed' })
  await expect(listMaterialDrafts(req({ teacherId: 'OTHER' }), auth, { store })).rejects.toMatchObject({ status: 400 })
  await expect(listMaterialDrafts(req({ limit: '21' }), auth, { store })).rejects.toMatchObject({ status: 400 })
})
it('hides titles when any historical recipient loses access and never disguises storage failure as an empty list', async () => {
  draft('draft-hidden', [version('Old', 'REVOKED'), version('SENSITIVE_TITLE', 'Q', 2)])
  draft('draft-visible')
  mock.pupil.mockImplementation(async (_req, id) => { if (id === 'REVOKED') throw Object.assign(Error('Revoked'), { status: 403 }) })
  const result = await listMaterialDrafts(req(), auth, { store })
  expect(result.drafts.map(d => d.draftId)).toEqual(['draft-visible'])
  expect(JSON.stringify(result)).not.toContain('SENSITIVE_TITLE')
  mock.pupil.mockRejectedValue(Object.assign(Error('Storage unavailable'), { status: 503 }))
  await expect(listMaterialDrafts(req(), auth, { store })).rejects.toMatchObject({ status: 503 })
})
it('rejects a session or permission change before returning any metadata', async () => {
  draft('draft-one')
  mock.auth.mockResolvedValueOnce(auth).mockResolvedValueOnce(auth).mockResolvedValueOnce({ ...auth, role: 'school_admin' })
  await expect(listMaterialDrafts(req(), auth, { store })).rejects.toMatchObject({ status: 403 })
})
