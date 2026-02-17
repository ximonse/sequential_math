import { describe, expect, it } from 'vitest'
import { normalizeStudentId } from './storage'

describe('normalizeStudentId', () => {
  it('preserves Swedish letters to avoid Å/Ä/Ö collisions', () => {
    expect(normalizeStudentId('Åsa')).toBe('ÅSA')
    expect(normalizeStudentId('Asa')).toBe('ASA')
    expect(normalizeStudentId('Örjan')).toBe('ÖRJAN')
  })

  it('normalizes unsupported symbols to underscores', () => {
    expect(normalizeStudentId('  klass 4a! ')).toBe('KLASS_4A')
    expect(normalizeStudentId('Namn/ID')).toBe('NAMN_ID')
  })
})
