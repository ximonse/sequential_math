import { describe, expect, it } from 'vitest'
import { archiveDiagnosticAssignment, deleteDiagnosticAssignment } from './_diagnosticAssignmentRemoval.js'
import { deleteScreeningDraft } from './_screeningDraftStore.js'

function storage(entries = {}, sets = {}) {
  const values = new Map(Object.entries(entries)), members = new Map(Object.entries(sets).map(([key, list]) => [key, new Set(list)]))
  return {
    values, members,
    get: async key => structuredClone(values.get(key) ?? null),
    set: async (key, value) => { values.set(key, structuredClone(value)) },
    smembers: async key => [...(members.get(key) || [])],
    srem: async (key, ...items) => { items.forEach(item => members.get(key)?.delete(item)) },
    del: async (...keys) => { keys.forEach(key => { values.delete(key); members.delete(key) }) }
  }
}

const assignment = (status = 'stopped') => ({ assignmentId: 'A1', classId: 'C1', status, studentIds: ['P1', 'P2'], evidenceClass: 'diagnostic_only' })
const screening = (status, extra = {}) => storage({
  'diagnostic_assignment:A1': assignment(status), 'diagnostic_assignment:A2': { ...assignment(), assignmentId: 'A2' },
  'diagnostic_attempt:T1': { attemptId: 'T1', assignmentId: 'A1', studentId: 'P1', assignmentItemId: 'I1' },
  'diagnostic_attempt_events:T1': [{ sequence: 1 }], 'diagnostic_review:T1': { status: 'reviewed' },
  'diagnostic_active:P1:I1': 'T1', 'diagnostic_attempt:T9': { attemptId: 'T9', assignmentId: 'A2', studentId: 'P1' }, ...extra
}, {
  'diagnostic_attempts_by_assignment:A1': ['T1'], 'diagnostic_attempts_by_student:P1': ['T1', 'T9'],
  'diagnostic_assignments_by_student:P1': ['A1', 'A2'], 'diagnostic_assignments_by_student:P2': ['A1'],
  'diagnostic_assignments_by_class:C1': ['A1', 'A2']
})

describe('archiving a handed-out screening', () => {
  it('hides a stopped screening and can bring it back without touching answers', async () => {
    const store = screening('stopped')
    const archived = await archiveDiagnosticAssignment({ classId: 'C1', assignmentId: 'A1', teacherId: 'T', archived: true }, { store, now: 5 })
    expect(archived).toMatchObject({ archivedAt: 5, archivedBy: 'T', status: 'stopped' })
    expect(store.values.has('diagnostic_attempt:T1')).toBe(true)
    const restored = await archiveDiagnosticAssignment({ classId: 'C1', assignmentId: 'A1', teacherId: 'T', archived: false }, { store })
    expect(restored.archivedAt).toBeUndefined()
  })

  it('refuses an active screening and a screening in another class', async () => {
    await expect(archiveDiagnosticAssignment({ classId: 'C1', assignmentId: 'A1', archived: true }, { store: screening('active') })).rejects.toMatchObject({ status: 409 })
    await expect(archiveDiagnosticAssignment({ classId: 'C2', assignmentId: 'A1', archived: true }, { store: screening('stopped') })).rejects.toMatchObject({ status: 404 })
  })
})

describe('deleting a handed-out screening', () => {
  it('removes the screening, its answers and every index entry, and leaves other screenings alone', async () => {
    const store = screening('stopped')
    expect(await deleteDiagnosticAssignment({ classId: 'C1', assignmentId: 'A1' }, { store })).toEqual({ deleted: true, attempts: 1 })
    for (const key of ['diagnostic_assignment:A1', 'diagnostic_attempt:T1', 'diagnostic_attempt_events:T1', 'diagnostic_review:T1', 'diagnostic_active:P1:I1']) {
      expect(store.values.has(key)).toBe(false)
    }
    expect(await store.smembers('diagnostic_attempts_by_student:P1')).toEqual(['T9'])
    expect(await store.smembers('diagnostic_assignments_by_student:P1')).toEqual(['A2'])
    expect(await store.smembers('diagnostic_assignments_by_class:C1')).toEqual(['A2'])
    expect(store.values.has('diagnostic_attempt:T9')).toBe(true)
    expect(await deleteDiagnosticAssignment({ classId: 'C1', assignmentId: 'A1' }, { store })).toEqual({ deleted: false, attempts: 0 })
  })

  it('refuses an active screening and stops when the index points at another screening', async () => {
    await expect(deleteDiagnosticAssignment({ classId: 'C1', assignmentId: 'A1' }, { store: screening('active') })).rejects.toMatchObject({ status: 409 })
    const store = screening('stopped', { 'diagnostic_attempt:T1': { attemptId: 'T1', assignmentId: 'A2', studentId: 'P1' } })
    await expect(deleteDiagnosticAssignment({ classId: 'C1', assignmentId: 'A1' }, { store })).rejects.toMatchObject({ status: 409 })
    expect(store.values.has('diagnostic_assignment:A1')).toBe(true)
  })
})

describe('deleting a private screening draft', () => {
  it('removes only the teacher\'s own draft', async () => {
    const store = storage({ 'screening_draft:T:draft_00000001': { teacherId: 'T', draftId: 'draft_00000001' } }, { 'screening_drafts:T': ['draft_00000001', 'draft_00000002'] })
    expect(await deleteScreeningDraft('T', 'draft_00000001', { store })).toEqual({ deleted: true })
    expect(await store.smembers('screening_drafts:T')).toEqual(['draft_00000002'])
    expect(await deleteScreeningDraft('T', 'draft_00000001', { store })).toEqual({ deleted: false })
  })
})
