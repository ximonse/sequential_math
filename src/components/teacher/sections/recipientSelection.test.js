import { describe, expect, it } from 'vitest'
import { resolveRecipientSelection, resolveScreeningRecipients } from './recipientSelection'

const context = { classes: [{ id: 'a', name: '6A' }, { id: 'b', name: '6B' }], groups: [{ id: 'g', pupilIds: ['ONE', 'two'] }], students: [
  { studentId: 'one', name: 'One', classId: 'a', classIds: ['a', 'b'] },
  { studentId: 'two', name: 'Two', classId: 'b' }, { studentId: 'three', name: 'Three' }
] }
describe('screening recipient selection', () => {
  it('deduplicates classes, groups and individuals including pupils with several class memberships', () => {
    const picks = [{ type: 'class', id: 'a' }, { type: 'class', id: 'b' }, { type: 'group', id: 'g' }, { type: 'student', id: 'one' }]
    const result = resolveScreeningRecipients(picks, context)
    expect(result.pupils.map(item => item.studentId)).toEqual(['one', 'two'])
    expect(result.dispatches.map(item => item.studentIds)).toEqual([['one'], ['two']])
    expect(resolveScreeningRecipients(picks.filter(item => item.id !== 'a'), context).dispatches).toEqual([
      { classId: 'b', className: '6B', wholeClass: false, studentIds: ['one', 'two'] }
    ])
  })
  it('reports removed recipients and pupils without a usable class instead of silently substituting targets', () => {
    const picks = [{ type: 'student', id: 'three' }, { type: 'class', id: 'removed' }]
    expect(resolveScreeningRecipients(picks, context)).toMatchObject({ missing: 1, withoutClass: ['Three'], dispatches: [] })
    expect(resolveRecipientSelection([{ type: 'group', id: 'gone' }], context)).toMatchObject({ missing: 1, pupils: [] })
  })
})
