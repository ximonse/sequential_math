import { afterEach, describe, expect, it, vi } from 'vitest'
import { getLiveStudentSession } from './_studentSession.js'

const profile = { profileSchemaVersion: 1, studentId: 'PUPIL', classId: 'CLASS', classIds: ['CLASS'],
  recentProblems: [], problemLog: [], masteryFacts: { facts: [], revokedIds: [] }, stats: {},
  auth: { scheme: 'qr-pin-v1', credentialVersion: 1, disabled: false } }

describe('live session read latency and revocation', () => {
  afterEach(() => vi.useRealTimers())
  it('keeps live checks on every request while overlapping independent reads', async () => {
    vi.useFakeTimers()
    const records = new Map([
      ['student_session:session', { studentId: 'PUPIL', credentialVersion: 1 }],
      ['student:PUPIL', profile], ['class:CLASS', { id: 'CLASS' }]
    ])
    const read = async value => { await new Promise(resolve => setTimeout(resolve, 100)); return structuredClone(value) }
    const store = { get: key => read(records.get(key)), exists: key => read(records.has(key) ? 1 : 0) }
    const req = { headers: { cookie: '__Host-student-session=session' } }
    const start = Date.now()
    const first = getLiveStudentSession(req, { store })
    await vi.runAllTimersAsync()
    await expect(first).resolves.toMatchObject({ profile: { studentId: 'PUPIL' } })
    expect(Date.now() - start).toBeLessThanOrEqual(300)
    // No cross-request cache: a rotated credential and a closed class still deny access.
    records.set('student:PUPIL', { ...profile, auth: { ...profile.auth, credentialVersion: 2 } })
    const rotated = getLiveStudentSession(req, { store })
    await vi.runAllTimersAsync(); await expect(rotated).resolves.toBeNull()
    records.set('student:PUPIL', profile); records.set('class_deleted:CLASS', true)
    const closed = getLiveStudentSession(req, { store })
    await vi.runAllTimersAsync(); await expect(closed).resolves.toBeNull()
  })
})
