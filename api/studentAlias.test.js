import { describe, expect, it } from 'vitest'
import { generateDisplayAlias, generateStudentPin, isValidStudentDisplayAlias } from './_studentAlias.js'

describe('student display aliases', () => {
  it('creates child-safe three or four word aliases without a name input', () => {
    for (let index = 0; index < 50; index++) {
      const alias = generateDisplayAlias()
      expect([3, 4]).toContain(alias.split(' ').length)
      expect(isValidStudentDisplayAlias(alias)).toBe(true)
    }
  })

  it('avoids aliases already used in a class', () => {
    const first = generateDisplayAlias({ wordCount: 3 })
    const second = generateDisplayAlias({ wordCount: 3, taken: new Set([first.toLowerCase()]) })
    expect(second.toLocaleLowerCase('sv-SE')).not.toBe(first.toLocaleLowerCase('sv-SE'))
  })

  it('validates only aliases from the curated word lists', () => {
    expect(isValidStudentDisplayAlias('Röd Bok Räv')).toBe(true)
    expect(isValidStudentDisplayAlias('Röd Sol Bok Räv')).toBe(true)
    expect(isValidStudentDisplayAlias('Steve Bok Räv')).toBe(false)
    expect(isValidStudentDisplayAlias('Röd Bok')).toBe(false)
  })

  it('creates exactly four decimal PIN digits', () => {
    for (let index = 0; index < 100; index++) {
      expect(generateStudentPin()).toMatch(/^\d{4}$/)
    }
  })

  it('rejects unsupported alias generator options', () => {
    expect(() => generateDisplayAlias({ wordCount: 2 })).toThrow('wordCount must be 3 or 4')
    expect(() => generateDisplayAlias({ taken: 'not a collection' })).toThrow('taken must be a Set or an array')
  })
})
