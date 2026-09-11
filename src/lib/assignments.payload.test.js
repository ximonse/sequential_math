import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildAssignmentLink, decodeAssignmentPayload, encodeAssignmentPayload } from './assignments'

afterEach(() => vi.unstubAllGlobals())

describe('assignments payload encoding', () => {
  it('roundtrips standard assignment payload', () => {
    const encoded = encodeAssignmentPayload({
      id: 'asg_test_1',
      kind: 'standard',
      title: 'Addition 1-4',
      problemTypes: ['addition'],
      minLevel: 1,
      maxLevel: 4,
      targetCount: 10,
      createdAt: 1700000000000
    })
    const decoded = decodeAssignmentPayload(encoded)
    expect(decoded).toBeTruthy()
    expect(decoded.id).toBe('asg_test_1')
    expect(decoded.kind).toBe('standard')
    expect(decoded.problemTypes).toEqual(['addition'])
    expect(decoded.minLevel).toBe(1)
    expect(decoded.maxLevel).toBe(4)
  })

  it('roundtrips ncm assignment payload', () => {
    const encoded = encodeAssignmentPayload({
      id: 'asg_ncm_1',
      kind: 'ncm',
      title: 'NCM procent',
      ncmCodes: ['RP5'],
      ncmAbilityTags: ['concept_percent'],
      targetCount: 8,
      createdAt: 1700000000000
    })
    const decoded = decodeAssignmentPayload(encoded)
    expect(decoded).toBeTruthy()
    expect(decoded.id).toBe('asg_ncm_1')
    expect(decoded.kind).toBe('ncm')
    expect(decoded.ncmCodes).toEqual(['RP5'])
    expect(decoded.problemTypes).toEqual([])
  })

  it('builds a class login link that keeps the assignment payload', () => {
    vi.stubGlobal('window', { location: { origin: 'https://matematik.ximon.se' } })
    const link = buildAssignmentLink('asg_test_1', {
      id: 'asg_test_1',
      title: 'Addition',
      problemTypes: ['addition']
    }, 'class-token')
    const url = new URL(link)

    expect(url.searchParams.get('class')).toBe('class-token')
    expect(url.searchParams.get('assignment')).toBe('asg_test_1')
    expect(decodeAssignmentPayload(url.searchParams.get('assignment_payload'))?.title).toBe('Addition')
  })
})
