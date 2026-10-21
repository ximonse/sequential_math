import { describe, expect, it } from 'vitest'
import { encodeAssignmentPayload } from './assignments.js'
import { activeAssignmentIds, readActiveAssignments, withActiveAssignment, withoutActiveAssignment } from './activeAssignments.js'

const payload = (id, title = id) => encodeAssignmentPayload({ id, title, problemTypes: ['addition'], minLevel: 1, maxLevel: 3, createdAt: 1 })

describe('active assignments on a class or group', () => {
  it('reads the older single assignment as a one-item list', () => {
    expect(activeAssignmentIds({ activeAssignmentPayload: payload('asg_old') })).toEqual(['asg_old'])
    expect(readActiveAssignments({})).toEqual([])
    expect(readActiveAssignments({ activeAssignments: [{ payload: 'broken' }] })).toEqual([])
  })

  it('adds newest first, replaces the same assignment and keeps the newest as the legacy field', () => {
    let record = { activeAssignmentPayload: payload('asg_old') }
    record = { ...record, ...withActiveAssignment(record, payload('asg_a'), { now: 10, activatedBy: 'T' }) }
    record = { ...record, ...withActiveAssignment(record, payload('asg_b'), { now: 20 }) }
    expect(activeAssignmentIds(record)).toEqual(['asg_b', 'asg_a', 'asg_old'])
    record = { ...record, ...withActiveAssignment(record, payload('asg_a', 'Ny titel'), { now: 30 }) }
    expect(activeAssignmentIds(record)).toEqual(['asg_a', 'asg_b', 'asg_old'])
    expect(readActiveAssignments(record)[0].assignment.title).toBe('Ny titel')
    expect(record.activeAssignmentPayload).toBe(payload('asg_a', 'Ny titel'))
    expect(withActiveAssignment(record, 'broken')).toBe(null)
  })

  it('removes one assignment and clears the legacy field with the last one', () => {
    let record = { ...withActiveAssignment({}, payload('asg_a')) }
    record = { ...record, ...withActiveAssignment(record, payload('asg_b')) }
    record = { ...record, ...withoutActiveAssignment(record, 'asg_b') }
    expect(activeAssignmentIds(record)).toEqual(['asg_a'])
    record = { ...record, ...withoutActiveAssignment(record, 'asg_a') }
    expect(record).toMatchObject({ activeAssignments: [], activeAssignmentPayload: null })
  })
})
