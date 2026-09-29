import { describe, expect, it } from 'vitest'
import { credentialText } from './studentCredentialText'

describe('credentialText (Kopiera reservlista)', () => {
  it('börjar med tilltalsnamnet och separerar elever med tomma rader', () => {
    const text = credentialText([
      { name: 'Hilma', displayAlias: 'Lila Nyckel Uggla', pin: '3584', studentId: 'S1' },
      { name: 'Emil B', displayAlias: 'Gul Stjärna Karta Uggla', pin: '3163', studentId: 'S2' }
    ])
    expect(text.split('\n\n')).toEqual([
      'Hilma\nKodnamn: Lila Nyckel Uggla\nPIN: 3584\nElev-ID: S1',
      'Emil B\nKodnamn: Gul Stjärna Karta Uggla\nPIN: 3163\nElev-ID: S2'
    ])
    expect(text).not.toContain('\\n')
  })

  it('faller tillbaka på kodnamnet när eleven saknar tilltalsnamn', () => {
    const text = credentialText([{ name: '', displayAlias: 'Blå Räv', pin: '1234', studentId: 'S3' }])
    expect(text.startsWith('Blå Räv\nKodnamn: Blå Räv')).toBe(true)
  })
})
