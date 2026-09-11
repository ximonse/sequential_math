import { describe, expect, it } from 'vitest'
import { buildTeacherRoleMigration } from './_teacherRoleMigration.js'

describe('teacher role migration', () => {
  it('requires one exact legacy admin username', () => {
    const accounts = [{ id: 'one', username: 'root', isAdmin: true }, { id: 'two', username: 'root', isAdmin: true }]
    expect(() => buildTeacherRoleMigration(accounts, 'root')).toThrow('exactly one')
    expect(() => buildTeacherRoleMigration(accounts, 'missing')).toThrow('exactly one')
  })

  it('maps the selected account to super admin and blocks unscoped school admins', () => {
    const changes = buildTeacherRoleMigration([{ id: 'root', username: 'root', isAdmin: true, schoolIds: ['north'], sessionVersion: 2 }, { id: 'local', username: 'local', isAdmin: true, schoolIds: [] }], 'root')
    expect(changes.map(item => [item.role, item.disabled])).toEqual([['super_admin', false], ['school_admin', true]])
    expect(changes[0].updated.sessionVersion).toBe(3)
    expect(changes[1].updated.isAdmin).toBeUndefined()
  })
})
