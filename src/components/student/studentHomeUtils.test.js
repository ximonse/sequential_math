import { describe, expect, it } from 'vitest'
import { buildPracticePath } from './studentHomeUtils'

// Table practice is carried by the query string alone. If a launch path drops
// it, the session silently becomes ordinary practice and serves any
// multiplication, which is what pupils saw as "problems from other tables".
describe('buildPracticePath med tabeller', () => {
  it('bär med vald tabell så sessionen förblir tabellträning', () => {
    expect(buildPracticePath('ABC', { mode: 'multiplication', tables: [7] })).toContain('tables=7')
  })

  it('släpper ogiltiga tabeller', () => {
    expect(buildPracticePath('ABC', { tables: [1, 13, 'x'] })).not.toContain('tables=')
  })
})
