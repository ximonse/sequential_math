import { describe, expect, it, vi } from 'vitest'
import { readFollowUpAnswers, followUpProgress } from './followUpResults.js'

const row = (id, status = 'correct', submitted = true) => ({ reference: { assignmentId: 'assignment', assignmentItemId: id },
  question: { taskId: id, taskVersion: 1 }, answer: { status, submitted } })
const tasks = ['a', 'b'].map(taskId => ({ task: { taskId, taskVersion: 1 } }))
const response = (entries, nextCursor = null, snapshotRevision = 'revision') => ({ ok: true, data: { entries, nextCursor, snapshotRevision } })

describe('follow-up evidence read', () => {
  it('pins the revision, filters the assignment and reads every page', async () => {
    const request = vi.fn().mockResolvedValueOnce(response([row('a'), { ...row('other'), reference: { assignmentId: 'other' } }], 'cursor'))
      .mockResolvedValueOnce(response([row('b')]))
    const value = await readFollowUpAnswers({ request, studentId: 'pupil', classId: 'class', assignmentId: 'assignment' })
    expect(value.map(e => e.question.taskId)).toEqual(['a', 'b'])
    expect(new URL(request.mock.calls[1][0], 'http://localhost').searchParams.get('snapshotRevision')).toBe('revision')
  })
  it('refuses truncated history and changed revisions instead of showing partial totals', async () => {
    const loop = vi.fn().mockResolvedValue(response([row('a')], 'same-cursor'))
    await expect(readFollowUpAnswers({ request: loop, studentId: 'p', classId: 'c', assignmentId: 'assignment' })).rejects.toThrow(/fullständigt/)
    const changing = vi.fn().mockResolvedValueOnce(response([], 'next')).mockResolvedValueOnce(response([row('b')], null, 'changed'))
    await expect(readFollowUpAnswers({ request: changing, studentId: 'p', classId: 'c', assignmentId: 'assignment' })).rejects.toThrow(/ändrats/)
  })
  it('refuses a twentieth page with more history still unread', async () => {
    let page = 0
    const request = vi.fn(async () => response([], `cursor-${++page}`))
    await expect(readFollowUpAnswers({ request, studentId: 'p', classId: 'c', assignmentId: 'assignment' })).rejects.toThrow(/fullständigt/)
    expect(request).toHaveBeenCalledTimes(20)
  })
})

describe('follow-up completeness', () => {
  it('keeps saved correct answers distinct from submission and a completed set', () => {
    expect(followUpProgress([row('a', 'correct', false)], tasks)).toMatchObject({ expected: 2, assessed: 1, pending: 1, complete: false, submitted: false })
    expect(followUpProgress([row('a'), row('b')], tasks)).toMatchObject({ expected: 2, assessed: 2, pending: 0, complete: true, submitted: true })
  })
  it('does not invent expected counts for old material or accept duplicate/unexpected tasks', () => {
    expect(followUpProgress([row('a')], undefined)).toMatchObject({ expected: null, complete: false })
    expect(followUpProgress([row('a'), row('a')], tasks)).toMatchObject({ complete: false, consistent: false })
    expect(followUpProgress([row('a'), row('different')], tasks)).toMatchObject({ complete: false, consistent: false })
  })
  it('retains incomplete, unassessed and blank answers as pending', () => {
    for (const status of ['unanswered', 'incomplete', 'unassessed']) {
      expect(followUpProgress([row('a'), row('b', status)], tasks)).toMatchObject({ assessed: 1, pending: 1, complete: false })
    }
  })
})
