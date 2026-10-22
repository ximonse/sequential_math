import { describe, expect, it } from 'vitest'
import { encodeAssignmentPayload } from './assignments.js'
import { assignmentLaunchPath, endsAtTaskCount, getAssignmentTarget, markAssignmentCompleted,
  nextUndoneAssignment, splitAssignments } from './assignmentQueue.js'

const make = (id, extra = {}) => ({ id, title: id, problemTypes: ['addition'], createdAt: 1, ...extra })
const item = (assignment, activatedAt) => ({ payload: encodeAssignmentPayload(assignment), activatedAt })

describe('assignment queue', () => {
  it('orders undone assignments oldest first and keeps done ones apart', () => {
    const profile = {}
    const items = [item(make('asg_new'), 300), item(make('asg_old'), 100), item(make('asg_mid'), 200)]
    markAssignmentCompleted(profile, make('asg_mid'), 250)
    const { todo, done } = splitAssignments(profile, items)
    expect(todo.map(item => item.id)).toEqual(['asg_old', 'asg_new'])
    expect(done.map(item => item.id)).toEqual(['asg_mid'])
    expect(nextUndoneAssignment(profile, items, 'asg_old').id).toBe('asg_new')
    expect(nextUndoneAssignment(profile, [items[2]])).toBe(null)
  })

  it('treats a reactivated assignment as undone again', () => {
    const profile = {}
    markAssignmentCompleted(profile, make('asg_a'), 100)
    expect(splitAssignments(profile, [item(make('asg_a'), 50)]).done).toHaveLength(1)
    expect(splitAssignments(profile, [item(make('asg_a'), 150)]).todo).toHaveLength(1)
  })

  it('adds a completion time to NCM progress without losing its skills', () => {
    const profile = { assignmentProgress: { 'assignment:asg_n': { kind: 'ncm', completedSkillTags: ['a'], totalSkillTags: 2 } } }
    markAssignmentCompleted(profile, make('asg_n', { kind: 'ncm' }), 70)
    expect(profile.assignmentProgress['assignment:asg_n']).toMatchObject({ kind: 'ncm', completedSkillTags: ['a'], completedAt: 70 })
  })

  it('ends ordinary practice at its task count but leaves self-ending kinds alone', () => {
    expect(endsAtTaskCount(make('asg_a'))).toBe(true)
    expect(endsAtTaskCount(make('asg_m', { kind: 'math_practice' }))).toBe(true)
    expect(endsAtTaskCount(make('asg_b', { problemTypes: ['number_bonds'] }))).toBe(false)
    expect(endsAtTaskCount(make('asg_t', { kind: 'table', tables: [6] }))).toBe(false)
    expect(endsAtTaskCount(null)).toBe(false)
    expect(getAssignmentTarget({ targetCount: 12 })).toBe(12)
    expect(getAssignmentTarget({})).toBe(30)
  })

  it('starts each kind in the right place', () => {
    expect(assignmentLaunchPath('S1', make('asg_t', { kind: 'table', tables: [6, 8] }))).toMatch(/^\/student\/S1\/practice\?.*mode=multiplication&tables=6%2C8$/)
    expect(assignmentLaunchPath('S1', make('asg_f', { kind: 'focus', focusMode: 'choose' }))).toMatch(/^\/student\/S1\?assignment=asg_f&/)
    expect(assignmentLaunchPath('S1', make('asg_s', { kind: 'subitizing' }))).toMatch(/^\/student\/S1\/subitizing\?/)
    expect(assignmentLaunchPath('S1', make('asg_p'))).toMatch(/^\/student\/S1\/practice\?assignment=asg_p&/)
  })
})
