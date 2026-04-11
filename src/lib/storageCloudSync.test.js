import { describe, expect, it } from 'vitest'
import { mergeCloudSyncProblemEntries } from './storageCloudSync'

describe('mergeCloudSyncProblemEntries', () => {
  it('deduplicates entries using string correct answers for non-numeric domains', () => {
    const shared = {
      problemType: 'fractions',
      timestamp: 12345,
      studentAnswer: '1/2',
      correctAnswer: '1/2',
      values: { text: 'Förenkla: 2/4' }
    }

    const merged = mergeCloudSyncProblemEntries(
      [{ ...shared, source: 'local' }],
      [{ ...shared, errorCategory: 'none', source: 'cloud' }],
      250
    )

    expect(merged).toHaveLength(1)
    expect(merged[0].errorCategory).toBe('none')
    expect(merged[0].correctAnswer).toBe('1/2')
  })
})
