import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { errorCoverage, mergeCoverage, wrongAnswerBucket, WRONG_BUCKETS } from './errorCoverage.js'
import { syntheticCoverageEntries } from './errorCoverageFixture.js'
import { addPredictableEvidence } from './evidencePredictableAnalysis.js'
import { ERROR_MODELS } from '../domains/predictableErrors/catalog.js'
import { SNAPSHOT, syntheticSnapshot } from '../../scripts/error-coverage.mjs'

// Rules R-C and R-D in docs/STYRNING_FELFORSTAELSER.md: no wrong answer may
// disappear from the count, and the coverage is stored per version.
const strip = entries => entries.map(({ expectedModel: _model, expectedReason: _reason, ...entry }) => entry)
const fixture = syntheticCoverageEntries()

describe('error coverage', () => {
  it('counts every answer once and every wrong answer in exactly one bucket', () => {
    const summary = errorCoverage({ entries: strip(fixture), hiddenSlips: ['a', 'b'] })
    expect(summary.total).toBe(fixture.length)
    expect(summary.hiddenSlips).toBe(2)
    expect(WRONG_BUCKETS.reduce((sum, bucket) => sum + summary.wrong[bucket], 0)).toBe(summary.statuses.incorrect)
    expect(summary.unansweredWithWork).toBe(1)
  })

  it('places a model example in its own kind, or a stronger kind that also explains it', () => {
    const analysed = addPredictableEvidence(strip(fixture))
    fixture.forEach((source, index) => {
      if (!source.expectedModel) return
      const bucket = wrongAnswerBucket(analysed[index])
      expect(WRONG_BUCKETS.indexOf(bucket), `${source.expectedModel}: ${bucket}`)
        .toBeLessThanOrEqual(WRONG_BUCKETS.indexOf(ERROR_MODELS[source.expectedModel].kind))
    })
  })

  it('counts the pupil\'s own wrong answer even when the teacher judged it right', () => {
    const judged = fixture.find(entry => entry.answer.teacherAssessed)
    const summary = errorCoverage({ entries: strip([judged]) })
    expect(summary.statuses.incorrect).toBe(1)
    expect(summary.teacherAssessed).toBe(1)
    expect(summary.teacherChangedStatus).toBe(1)
    expect(summary.wrong.misconception).toBe(1)
  })

  it('says why an unexplained answer is unexplained', () => {
    const summary = errorCoverage({ entries: strip(fixture.filter(entry => entry.expectedReason)) })
    expect(summary.wrong.unexplained).toBe(2)
    expect(summary.wrong.reasons).toEqual({ no_model: 1, unsupported_structure: 1 })
    expect(summary.areas.screening_without_structure.unexplained).toBe(1)
  })

  it('gives a group the same totals as its pupils added together', () => {
    const half = Math.floor(fixture.length / 2)
    const merged = mergeCoverage([errorCoverage({ entries: strip(fixture.slice(0, half)) }), errorCoverage({ entries: strip(fixture.slice(half)) })])
    const whole = errorCoverage({ entries: strip(fixture) })
    for (const key of ['total', 'statuses', 'wrong', 'areas', 'models', 'unansweredWithWork', 'teacherAssessed']) expect(merged[key], key).toEqual(whole[key])
  })

  it('refuses a model that is not in the catalogue', () => {
    expect(() => wrongAnswerBucket({ interpretation: { predictable: { matches: [{ modelId: 'not_in_catalogue' }] } } })).toThrow(/outside the catalogue/u)
  })

  it('matches the stored synthetic coverage; update it with --write when a change is intended', () => {
    expect(syntheticSnapshot()).toEqual(JSON.parse(readFileSync(SNAPSHOT, 'utf8')))
  })
})
