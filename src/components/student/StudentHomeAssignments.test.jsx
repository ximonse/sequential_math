import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import StudentHomeAssignments from './StudentHomeAssignments'

const classWork = { id: 'class-work', title: 'Veckans tabeller' }
const focus = { id: 'focus-1', title: 'Fokus Kim | Addition nivå 2-4' }

describe('StudentHomeAssignments', () => {
  it('puts work from the teacher to this pupil first and marks it', () => {
    const html = renderToStaticMarkup(<StudentHomeAssignments todo={[classWork, focus]} done={[]} onStart={() => {}}
      personalIds={new Set(['focus-1'])} />)
    expect(html).toContain('Från din lärare')
    expect(html).toContain('Fokus: Addition nivå 2-4')
    expect(html).not.toContain('Fokus Kim')
    expect(html).toContain('Starta nästa: Veckans tabeller')
    expect(html).toContain('2 att göra')
  })

  it('shows no teacher mark for class assignments', () => {
    const html = renderToStaticMarkup(<StudentHomeAssignments todo={[classWork]} done={[]} onStart={() => {}} />)
    expect(html).not.toContain('Från din lärare')
  })
})
