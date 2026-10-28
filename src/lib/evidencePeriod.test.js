import { describe, expect, it } from 'vitest'
import { defaultEvidenceDays, evidencePeriod } from './evidencePeriod.js'

describe('Stockholm evidence periods', () => {
  it('supports afternoon windows with inclusive starts and exclusive clock ends in winter and summer', () => {
    const winter = evidencePeriod('2026-10-27T12:00', '2026-10-27T13:00')
    expect(new Date(winter.startInclusive).toISOString()).toBe('2026-10-27T11:00:00.000Z')
    expect(new Date(winter.endExclusive).toISOString()).toBe('2026-10-27T12:00:00.000Z')
    const summer = evidencePeriod('2026-07-01T12:00', '2026-07-01')
    expect(new Date(summer.startInclusive).toISOString()).toBe('2026-07-01T10:00:00.000Z')
    expect(new Date(summer.endExclusive).toISOString()).toBe('2026-07-01T22:00:00.000Z')
    expect(() => evidencePeriod('2026-10-27T13:00', '2026-10-27T13:00')).toThrow()
  })
  it('never silently guesses a nonexistent or repeated local clock time', () => {
    expect(() => evidencePeriod('2026-03-29T02:30', '2026-03-29')).toThrow(/finns inte/u)
    expect(() => evidencePeriod('2026-10-25T02:30', '2026-10-25')).toThrow(/tvetydigt/u)
    const first = evidencePeriod('2026-10-25T02:30+02:00', '2026-10-25T02:30+01:00')
    expect(first.endExclusive - first.startInclusive).toBe(3600000)
    expect(() => evidencePeriod('2026-07-01T12:00+01:00', '2026-07-01')).toThrow(/offset/u)
    for (const time of ['2026-02-30T12:00', '2026-10-27T24:00', '2026-10-27T12:60', '2026-10-27T12:00Z']) {
      expect(() => evidencePeriod(time, '2026-12-31')).toThrow()
    }
  })
  it('includes whole local days across both daylight saving transitions', () => {
    const spring = evidencePeriod('2026-03-29', '2026-03-29')
    expect(new Date(spring.startInclusive).toISOString()).toBe('2026-03-28T23:00:00.000Z')
    expect(spring.endExclusive - spring.startInclusive).toBe(23 * 3600000)
    const autumn = evidencePeriod('2026-10-25', '2026-10-25')
    expect(autumn.endExclusive - autumn.startInclusive).toBe(25 * 3600000)
    expect(new Date(autumn.endExclusive).toISOString()).toBe('2026-10-25T23:00:00.000Z')
  })
  it('rejects normalized invalid dates and reversed ranges', () => {
    for (const day of ['2026-02-30', '2025-02-29', '26-01-01', '', null, '2026-13-01']) {
      expect(() => evidencePeriod(day, '2026-12-31')).toThrow()
    }
    expect(() => evidencePeriod('2026-10-27', '2026-10-26')).toThrow()
    expect(() => evidencePeriod('2024-02-29', '2024-02-29')).not.toThrow()
  })
  it('defaults to the current Stockholm week even on a different UTC day', () => {
    expect(defaultEvidenceDays(Date.parse('2026-10-25T23:30:00Z')))
      .toEqual({ from: '2026-10-26', to: '2026-10-26' })
  })
})
