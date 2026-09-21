import { describe, expect, it } from 'vitest'
import { buildDataQualitySummary } from './dashboardInsightsHelpers'

describe('dashboard evidence quality summary', () => {
  it('keeps contract, classifiable legacy and unknown evidence separate', () => {
    const summary = buildDataQualitySummary([
      {
        name: 'Ada',
        evidenceClassification: { contract: 8, legacyClassified: 2, unknown: 1 }
      },
      {
        name: 'Bo',
        evidenceClassification: { contract: 5, legacyClassified: 3, unknown: 0 }
      }
    ])

    expect(summary).toMatchObject({
      contractEvidence: 13,
      legacyClassifiedEvidence: 5,
      unknownEvidence: 1,
      studentsWithUnknownEvidence: 1
    })
  })
})
