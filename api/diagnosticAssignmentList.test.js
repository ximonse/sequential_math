import { describe, expect, it } from 'vitest'
import { listClassDiagnosticAssignments, listPupilDiagnosticAssignments } from './_diagnosticAssignmentList.js'

function fixture() {
  const data = new Map([
    ['class:CLASS', { id: 'CLASS' }],
    ['diagnostic_assignments_by_class:CLASS', ['A', 'B', 'FOREIGN']],
    ['diagnostic_assignment:A', { assignmentId: 'A', classId: 'CLASS', status: 'active',
      evidenceClass: 'diagnostic_only', studentIds: ['PUPIL'], createdAt: 1,
      instructionSv: 'Räkna.', items: [{ assignmentItemId: 'ITEM', taskId: 'TASK', taskVersion: 1,
        taskSnapshot: { promptSv: '2 + 3', answer: '5' } }] }],
    ['diagnostic_assignment:B', { assignmentId: 'B', classId: 'CLASS', status: 'stopped',
      evidenceClass: 'diagnostic_only', studentIds: ['PUPIL'], createdAt: 2, items: [] }],
    ['diagnostic_assignment:FOREIGN', { assignmentId: 'FOREIGN', classId: 'OTHER', status: 'active',
      evidenceClass: 'diagnostic_only', studentIds: ['PUPIL'], items: [] }]
  ])
  return { data, get: async key => structuredClone(data.get(key) ?? null),
    smembers: async key => structuredClone(data.get(key) ?? []), exists: async key => Number(data.has(key)) }
}

describe('diagnostic assignment discovery', () => {
  it('lists only live class assignments and gives pupils only their prompts', async () => {
    const store = fixture()
    expect((await listClassDiagnosticAssignments('CLASS', { store })).map(item => item.assignmentId)).toEqual(['B', 'A'])
    const mine = await listPupilDiagnosticAssignments({ studentId: 'PUPIL', classIds: ['CLASS'] }, { store })
    expect(mine).toHaveLength(1)
    expect(mine[0].items[0]).toEqual({ assignmentItemId: 'ITEM', taskId: 'TASK', taskVersion: 1, promptSv: '2 + 3' })
    expect(JSON.stringify(mine)).not.toMatch(/answer|studentIds|teacherId/u)
    expect(await listPupilDiagnosticAssignments({ studentId: 'OTHER', classIds: ['CLASS'] }, { store })).toEqual([])
  })

  it('hides assignments after class deletion or archival', async () => {
    const store = fixture()
    store.data.set('class_deleted:CLASS', 'deleted')
    expect(await listPupilDiagnosticAssignments({ studentId: 'PUPIL', classId: 'CLASS' }, { store })).toEqual([])
    store.data.delete('class_deleted:CLASS')
    store.data.set('class:CLASS', { id: 'CLASS', archived: true })
    expect(await listClassDiagnosticAssignments('CLASS', { store })).toEqual([])
  })
})
