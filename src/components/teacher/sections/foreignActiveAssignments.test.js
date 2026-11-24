import { describe, expect, it } from 'vitest'
import { collectForeignActiveAssignments, teacherNameMap } from './foreignActiveAssignments'
import { encodeAssignmentPayload } from '../../../lib/assignments'

const payload = (id, title) => encodeAssignmentPayload({ id, title, kind: 'standard', problemTypes: ['addition'] })
const target = (name, record, type = 'class') => ({ type, id: name, name, record })

describe('collectForeignActiveAssignments', () => {
  it('reports an assignment that is active but missing from the own library', () => {
    const record = { activeAssignments: [{ payload: payload('asg_a', 'Talpar'), activatedAt: 5, activatedBy: 'T2' }] }
    const items = collectForeignActiveAssignments([target('6A', record)], [{ id: 'asg_mine' }], { T2: 'Kerstin' })
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ id: 'asg_a', targets: ['6A'], activatedByName: 'Kerstin' })
    expect(items[0].assignment.title).toBe('Talpar')
  })

  it('leaves out assignments the teacher already has in the library', () => {
    const record = { activeAssignments: [{ payload: payload('asg_a', 'Talpar'), activatedAt: 5 }] }
    expect(collectForeignActiveAssignments([target('6A', record)], [{ id: 'asg_a' }])).toEqual([])
  })

  it('names every target once and keeps the newest activation first', () => {
    const older = { activeAssignments: [{ payload: payload('asg_a', 'Talpar'), activatedAt: 5 }] }
    const newer = { activeAssignments: [{ payload: payload('asg_b', 'Dubblor'), activatedAt: 9 }] }
    const items = collectForeignActiveAssignments([target('6A', older), target('6B', older), target('G', newer, 'group')], [])
    expect(items.map(item => item.id)).toEqual(['asg_b', 'asg_a'])
    expect(items[1].targets).toEqual(['6A', '6B'])
  })

  it('reads a record written before the list existed, with no activating teacher', () => {
    const items = collectForeignActiveAssignments([target('6A', { activeAssignmentPayload: payload('asg_a', 'Talpar') })], [])
    expect(items).toHaveLength(1)
    expect(items[0].activatedAt).toBe(0)
    expect(items[0].activatedByName).toBe('')
  })

  it('leaves out an unknown teacher id rather than showing it', () => {
    const record = { activeAssignments: [{ payload: payload('asg_a', 'Talpar'), activatedAt: 5, activatedBy: 'ghost' }] }
    expect(collectForeignActiveAssignments([target('6A', record)], [], { T2: 'Kerstin' })[0].activatedByName).toBe('')
  })

  it('ignores records that carry no assignments, such as catalog-only pupils', () => {
    expect(collectForeignActiveAssignments([target('P1', { studentId: 'P1', catalogOnly: true }, 'student')], [])).toEqual([])
    expect(collectForeignActiveAssignments([{ type: 'class', id: 'x', name: 'x' }], [])).toEqual([])
  })
})

describe('teacherNameMap', () => {
  it('maps account ids to display names and skips unusable entries', () => {
    expect(teacherNameMap([{ id: 'T1', displayName: 'Simon' }, { displayName: 'Ingen' }, null])).toEqual({ T1: 'Simon' })
  })
})
