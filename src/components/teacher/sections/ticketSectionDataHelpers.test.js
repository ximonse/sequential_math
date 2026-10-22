import { describe, expect, it } from 'vitest'
import { splitTicketRecipients } from './ticketSectionDataHelpers.js'

describe('splitTicketRecipients', () => {
  const students = [{ studentId: 'Anna' }, { studentId: 'bo' }, { studentId: 'cia' }]
  const groups = [{ id: 'g1', pupilIds: ['anna', 'okand'] }]

  it('keeps class ids and expands groups and pupils to loaded pupil ids', () => {
    const result = splitTicketRecipients([
      { type: 'class', id: 'k1' },
      { type: 'group', id: 'g1' },
      { type: 'student', id: 'BO' },
      { type: 'student', id: 'anna' }
    ], groups, students)
    expect(result).toEqual({ classIds: ['k1'], studentIds: ['Anna', 'bo'] })
  })

  it('returns nothing for an empty selection', () => {
    expect(splitTicketRecipients([], groups, students)).toEqual({ classIds: [], studentIds: [] })
  })
})
