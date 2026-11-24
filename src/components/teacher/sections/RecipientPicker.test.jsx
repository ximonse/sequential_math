import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import RecipientPicker, { countRecipientPupils } from './RecipientPicker'

const classes = [
  { id: 'c1', name: '6A' },
  { id: 'c2', name: '6B' },
]
const groups = [{ id: 'g1', name: 'Stöd', pupilIds: ['s1', 'S3'] }]
const students = [
  { studentId: 'S1', name: 'Anna', classId: 'c1' },
  { studentId: 'S2', name: 'Berit', classId: 'c2', classIds: ['c1'] },
  { studentId: 'S3', name: 'Cesar', classId: 'c3' },
]
const base = { classes, groups, students, onChange() {} }

describe('RecipientPicker summary', () => {
  it('says no recipient is chosen when the selection is empty', () => {
    const html = renderToStaticMarkup(<RecipientPicker {...base} recipients={[]} />)
    expect(html).toContain('Ingen mottagare vald.')
  })
})

describe('countRecipientPupils', () => {
  it('deduplicates a pupil who is in a selected class, a selected group and selected individually', () => {
    const recipients = [
      { type: 'class', id: 'c1' },
      { type: 'group', id: 'g1' },
      { type: 'student', id: 'S1' },
    ]
    // S1 via class and individually, S2 via classIds, S3 via group (case-insensitive 's1'/'S3').
    expect(countRecipientPupils(recipients, { classes, groups, students })).toBe(3)
  })
})

describe('RecipientPicker class toggles', () => {
  it('marks a selected class with aria-pressed="true"', () => {
    const html = renderToStaticMarkup(
      <RecipientPicker {...base} recipients={[{ type: 'class', id: 'c1' }]} />,
    )
    expect(html).toMatch(/aria-pressed="true"[^>]*>(<span[^>]*>✓ <\/span>)?6A</)
    expect(html).toMatch(/aria-pressed="false"[^>]*>6B</)
  })

  it('prefixes group buttons with "Grupp: "', () => {
    const html = renderToStaticMarkup(<RecipientPicker {...base} recipients={[]} />)
    expect(html).toContain('Grupp: Stöd')
  })
})

describe('RecipientPicker followsFilter', () => {
  it('shows the filter sentence only when followsFilter is true', () => {
    const sentence = 'Följer klassfiltret ovan. Välj här för att dela ut till andra.'
    const on = renderToStaticMarkup(<RecipientPicker {...base} recipients={[]} followsFilter />)
    const off = renderToStaticMarkup(<RecipientPicker {...base} recipients={[]} />)
    expect(on).toContain(sentence)
    expect(off).not.toContain(sentence)
  })
})

// Simon 2026-11-24: a marked class must be as clear here as in the class
// filter above, and the teacher must be able to get back to following the
// filter. An empty selection hands work to every class, so "Rensa" was the
// wrong way out.
describe('RecipientPicker and the class filter', () => {
  it('marks a selected class with the same green state as the class filter', () => {
    const html = renderToStaticMarkup(
      <RecipientPicker {...base} recipients={[{ type: 'class', id: 'c1' }]} />,
    )
    expect(html).toContain('data-recipient-selected="true"')
    expect(html).toContain('✓')
  })

  it('says the selection follows the class filter, and offers no clearing that means every class', () => {
    const html = renderToStaticMarkup(
      <RecipientPicker {...base} recipients={[{ type: 'class', id: 'c1' }]} followsFilter onFollowFilter={() => {}} />,
    )
    expect(html).toContain('Följer klassfiltret')
    expect(html).not.toContain('>Rensa<')
  })

  it('offers a way back to the class filter once the teacher has picked recipients', () => {
    const html = renderToStaticMarkup(
      <RecipientPicker {...base} recipients={[{ type: 'class', id: 'c2' }]} followsFilter={false} onFollowFilter={() => {}} />,
    )
    expect(html).toContain('Eget urval')
    expect(html).toContain('Följ klassfiltret igen')
  })
})
