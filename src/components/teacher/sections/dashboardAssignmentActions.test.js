import { afterEach, describe, expect, it, vi } from 'vitest'
import { decodeAssignmentPayload, encodeAssignmentPayload } from '../../../lib/assignments'
import { buildDashboardAssignmentActions } from './dashboardAssignmentActions'

vi.mock('../../../lib/teacherAuth', () => ({ getTeacherApiToken: () => 'token' }))

const idOf = item => decodeAssignmentPayload(item.payload)?.id
const row = { studentId: 'ABC123', name: 'Testelev A', operationStats: {} }
const oldFocus = { id: 'old-focus', title: 'Fokus Testelev A | Addition nivå 2-4', problemTypes: ['addition'], minLevel: 2, maxLevel: 4, targetCount: 14 }
const subtractionFocus = { id: 'sub-focus', title: 'Fokus Testelev A | Subtraktion nivå 3-5', problemTypes: ['subtraction'], minLevel: 3, maxLevel: 5, targetCount: 14 }
const classWork = { id: 'class-work', title: 'Veckans tabeller', problemTypes: ['multiplication'], minLevel: 1, maxLevel: 3, targetCount: 20 }

function setup(existing) {
  const calls = []
  global.fetch = vi.fn(async (url, init) => {
    if (!String(url).includes('teacher-class-assignment')) return { ok: true, json: async () => ({}) }
    const body = JSON.parse(init.body)
    calls.push(body)
    if (body.action === 'activate') existing = [{ payload: body.assignmentPayload, activatedAt: 3 }, ...existing]
    if (body.action === 'deactivate') existing = existing.filter(item => idOf(item) !== body.assignmentId)
    return { ok: true, json: async () => ({ activeAssignments: existing }) }
  })
  const status = vi.fn(), onTargetActiveChange = vi.fn()
  const actions = buildDashboardAssignmentActions({ assignments: [], setAssignments: () => {}, setDashboardStatus: status,
    setCopiedId: () => {}, setActiveAssignmentId: () => {}, getSelectedClassLoginToken: () => '',
    getTargets: () => [{ type: 'class', id: 'CLASS1', name: '6B' }], onTargetActiveChange })
  return { actions, calls, status, onTargetActiveChange }
}

describe('quick focus assignment', () => {
  afterEach(() => { delete global.fetch })

  it('puts the assignment on exactly that pupil and replaces only the previous focus in the same operation', async () => {
    const { actions, calls, status, onTargetActiveChange } = setup([
      { payload: encodeAssignmentPayload(oldFocus), activatedAt: 1 },
      { payload: encodeAssignmentPayload(subtractionFocus), activatedAt: 1 },
      { payload: encodeAssignmentPayload(classWork), activatedAt: 2 }
    ])
    // With no operation data the focus operation falls back to addition, the same as oldFocus.
    await actions.handleCreateQuickAssignment(row, 'focus')

    expect(calls[0]).toMatchObject({ targetType: 'student', targetId: 'ABC123', action: 'activate' })
    expect(calls.every(call => call.targetType === 'student' && call.targetId === 'ABC123')).toBe(true)
    expect(calls.filter(call => call.action === 'deactivate').map(call => call.assignmentId)).toEqual(['old-focus'])
    const final = onTargetActiveChange.mock.calls.at(-1)
    expect(final[0]).toMatchObject({ type: 'student', id: 'ABC123' })
    expect(final[1].some(item => idOf(item) === 'class-work')).toBe(true)
    expect(final[1].some(item => idOf(item) === 'old-focus')).toBe(false)
    expect(final[1].some(item => idOf(item) === 'sub-focus')).toBe(true)
    expect(status.mock.calls.at(-1)[0]).toContain('startsida')
  })
})
