import { kv } from '@vercel/kv'
import { buildTeacherRoleMigration } from '../api/_teacherRoleMigration.js'

const args = process.argv.slice(2)
const usernameIndex = args.indexOf('--superadmin-username')
const superAdminUsername = usernameIndex >= 0 ? args[usernameIndex + 1] : ''
const apply = args.includes('--apply')

if (!superAdminUsername) {
  console.error('Usage: node scripts/migrate-teacher-roles.mjs --superadmin-username <username> [--apply]')
  process.exitCode = 1
} else {
  const ids = await kv.smembers('teacher_accounts:index')
  const accounts = await Promise.all((ids || []).map(id => kv.get(`teacher_account:${id}`)))
  let changes
  try {
    changes = buildTeacherRoleMigration(accounts.filter(Boolean), superAdminUsername)
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }

  if (changes) {
    const preview = changes.map(({ id, role, disabled }) => ({ id, role, disabled }))
    console.log(JSON.stringify({ apply, changes: preview }, null, 2))
    if (apply) {
      await Promise.all(changes.map(({ id, updated }) => {
        const { isAdmin, disabledReason, ...base } = updated
        return kv.set(`teacher_account:${id}`, {
          ...base,
          ...(disabledReason ? { disabledReason } : {})
        })
      }))
    }
  }
}
