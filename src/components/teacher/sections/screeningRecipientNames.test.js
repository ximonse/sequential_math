import { describe, expect, it } from 'vitest'
import { describeRecipients } from './screeningRecipientNames'

const students = [
  { studentId: 'a', name: 'Alva Berg', classId: 'c6a' }, { studentId: 'b', name: 'Elis Holm', classId: 'c6a' },
  { studentId: 'c', name: 'Maja Lind', classId: 'c6a' }, { studentId: 'd', name: 'Noah Ek', classId: 'c6a' },
  { studentId: 'e', name: 'Saga Nord', classId: 'c6b' }
]
const classNames = new Map([['c6a', 'Klass 6A'], ['c6b', 'Klass 6B']])
const collection = (...members) => ({ members: members.map(([classId, studentIds]) => ({ classId, studentIds })) })

describe('describeRecipients', () => {
  it('names specific pupils instead of counting them', () => {
    expect(describeRecipients(collection(['c6a', ['d']]), { students, classNames })).toEqual({ short: 'Noah Ek (Klass 6A)', full: 'Klass 6A: Noah Ek' })
  })

  it('calls a fully covered roster the whole class', () => {
    const result = describeRecipients(collection(['c6a', ['a', 'b', 'c', 'd']], ['c6b', ['e']]), { students, classNames })
    expect(result.short).toBe('Hela Klass 6A · Hela Klass 6B')
    expect(result.full).toBe('Klass 6A (hela klassen): Alva Berg, Elis Holm, Maja Lind, Noah Ek\nKlass 6B (hela klassen): Saga Nord')
  })

  it('shortens long lists and keeps every name in the full text', () => {
    const many = [...students.slice(0, 4), { studentId: 'x', name: 'Ny Elev', classId: 'c6a' }]
    const result = describeRecipients(collection(['c6a', ['a', 'b', 'c', 'd']]), { students: many, classNames })
    expect(result.short).toBe('Alva Berg, Elis Holm, Maja Lind +1 till (Klass 6A)')
    expect(result.full).toContain('Noah Ek')
  })

  it('names pupils who have left the roster', () => {
    expect(describeRecipients(collection(['c6a', ['gone']]), { students, classNames }).short).toBe('Elev som inte längre finns (Klass 6A)')
  })

  it('does not claim pupils are gone while the student catalog is still empty', () => {
    expect(describeRecipients(collection(['c6a', ['a', 'b']]), { students: [], classNames }).short).toBe('2 elever (Klass 6A)')
  })
})
