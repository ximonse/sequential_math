import { beforeEach, expect, it, vi } from 'vitest'
const mock = vi.hoisted(() => ({ audience: vi.fn(), auth: vi.fn(), evidence: vi.fn(), eval: vi.fn() }))
vi.mock('@vercel/kv', () => ({ kv: { eval: mock.eval } }))
vi.mock('./_teacherAudience.js', () => ({ resolveTeacherAudience: mock.audience }))
vi.mock('./_helpers.js', () => ({ getLiveTeacherAuthPayload: mock.auth }))
vi.mock('./_pupilEvidenceRead.js', () => ({ readPupilEvidence: mock.evidence, assertEvidenceSourceAccess: vi.fn() }))
import { previewTeacherMaterial } from './_teacherMaterialPreview.js'
import { createDiagnosticAssignment, prepareDiagnosticAssignment } from './_diagnosticAssignmentStore.js'
const auth = { teacherId: 'T' }, revision = 'a'.repeat(64), ref = 'b'.repeat(64)
const general = () => ({ schemaVersion: 1, kind: 'practice', mode: 'general', titleSv: 'Tabell', goalSv: 'Tabell 7',
  instructionSv: 'Räkna.', audience: { targetType: 'student', targetId: 'P', rosterRevision: revision },
  content: { kind: 'table', tables: [7], targetCount: 10 } })
const specific = () => ({ ...general(), mode: 'specific', basis: [{ studentId: 'P', classId: 'C',
  from: '2026-10-01', to: '2026-10-28', source: 'practice', snapshotRevision: revision,
  supportRefs: [ref], counterRefs: [], reasonSv: 'Ett felsvar att undersöka.' }] })
beforeEach(() => {
  vi.resetAllMocks()
  mock.eval.mockResolvedValue(1)
  mock.auth.mockResolvedValue(auth)
  mock.audience.mockResolvedValue({ targetType: 'student', targetId: 'P', rosterRevision: revision,
    total: 1, pupils: [{ studentId: 'P', classIds: ['C'] }], nextOffset: null })
  mock.evidence.mockResolvedValue({ source: 'practice', entries: [{ ref }], coverage: { completeness: 'unknown' } })
})
it('generic preview needs no analysis and cannot be presented as saved, approved or assigned', async () => {
  const result = await previewTeacherMaterial({}, auth, general())
  expect(result).toMatchObject({ saved: false, assigned: false, approval: 'not_requested' })
  expect(result.material.content.frame).toMatchObject({ kind: 'table', tables: [7] })
  expect(mock.evidence).not.toHaveBeenCalled()
})
it('specific requires valid current pupil/class references and records the supplied rationale with coverage', async () => {
  const result = await previewTeacherMaterial({}, auth, specific())
  expect(result.material.basis[0].coverage.completeness).toBe('unknown')
  expect(result.material.pupilsWithoutAnalysis).toEqual([])
  expect(mock.evidence.mock.calls[0][0].query.snapshotRevision).toBe(revision)
  await expect(previewTeacherMaterial({}, auth, { ...general(), mode: 'specific' })).rejects.toMatchObject({ status: 400 })
  const foreign = specific(); foreign.basis[0].studentId = 'OTHER'
  await expect(previewTeacherMaterial({}, auth, foreign)).rejects.toMatchObject({ status: 400 })
  mock.evidence.mockResolvedValue({ source: 'practice', entries: [], coverage: {} })
  await expect(previewTeacherMaterial({}, auth, specific())).rejects.toMatchObject({ status: 400 })
})
it('rejects unsupported filters, unknown fields and values that normalization would silently change', async () => {
  for (const content of [{ kind: 'invented' }, { kind: 'standard', problemTypes: ['UNKNOWN'] },
    { kind: 'standard', minLevel: 99 }, { kind: 'table', tables: [7], requireBorrow: true }]) {
    await expect(previewTeacherMaterial({}, auth, { ...general(), content })).rejects.toMatchObject({ status: 400 })
  }
  await expect(previewTeacherMaterial({}, auth, { ...general(), approved: true })).rejects.toMatchObject({ status: 400 })
})
it('rechecks the roster and live session after source reads', async () => {
  mock.audience.mockResolvedValueOnce({ rosterRevision: revision, pupils: [{ studentId: 'P', classIds: ['C'] }], nextOffset: null })
    .mockRejectedValueOnce(Object.assign(new Error('Changed'), { status: 409 }))
  await expect(previewTeacherMaterial({}, auth, general())).rejects.toMatchObject({ status: 409 })
  mock.audience.mockResolvedValue({ rosterRevision: revision, pupils: [{ studentId: 'P', classIds: ['C'] }], nextOffset: null })
  mock.auth.mockResolvedValue({ teacherId: 'OTHER' })
  await expect(previewTeacherMaterial({}, auth, general())).rejects.toMatchObject({ status: 403 })
})
it('preparing a screening writes nothing while the normal create API retains its default KV store', async () => {
  const input = { classId: 'C', studentIds: ['P'], teacherId: 'T', taskIds: ['sub-through-zero-001'] }
  const preview = await prepareDiagnosticAssignment(input)
  expect(preview.items[0].taskSnapshot.operands).toEqual([402, 178])
  expect(mock.eval).not.toHaveBeenCalled()
  const created = await createDiagnosticAssignment(input)
  expect(created.assignmentId).toBeTruthy()
  expect(mock.eval).toHaveBeenCalledOnce()
})
