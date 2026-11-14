import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { ERROR_MODELS } from './catalog.js'
import { CHANCE_NOT_COMPUTED, CHANCE_THRESHOLD, guardedAgainstChance, modelChance, modelSource } from './modelProfile.js'
import { PROFILE_PATH, profileTable } from '../../../scripts/model-profile.mjs'

// Rule R-A, last part: every model has a source and a measured chance risk
// (docs/STYRNING_FELFORSTAELSER.md, section 6 and step 1).
describe('error model source and chance risk', () => {
  const chance = modelChance()

  it('names a source for every model', () => {
    for (const id of Object.keys(ERROR_MODELS)) expect(modelSource(id)?.textSv, id).toBeTruthy()
  })

  it('measures the chance risk of every model the engine computes', () => {
    for (const id of Object.keys(ERROR_MODELS)) {
      if (CHANCE_NOT_COMPUTED[id]) expect(chance[id], id).toBeNull()
      else expect(chance[id]?.tasks, id).toBeGreaterThan(0)
    }
  })

  it('shows a misconception with many answers per task only as a pattern (decision 3)', () => {
    const risky = Object.entries(chance).filter(([, c]) => c && c.answersPerTask > CHANCE_THRESHOLD).map(([id]) => id)
    expect(risky.filter(id => !guardedAgainstChance(ERROR_MODELS[id]))).toEqual([])
  })

  it('keeps the readable table in docs up to date', () => {
    expect(readFileSync(PROFILE_PATH, 'utf8').replace(/\r\n/g, '\n')).toBe(profileTable())
  })
})
