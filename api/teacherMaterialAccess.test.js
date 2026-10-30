import { beforeEach, expect, it, vi } from 'vitest'
const mock = vi.hoisted(() => ({ auth: vi.fn(), pupil: vi.fn(), source: vi.fn(), audience: vi.fn() }))
vi.mock('./_helpers.js', () => ({ getLiveTeacherAuthPayload: mock.auth }))
vi.mock('./_pupilEvidenceRead.js', () => ({ assertPupilEvidenceAccess: mock.pupil, assertEvidenceSourceAccess: mock.source }))
vi.mock('./_teacherAudience.js', () => ({ assertTeacherAudienceTargetAccess: mock.audience }))
import { assertMaterialDraftAccess } from './_teacherMaterialAccess.js'
const state = () => ({ teacherId: 'T', versions: [{ material: { kind: 'practice', basis: [], audience: {
  targetType: 'group', targetId: 'G', pupils: [{ studentId: 'P', classIds: ['C'] }] } } },
{ material: { kind: 'practice', basis: [], audience: { targetType: 'group', targetId: 'G', pupils: [{ studentId: 'Q', classIds: ['C'] }] } } }] })
beforeEach(() => {
  vi.resetAllMocks(); mock.auth.mockResolvedValue({ teacherId: 'T', role: 'teacher' })
  mock.pupil.mockResolvedValue({}); mock.audience.mockResolvedValue({})
})
it('checks all frozen versions and blocks access if an older version contains a now inaccessible pupil', async () => {
  await assertMaterialDraftAccess({}, state())
  expect(mock.pupil.mock.calls.map(([, id]) => id)).toEqual(['P', 'Q'])
  mock.pupil.mockImplementation(async (_req, id) => { if (id === 'P') throw Object.assign(new Error('Revoked'), { status: 403 }) })
  await expect(assertMaterialDraftAccess({}, state())).rejects.toMatchObject({ status: 403 })
})
it('requires current group access, original analysis class access and screening role', async () => {
  mock.audience.mockRejectedValueOnce(Object.assign(new Error('Group revoked'), { status: 403 }))
  await expect(assertMaterialDraftAccess({}, state())).rejects.toMatchObject({ status: 403 })
  const screened = state(); screened.versions[0].material.kind = 'screening'
  mock.source.mockImplementation(() => { throw Object.assign(new Error('Role revoked'), { status: 403 }) })
  await expect(assertMaterialDraftAccess({}, screened)).rejects.toMatchObject({ status: 403 })
})
it('rejects another teacher and role/session changes during historical reads', async () => {
  mock.auth.mockResolvedValueOnce({ teacherId: 'OTHER' })
  await expect(assertMaterialDraftAccess({}, state())).rejects.toMatchObject({ status: 403 })
  mock.auth.mockResolvedValueOnce({ teacherId: 'T', role: 'school_admin' }).mockResolvedValueOnce({ teacherId: 'T', role: 'teacher' })
  await expect(assertMaterialDraftAccess({}, state())).rejects.toMatchObject({ status: 403 })
})
it('rejects a revoked pupil anywhere in a larger frozen recipient list', async () => {
  const large = state()
  large.versions[0].material.audience.pupils = Array.from({ length: 31 }, (_, index) => ({ studentId: `P${index}`, classIds: ['C'] }))
  mock.pupil.mockImplementation(async (_req, id) => {
    if (id === 'P30') throw Object.assign(Error('Revoked'), { status: 403 })
    return {}
  })
  await expect(assertMaterialDraftAccess({}, large)).rejects.toMatchObject({ status: 403 })
})
