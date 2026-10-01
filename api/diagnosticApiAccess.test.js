import { describe, expect, it } from 'vitest'
import { assertDiagnosticPupilAccess, diagnosticTestStudentAllowed, diagnosticTestStudentIds,
  diagnosticTestStudentsInClass } from './_diagnosticApiAccess.js'

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
  it('requires an explicit test-account allowlist even when the API flag is enabled', () => {
    const previous = process.env.NCM_DIAGNOSTIC_TEST_STUDENT_IDS
    try {
      delete process.env.NCM_DIAGNOSTIC_TEST_STUDENT_IDS
      expect(diagnosticTestStudentAllowed('PUPIL')).toBe(false)
      process.env.NCM_DIAGNOSTIC_TEST_STUDENT_IDS = ' PUPIL, PUPIL,OTHER '
      expect(diagnosticTestStudentIds()).toEqual(['PUPIL', 'OTHER'])
      expect(diagnosticTestStudentAllowed('PUPIL')).toBe(true)
      expect(diagnosticTestStudentAllowed('UNKNOWN')).toBe(false)
    } finally {
      if (previous === undefined) delete process.env.NCM_DIAGNOSTIC_TEST_STUDENT_IDS
      else process.env.NCM_DIAGNOSTIC_TEST_STUDENT_IDS = previous
    }
  })

  it('lists allowed test accounts only inside the requested class', async () => {
    const previous = process.env.NCM_DIAGNOSTIC_TEST_STUDENT_IDS
    try {
      process.env.NCM_DIAGNOSTIC_TEST_STUDENT_IDS = 'PUPIL,OTHER'
      const data = new Map([['student:PUPIL', { studentId: 'PUPIL', classIds: ['CLASS'] }],
        ['student:OTHER', { studentId: 'OTHER', classIds: ['FOREIGN'] }]])
      const store = { get: async key => data.get(key) || null, exists: async key => Number(data.has(key)) }
      expect(await diagnosticTestStudentsInClass('CLASS', { store })).toEqual(['PUPIL'])
    } finally {
      if (previous === undefined) delete process.env.NCM_DIAGNOSTIC_TEST_STUDENT_IDS
      else process.env.NCM_DIAGNOSTIC_TEST_STUDENT_IDS = previous
    }
  })
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
