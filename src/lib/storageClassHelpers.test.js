import { describe, expect, it } from 'vitest'
import { parseRosterLines } from './storageClassHelpers'

describe('parseRosterLines', () => {
  it('accepts newlines, commas, semicolons, and mixed separators', () => {
    expect(parseRosterLines('Anna Andersson, Bo Berg\r\nClara; David\rElin'))
      .toEqual(['Anna Andersson', 'Bo Berg', 'Clara', 'David', 'Elin'])
  })

  it('removes empty entries and surrounding whitespace', () => {
    expect(parseRosterLines('  Anna  , ,\n Bo \n')).toEqual(['Anna', 'Bo'])
  })
})
