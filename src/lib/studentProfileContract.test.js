import { describe, expect, it } from 'vitest'
import { createStudentProfile } from './studentProfile'
import {
  STUDENT_PROFILE_SCHEMA_VERSION,
  hasCurrentStudentPassword,
  isCurrentStudentProfile
} from './studentProfileContract'

describe('student profile contract', () => {
  it('accepts newly created profiles', () => {
    const profile = createStudentProfile('ELEV1', 'Ada', 4)

    expect(profile.profileSchemaVersion).toBe(STUDENT_PROFILE_SCHEMA_VERSION)
    expect(isCurrentStudentProfile(profile)).toBe(true)
  })

  it('rejects historical profiles without the current schema version', () => {
    const profile = createStudentProfile('ELEV1', 'Ada', 4)
    delete profile.profileSchemaVersion

    expect(isCurrentStudentProfile(profile)).toBe(false)
  })

  it('rejects incomplete current profiles', () => {
    const profile = createStudentProfile('ELEV1', 'Ada', 4)
    delete profile.problemLog

    expect(isCurrentStudentProfile(profile)).toBe(false)
  })

  it('only accepts the current hashed password representation', () => {
    expect(hasCurrentStudentPassword({
      passwordScheme: 'sha256-v1',
      passwordHash: 'hash',
      passwordSalt: 'salt'
    })).toBe(true)
    expect(hasCurrentStudentPassword({ password: 'plaintext' })).toBe(false)
    expect(hasCurrentStudentPassword({ passwordScheme: 'sha256-v1' })).toBe(false)
  })
})
