import { describe, expect, it } from 'vitest'
import { getNcmSkillMapping, normalizeNcmCode } from './ncmSkillMap'

describe('ncmSkillMap', () => {
  it('normalizes code input', () => {
    expect(normalizeNcmCode('as 10')).toBe('AS10')
    expect(normalizeNcmCode('rp-5')).toBe('RP5')
  })

  it('returns manual mapping for known AS code', () => {
    const mapping = getNcmSkillMapping('AS1')
    expect(mapping.domainTag).toBe('arithmetic')
    expect(mapping.operationTag).toBe('addition')
    expect(mapping.mappingSource).toBe('manual')
    expect(mapping.abilityTags).toContain('op_addition')
  })

  it('returns heuristic mapping by prefix', () => {
    const mapping = getNcmSkillMapping('AG7')
    expect(mapping.domainTag).toBe('arithmetic')
    expect(mapping.mappingSource).toBe('prefix:AG')
    expect(mapping.mappingConfidence).toBe('heuristic')
  })

  it('falls back for unknown code', () => {
    const mapping = getNcmSkillMapping('ZZ999')
    expect(mapping.domainTag).toBe('unknown')
    expect(mapping.mappingSource).toBe('fallback')
    expect(mapping.abilityTags).toEqual(['ncm_unknown'])
  })
})
