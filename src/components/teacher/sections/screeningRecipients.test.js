import { describe, expect, it } from 'vitest'
import { applyScreeningLimits, buildScreeningDispatches } from './screeningRecipients.js'

const classes = [{ id: 'k1', name: '6A' }, { id: 'k2', name: '6B' }]
const students = [
  { studentId: 'anna', name: 'Anna', classId: 'k1' },
  { studentId: 'bo', name: 'Bo', classId: 'k2' },
  { studentId: 'cia', name: 'Cia', classId: 'gone', classIds: ['k2'] },
  { studentId: 'dan', name: 'Dan', classId: 'gone' }
]
const groups = [{ id: 'g1', pupilIds: ['BO', 'cia', 'dan'] }]

describe('buildScreeningDispatches', () => {
  it('gives one dispatch per class and lets a whole class cover its picked pupils', () => {
    const { dispatches, withoutClass } = buildScreeningDispatches([
      { type: 'class', id: 'k1' },
      { type: 'student', id: 'anna' },
      { type: 'group', id: 'g1' }
    ], { classes, groups, students })
    expect(dispatches).toEqual([
      { classId: 'k1', className: '6A', wholeClass: true, studentIds: [] },
      { classId: 'k2', className: '6B', wholeClass: false, studentIds: ['bo', 'cia'] }
    ])
    expect(withoutClass).toEqual(['Dan'])
  })

  it('returns nothing for an empty selection', () => {
    expect(buildScreeningDispatches([], { classes, groups, students })).toEqual({ dispatches: [], withoutClass: [] })
  })
})

describe('applyScreeningLimits', () => {
  const whole = { classId: 'k1', className: '6A', wholeClass: true, studentIds: [] }
  const some = { classId: 'k2', className: '6B', wholeClass: false, studentIds: ['bo', 'cia'] }

  it('keeps allowed pupils, blocks the rest and waits for unchecked classes', () => {
    const result = applyScreeningLimits([whole, some, { ...some, classId: 'k3' }], {
      k1: { allowed: [], wholeClassAvailable: false },
      k2: { allowed: ['bo'], wholeClassAvailable: false }
    })
    expect(result.ready).toEqual([{ ...some, studentIds: ['bo'] }])
    expect(result.blocked.map(item => [item.classId, item.reason])).toEqual([
      ['k1', 'testbegränsningen tillåter inte hela klassen'],
      ['k2', 'eleverna finns inte på testlistan']
    ])
    expect(result.pending.map(item => item.classId)).toEqual(['k3'])
  })
})
