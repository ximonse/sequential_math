import { describe, expect, it } from 'vitest'
import {
  extractNcmCodeFromValue,
  getNcmSkillMapping,
  getNcmSkillMappingFromProblem,
  normalizeNcmCode
} from './ncmSkillMap'

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

  it('extracts ncm code from decorated values', () => {
    expect(extractNcmCodeFromValue('ncm_as3_item_4')).toBe('AS3')
    expect(extractNcmCodeFromValue('RP5')).toBe('RP5')
    expect(extractNcmCodeFromValue('mul_table_7')).toBe('')
  })

  it('resolves mapping from skillTag/problemType pair', () => {
    const mapping = getNcmSkillMappingFromProblem('add_1d_1d_no_carry', 'ncm_as6_item_2')
    expect(mapping.code).toBe('AS6')
    expect(mapping.mappingSource).toBe('manual')
  })

  it('falls back for unknown code', () => {
    const mapping = getNcmSkillMapping('ZZ999')
    expect(mapping.domainTag).toBe('unknown')
    expect(mapping.mappingSource).toBe('fallback')
    expect(mapping.abilityTags).toEqual(['ncm_unknown'])
  })
})
