import { describe, expect, it } from 'vitest'
import {
  ensureProfileAuth,
  setProfilePassword,
  verifyPasswordForProfile
} from './storageAuthHelpers'

describe('student profile authentication contract', () => {
  it('removes historical plaintext credentials instead of migrating them', async () => {
    const profile = {
      auth: {
        password: 'old-secret',
        loginCount: 2
      }
    }

    ensureProfileAuth(profile)

    expect(profile.auth.password).toBeUndefined()
    await expect(verifyPasswordForProfile(profile, 'old-secret')).resolves.toBe(false)
  })

  it('accepts credentials written in the current hashed format', async () => {
    const profile = { auth: {} }

    await setProfilePassword(profile, 'new-secret')

    expect(profile.auth.password).toBeUndefined()
    expect(profile.auth.passwordScheme).toBe('sha256-v1')
    await expect(verifyPasswordForProfile(profile, 'new-secret')).resolves.toBe(true)
    await expect(verifyPasswordForProfile(profile, 'wrong')).resolves.toBe(false)
  })
})
