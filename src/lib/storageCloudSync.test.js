import { afterEach, describe, expect, it, vi } from 'vitest'
import { createCloudSyncApi, mergeCloudSyncProblemEntries } from './storageCloudSync'

afterEach(() => vi.unstubAllGlobals())

const teacherApi = token => createCloudSyncApi({ CLOUD_ENABLED: true, getTeacherApiToken: token,
  normalizeStudentId: value => String(value || '').toUpperCase() })
it('splits large explicit pupil scopes without silently dropping pupils or fetching the global list', async () => {
  const ids = Array.from({ length: 201 }, (_, index) => `P${index}`)
  const fetcher = vi.fn(async path => {
    const url = new URL(path, 'https://local.test')
    const selected = url.searchParams.get('studentIds').split(',')
    return { ok: true, json: async () => ({ profiles: selected.map(studentId => ({ teacherListSchemaVersion: 1,
      studentId, recentProblems: [], stats: {}, masteryFacts: { facts: [], revokedIds: [] } })) }) }
  })
  vi.stubGlobal('fetch', fetcher)
  const api = teacherApi(() => 'synthetic-token')
  expect(await api.fetchTeacherScopedProfiles()).toEqual([])
  expect(fetcher).not.toHaveBeenCalled()
  expect(await api.fetchTeacherScopedProfiles({ studentIds: ids })).toHaveLength(201)
  expect(fetcher).toHaveBeenCalledTimes(2)
  expect(new URL(fetcher.mock.calls[0][0], 'https://local.test').searchParams.get('studentIds').split(',')).toHaveLength(200)
})
it('rejects missing catalog data and a reply belonging to a previous teacher account', async () => {
  let token = 'first'
  const api = teacherApi(() => token)
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({}) })))
  await expect(api.fetchTeacherCatalog()).rejects.toThrow('Elevkatalogen')
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => { token = 'second'; return { pupils: [] } } })))
  await expect(api.fetchTeacherCatalog()).rejects.toThrow('Inloggningen ändrades')
})

describe('mergeCloudSyncProblemEntries', () => {
  it('deduplicates entries using string correct answers for non-numeric domains', () => {
    const shared = {
      problemType: 'fractions',
      timestamp: 12345,
      studentAnswer: '1/2',
      correctAnswer: '1/2',
      values: { text: 'Förenkla: 2/4' }
    }

    const merged = mergeCloudSyncProblemEntries(
      [{ ...shared, source: 'local' }],
      [{ ...shared, errorCategory: 'none', source: 'cloud' }],
      250
    )

    expect(merged).toHaveLength(1)
    expect(merged[0].errorCategory).toBe('none')
    expect(merged[0].correctAnswer).toBe('1/2')
  })

  it('preserves observation and training context from the newest cloud entry', () => {
    const local = {
      problemId: 'problem-1',
      timestamp: 12345,
      correct: true
    }
    const incoming = {
      ...local,
      observationId: 'problem-1:12345',
      trainingContext: {
        version: 1,
        frameId: 'session-1',
        mode: 'area_focus',
        source: 'student_focus',
        assignmentId: '',
        assignmentKind: '',
        allowedSkills: ['fractions'],
        levelRange: null,
        tableSet: [],
        progressionMode: 'challenge'
      }
    }

    const merged = mergeCloudSyncProblemEntries([local], [incoming], 250)

    expect(merged).toHaveLength(1)
    expect(merged[0].observationId).toBe('problem-1:12345')
    expect(merged[0].trainingContext).toEqual(incoming.trainingContext)
  })
})
