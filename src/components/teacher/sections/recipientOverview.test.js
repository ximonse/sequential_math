import { describe, expect, it } from 'vitest'
import { buildRecipientOverview } from './recipientOverview.js'
import { encodeAssignmentPayload } from '../../../lib/assignments.js'

describe('buildRecipientOverview', () => {
  const students = [
    { studentId: 'anna', name: 'Anna', classId: 'k1', ticketInbox: { activePayload: { title: 'Start: 6 · 7' } } },
    { studentId: 'bo', name: 'Bo', classId: 'k1' }
  ]
  const assignments = [{ id: 'a1', title: 'Bara addition' }]
  const assignmentTargets = [
    { type: 'class', id: 'k1', name: '6A', record: { activeAssignments: [{ payload: encodeAssignmentPayload(assignments[0]), activatedBy: 'teacher-a' }] } },
    { type: 'student', id: 'bo', name: 'Bo', record: { activeAssignmentPayload: encodeAssignmentPayload({ id: 'other', title: 'Annans uppdrag' }) } }
  ]

  it('lists direct assignments and active tickets per recipient', () => {
    const rows = buildRecipientOverview(
      [{ type: 'class', id: 'k1' }, { type: 'student', id: 'anna' }, { type: 'student', id: 'bo' }],
      { assignmentTargets, assignments, students }
    )
    expect(rows).toEqual([
      { type: 'class', id: 'k1', name: '6A', pupilCount: 2,
        directAssignments: [{ id: 'a1', title: 'Bara addition', inLibrary: true, activatedBy: 'teacher-a' }],
        tickets: [{ title: 'Start: 6 · 7', count: 1 }] },
      { type: 'student', id: 'anna', name: 'Anna', pupilCount: 1, directAssignments: [], tickets: [{ title: 'Start: 6 · 7', count: 1 }] },
      { type: 'student', id: 'bo', name: 'Bo', pupilCount: 1,
        directAssignments: [{ id: 'other', title: 'Annans uppdrag', inLibrary: false, activatedBy: undefined }], tickets: [] }
    ])
  })
})
