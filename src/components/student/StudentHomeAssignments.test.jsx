import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import StudentHomeAssignments from './StudentHomeAssignments'

const classWork = { id: 'class-work', title: 'Veckans tabeller' }
const focus = { id: 'focus-1', title: 'Fokus Kim | Addition nivå 2-4' }
const done = { id: 'old', title: 'Förra veckan' }

describe('StudentHomeAssignments', () => {
  it('shows each assignment once, work for this pupil first and marked', () => {
    const html = renderToStaticMarkup(<StudentHomeAssignments todo={[classWork, focus]} done={[done]} onStart={() => {}}
      personalIds={new Set(['focus-1'])} />)
    expect(html.match(/data-assignment-launch/g)).toHaveLength(2)
    expect(html.indexOf('Från din lärare')).toBeLessThan(html.indexOf('Veckans tabeller'))
    expect(html).toContain('Fokus: Addition nivå 2-4')
    expect(html).toContain('aria-label="Starta nästa: Fokus Kim | Addition nivå 2-4"')
    expect(html).toContain('aria-label="Starta uppdraget: Veckans tabeller"')
    expect(html).toContain('2 att göra · 1 klara')
    expect(html).toContain('Visa klara (1)')
    expect(html).not.toContain('Förra veckan')
  })

  it('shows no teacher mark for class assignments', () => {
    const html = renderToStaticMarkup(<StudentHomeAssignments todo={[classWork]} done={[]} onStart={() => {}} />)
    expect(html).not.toContain('Från din lärare')
  })
})
