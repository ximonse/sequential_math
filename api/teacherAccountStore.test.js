import { beforeEach, describe, expect, it, vi } from 'vitest'

const kvMock = vi.hoisted(() => ({
  smembers: vi.fn(),
  eval: vi.fn()
}))
vi.mock('@vercel/kv', () => ({ kv: kvMock }))

import { mutateProtectedSuperAdmin } from './_teacherAccountStore.js'

describe('last superadmin guard', () => {
  beforeEach(() => {
    kvMock.smembers.mockReset()
    kvMock.eval.mockReset()
    kvMock.smembers.mockResolvedValue(['root', 'backup'])
  })

  it('turns the atomic Redis refusal into a conflict', async () => {
    kvMock.eval.mockResolvedValue(-1)
    await expect(mutateProtectedSuperAdmin('root', { id: 'root', role: 'teacher' }))
      .rejects.toMatchObject({ status: 409 })
  })

  it('passes every current account key into one atomic update', async () => {
    kvMock.eval.mockResolvedValue(1)
    const updated = { id: 'root', role: 'teacher' }
    await expect(mutateProtectedSuperAdmin('root', updated)).resolves.toEqual(updated)
    const [, keys, args] = kvMock.eval.mock.calls[0]
    expect(keys).toEqual([
      'teacher_account:root',
      'teacher_accounts:index',
      'teacher_account:root',
      'teacher_account:backup'
    ])
    expect(args.slice(0, 3)).toEqual(['teacher-superadmin-guard-v1', 'update', 'root'])
  })
})
