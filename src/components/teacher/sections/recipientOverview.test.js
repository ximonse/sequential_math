import { describe, expect, it } from 'vitest'
import { buildRecipientOverview } from './recipientOverview.js'

describe('buildRecipientOverview', () => {
  const students = [
    { studentId: 'anna', name: 'Anna', classId: 'k1', ticketInbox: { activePayload: { title: 'Start: 6 · 7' } } },
    { studentId: 'bo', name: 'Bo', classId: 'k1' }
  ]
  const assignments = [{ id: 'a1', title: 'Bara addition' }]
  const assignmentTargets = [
    { type: 'class', id: 'k1', name: '6A', assignmentIds: ['a1'] },
    { type: 'student', id: 'bo', name: 'Bo', assignmentIds: [] }
  ]

  it('lists direct assignments and active tickets per recipient', () => {
    const rows = buildRecipientOverview(
      [{ type: 'class', id: 'k1' }, { type: 'student', id: 'anna' }],
      { assignmentTargets, assignments, students }
    )
    expect(rows).toEqual([
      { type: 'class', id: 'k1', name: '6A', pupilCount: 2, assignmentTitles: ['Bara addition'], tickets: [{ title: 'Start: 6 · 7', count: 1 }] },
      { type: 'student', id: 'anna', name: 'Anna', pupilCount: 1, assignmentTitles: [], tickets: [{ title: 'Start: 6 · 7', count: 1 }] }
    ])
  })
})
