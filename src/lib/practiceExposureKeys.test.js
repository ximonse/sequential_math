import { expect, it } from 'vitest'
import { practiceExposureKeys } from './practiceExposureKeys.js'
import { questionFingerprint } from '../domains/predictableErrors/questionFingerprint.js'
it('excludes known questions in either available collection without mistaking missing clocks or answers for novelty', () => {
  const old = { operation: 'multiplication', values: { a: 6, b: 4.7 }, timestamp: 0 }
  const current = { operation: 'multiplication', values: { a: 8, b: 3.6 }, timestamp: 100 }
  const profile = { problemLog: [old], recentProblems: [current, current] }
  const before = JSON.stringify(profile), keys = practiceExposureKeys(profile)
  expect(keys.size).toBe(2)
  for (const row of [old, current]) expect(keys.has(questionFingerprint({ domain: 'arithmetic', type: 'multiplication', values: row.values }))).toBe(true)
  expect(JSON.stringify(profile)).toBe(before)
})
