import { describe, expect, it } from 'vitest'
import { isSchoolCreationDisabled } from './schoolControlsHelpers'

describe('school creation recovery', () => {
  it('keeps creation available when only the directory read failed', () => {
    expect(isSchoolCreationDisabled({
      busy: false,
      name: 'Ribbskolan',
      loading: false,
      error: 'Skolorna kunde inte hämtas.'
    })).toBe(false)
  })

  it('blocks an empty name and duplicate submission while busy', () => {
    expect(isSchoolCreationDisabled({ busy: false, name: '   ' })).toBe(true)
    expect(isSchoolCreationDisabled({ busy: true, name: 'Ribbskolan' })).toBe(true)
  })
})
