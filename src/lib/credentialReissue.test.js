import { afterEach, describe, expect, it, vi } from 'vitest'
import { reissueStudentCredentials } from './credentialReissue'

vi.mock('./teacherAuth', () => ({ getTeacherApiToken: () => 'token-1' }))

const okResponse = credential => ({ ok: true, json: async () => ({ ok: true, credential }) })
const failResponse = error => ({ ok: false, json: async () => ({ error }) })

describe('reissueStudentCredentials', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('reissues one card per selected pupil, in order, with the teacher token', async () => {
    const fetchMock = vi.fn(async url => okResponse({ studentId: url.split('/')[3], pin: '1234' }))
    vi.stubGlobal('fetch', fetchMock)
    const progress = []

    const result = await reissueStudentCredentials(['A1', 'B2'], { onProgress: (done, total) => progress.push([done, total]) })

    expect(result.credentials.map(item => item.studentId)).toEqual(['A1', 'B2'])
    expect(result.failed).toEqual([])
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/student/A1/credentials', { method: 'POST', headers: { 'x-teacher-token': 'token-1' } })
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/student/B2/credentials', expect.objectContaining({ method: 'POST' }))
    expect(progress).toEqual([[1, 2], [2, 2]])
  })

  it('keeps going after a failure and reports it', async () => {
    vi.stubGlobal('fetch', vi.fn(async url => (
      url.includes('/B2/') ? failResponse('Ingen behörighet') : okResponse({ studentId: url.split('/')[3], pin: '4321' })
    )))

    const result = await reissueStudentCredentials(['A1', 'B2', 'C3'])

    expect(result.credentials.map(item => item.studentId)).toEqual(['A1', 'C3'])
    expect(result.failed).toEqual([{ studentId: 'B2', error: 'Ingen behörighet' }])
  })

  it('treats a network error as a failure for that pupil only', async () => {
    vi.stubGlobal('fetch', vi.fn(async url => {
      if (url.includes('/A1/')) throw new Error('nätverksfel')
      return okResponse({ studentId: 'B2', pin: '1111' })
    }))

    const result = await reissueStudentCredentials(['A1', 'B2'])

    expect(result.credentials).toHaveLength(1)
    expect(result.failed).toEqual([{ studentId: 'A1', error: 'nätverksfel' }])
  })
})
