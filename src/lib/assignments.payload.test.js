import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildAssignmentLink, decodeAssignmentPayload, encodeAssignmentPayload } from './assignments'

afterEach(() => vi.unstubAllGlobals())

describe('assignments payload encoding', () => {
  it('preserves explicit workspace choices and legacy defaults through shared server encoding', () => {
    for (const kind of ['standard', 'math_practice', 'ncm']) {
      for (const notebook of [false, true]) for (const drawing of [false, true]) {
        const assignment = { id: 'workspaces', kind, workspaces: { notebook, drawing, unknown: true } }
        expect(decodeAssignmentPayload(encodeAssignmentPayload(assignment)).workspaces).toEqual({ notebook, drawing })
      }
      expect(decodeAssignmentPayload(encodeAssignmentPayload({ id: 'legacy', kind })).workspaces).toBeUndefined()
    }
    expect(decodeAssignmentPayload(encodeAssignmentPayload({ id: 'invalid', workspaces: { notebook: 'true', drawing: 1 } })).workspaces)
      .toEqual({ notebook: false, drawing: false })
  })
  it('roundtrips table and focus assignments instead of turning them into addition', () => {
    const table = decodeAssignmentPayload(encodeAssignmentPayload({ id: 'asg_table', kind: 'table', tables: [6, 13, '8', 6] }))
    expect(table).toMatchObject({ kind: 'table', tables: [6, 8], title: 'Tabellerna 6, 8', problemTypes: ['multiplication'] })
    expect(decodeAssignmentPayload(encodeAssignmentPayload({ id: 'asg_one', kind: 'table', tables: [6] })).title).toBe('Tabell 6')
    expect(encodeAssignmentPayload({ id: 'asg_none', kind: 'table', tables: [13] })).toBe('')
    const focus = decodeAssignmentPayload(encodeAssignmentPayload({ id: 'asg_focus', kind: 'focus', focusMode: 'choose' }))
    expect(focus).toMatchObject({ kind: 'focus', focusMode: 'choose', title: 'Fokusövning: KONTROLL' })
    expect(decodeAssignmentPayload(encodeAssignmentPayload({ id: 'asg_f2', kind: 'focus', focusMode: 'nope' })).focusMode).toBe('discover')
  })

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

  it('roundtrips number-fluency assignment types', () => {
    const encoded = encodeAssignmentPayload({
      id: 'asg_fluency_1',
      kind: 'standard',
      title: 'Talpar och dubblor nivå 1-12',
      problemTypes: ['number_bonds', 'doubles'],
      minLevel: 1,
      maxLevel: 12,
      targetCount: 20,
      createdAt: 1700000000000
    })

    expect(decodeAssignmentPayload(encoded)).toMatchObject({
      id: 'asg_fluency_1',
      problemTypes: ['number_bonds', 'doubles'],
      minLevel: 1,
      maxLevel: 12
    })
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
