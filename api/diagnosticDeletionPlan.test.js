import { describe, expect, it } from 'vitest'
import { studentDeletedKey } from './_studentStore.js'
import { planDiagnosticPupilDeletion } from './_diagnosticDeletionPlan.js'

function fixture() {
  const data = new Map([
    [studentDeletedKey('PUPIL'), 1],
    ['diagnostic_assignments_by_student:PUPIL', ['OPENED', 'UNOPENED']],
    ['diagnostic_attempts_by_student:PUPIL', ['ATTEMPT']],
    ['diagnostic_assignment:OPENED', { assignmentId: 'OPENED', classId: 'OLD_CLASS',
      studentIds: ['PUPIL', 'OTHER'], items: [{ assignmentItemId: 'ITEM' }] }],
    ['diagnostic_assignment:UNOPENED', { assignmentId: 'UNOPENED', classId: 'NEW_CLASS',
      studentIds: ['PUPIL'], items: [{ assignmentItemId: 'SECOND' }] }],
    ['diagnostic_attempt:ATTEMPT', { attemptId: 'ATTEMPT', studentId: 'PUPIL',
      assignmentId: 'OPENED', evidenceClass: 'diagnostic_only' }]
  ])
  return { data, exists: async key => Number(data.has(key)),
    get: async key => structuredClone(data.get(key) ?? null),
    smembers: async key => structuredClone(data.get(key) || []) }
}

describe('read-only diagnostic deletion plan', () => {
  it('finds opened and unopened assignments even after a class move', async () => {
    const store = fixture()
    const plan = await planDiagnosticPupilDeletion('PUPIL', { store })
    expect(plan.assignments).toEqual([
      { assignmentId: 'OPENED', remainingStudentIds: ['OTHER'],
        activeKeys: ['diagnostic_active:PUPIL:ITEM'] },
      { assignmentId: 'UNOPENED', remainingStudentIds: [],
        activeKeys: ['diagnostic_active:PUPIL:SECOND'] }
    ])
    expect(plan.attempts).toEqual([{ attemptId: 'ATTEMPT', assignmentId: 'OPENED',
      recordKey: 'diagnostic_attempt:ATTEMPT', eventsKey: 'diagnostic_attempt_events:ATTEMPT' }])
    expect(store.data.has('diagnostic_attempt:ATTEMPT')).toBe(true)
  })

  it('refuses a foreign indexed attempt rather than planning partial cleanup', async () => {
    const store = fixture()
    store.data.delete(studentDeletedKey('PUPIL'))
    await expect(planDiagnosticPupilDeletion('PUPIL', { store })).rejects.toThrow()
    store.data.set(studentDeletedKey('PUPIL'), 1)
    store.data.get('diagnostic_attempt:ATTEMPT').assignmentId = 'UNKNOWN'
    await expect(planDiagnosticPupilDeletion('PUPIL', { store })).rejects.toThrow()
  })
})
