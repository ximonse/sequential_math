import { describe, expect, it } from 'vitest'
import { diagnosticDispatchOptions } from './_diagnosticDispatchRequest.js'

describe('screening dispatch identity', () => {
  const body = { requestId: 'request-123', classId: 'a', studentIds: ['one', 'two'], taskIds: ['task'], itemOptions: { task: { drawingEnabled: false, gridEnabled: true } } }
  it('preserves the operation across retries while binding it to content and scope', () => {
    const first = diagnosticDispatchOptions(body, 'teacher')
    expect(diagnosticDispatchOptions({ ...body, studentIds: ['two', 'one'], itemOptions: { task: { gridEnabled: true, drawingEnabled: false } } }, 'teacher')).toEqual(first)
    expect(diagnosticDispatchOptions({ ...body, taskIds: ['other'] }, 'teacher')).toMatchObject({ assignmentId: first.assignmentId })
    expect(diagnosticDispatchOptions({ ...body, taskIds: ['other'] }, 'teacher').dispatchFingerprint).not.toBe(first.dispatchFingerprint)
    expect(diagnosticDispatchOptions(body, 'other-teacher').assignmentId).not.toBe(first.assignmentId)
    expect(diagnosticDispatchOptions({ ...body, classId: 'b' }, 'teacher').assignmentId).not.toBe(first.assignmentId)
    expect(diagnosticDispatchOptions({ ...body, requestId: undefined }, 'teacher')).toEqual({})
  })
  it('rejects invalid retry IDs', () => {
    expect(() => diagnosticDispatchOptions({ ...body, requestId: '' }, 'teacher')).toThrow()
  })
})
