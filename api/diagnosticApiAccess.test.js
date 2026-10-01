import { describe, expect, it } from 'vitest'
import { assertDiagnosticPupilAccess } from './_diagnosticApiAccess.js'

const profile = { studentId: 'PUPIL', classIds: ['CLASS'] }
const record = { studentId: 'PUPIL', assignmentId: 'ASSIGNMENT', assignmentItemId: 'ITEM',
  classIdAtAttempt: 'CLASS', taskId: 'add-no-carry-001', taskVersion: 1,
  evidenceClass: 'diagnostic_only' }
const assignment = { status: 'active', evidenceClass: 'diagnostic_only', classId: 'CLASS',
  studentIds: ['PUPIL'], items: [{ assignmentItemId: 'ITEM', taskId: 'add-no-carry-001', taskVersion: 1 }] }
function store(override = {}) {
  const data = new Map([['diagnostic_assignment:ASSIGNMENT', { ...assignment, ...override }],
    ['class:CLASS', { id: 'CLASS' }]])
  return { get: async key => data.get(key) || null, exists: async key => Number(data.has(key)), data }
}

describe('diagnostic pupil access', () => {
  it('accepts only the current assigned pupil and frozen item', async () => {
    await expect(assertDiagnosticPupilAccess(profile, record, { store: store() })).resolves.toMatchObject(assignment)
    await expect(assertDiagnosticPupilAccess({ ...profile, studentId: 'OTHER' }, record, { store: store() }))
      .rejects.toMatchObject({ status: 403 })
    await expect(assertDiagnosticPupilAccess({ ...profile, classIds: [] }, record, { store: store() }))
      .rejects.toMatchObject({ status: 403 })
    await expect(assertDiagnosticPupilAccess(profile, record, { store: store({ studentIds: ['OTHER'] }) }))
      .rejects.toMatchObject({ status: 403 })
    await expect(assertDiagnosticPupilAccess(profile, record, { store: store({ status: 'stopped' }) }))
      .rejects.toMatchObject({ status: 403 })
  })

  it('rejects a deleted or archived class and a changed task version', async () => {
    const deleted = store()
    deleted.data.set('class_deleted:CLASS', 'deleted')
    await expect(assertDiagnosticPupilAccess(profile, record, { store: deleted }))
      .rejects.toMatchObject({ status: 403 })
    const archived = store()
    archived.data.set('class:CLASS', { id: 'CLASS', archived: true })
    await expect(assertDiagnosticPupilAccess(profile, record, { store: archived }))
      .rejects.toMatchObject({ status: 403 })
    await expect(assertDiagnosticPupilAccess(profile, { ...record, taskVersion: 2 }, { store: store() }))
      .rejects.toMatchObject({ status: 403 })
  })
})
