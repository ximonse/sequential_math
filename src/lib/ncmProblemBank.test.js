import { describe, expect, it } from 'vitest'
import {
  filterNcmProblems,
  generateNcmProblemFromFilter,
  getNcmAbilityOptions,
  getNcmCodeOptions
} from './ncmProblemBank'

describe('ncmProblemBank', () => {
  it('exposes safe code options from imported batches', () => {
    const options = getNcmCodeOptions()
    expect(options.length).toBeGreaterThan(0)
    expect(options.some(item => item.code === 'AS1')).toBe(true)
    expect(options.some(item => item.code === 'RP5')).toBe(true)
  })

  it('can filter by NCM code', () => {
    const rows = filterNcmProblems({ codes: ['AS3'] })
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every(item => item.ncmCode === 'AS3')).toBe(true)
  })

  it('can filter by ability tag', () => {
    const abilityOptions = getNcmAbilityOptions()
    const percentOption = abilityOptions.find(item => item.tag === 'concept_percent')
    expect(percentOption).toBeTruthy()

    const rows = filterNcmProblems({ abilityTags: ['concept_percent'] })
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.some(item => item.ncmCode === 'RP5')).toBe(true)
  })

  it('generates playable NCM problems with prompt text metadata', () => {
    const problem = generateNcmProblemFromFilter({ codes: ['AS1'] })
    expect(problem).toBeTruthy()
    expect(problem.template).toBe('AS1')
    expect(problem.result).toBeTypeOf('number')
    expect(String(problem.metadata?.promptText || '').length).toBeGreaterThan(0)
    expect(String(problem.metadata?.skillTag || '').includes('ncm_as1_item_')).toBe(true)
  })

  it('supports preferred skill selection', () => {
    const rows = filterNcmProblems({ codes: ['AS1'] })
    const preferred = rows[0]?.skillTag
    expect(preferred).toBeTruthy()

    const problem = generateNcmProblemFromFilter(
      { codes: ['AS1'] },
      { preferredSkillTag: preferred }
    )
    expect(problem).toBeTruthy()
    expect(problem.metadata?.skillTag).toBe(preferred)
  })

  it('supports excluding recently used skills when alternatives exist', () => {
    const rows = filterNcmProblems({ codes: ['AS1'] })
    const excluded = rows.slice(0, 4).map(item => item.skillTag)
    const allowed = rows[4]?.skillTag
    expect(allowed).toBeTruthy()

    const problem = generateNcmProblemFromFilter(
      { codes: ['AS1'] },
      { excludeSkillTags: excluded }
    )
    expect(problem).toBeTruthy()
    expect(problem.metadata?.skillTag).toBe(allowed)
  })
})
