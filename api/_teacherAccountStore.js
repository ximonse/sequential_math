import { kv } from '@vercel/kv'
import { studentStoreError } from './_studentStore.js'

const LAST_SUPER_ADMIN_SCRIPT = `
local count = 0
for index = 3, #KEYS do
  local raw = redis.call('GET', KEYS[index])
  if raw then
    local account = cjson.decode(raw)
    local role = account['role']
    local legacyAdmin = account['isAdmin'] == true and (role == nil or role == '')
    if account['disabled'] ~= true and (role == 'super_admin' or legacyAdmin) then
      count = count + 1
    end
  end
end
if count <= 1 then return -1 end
if ARGV[2] == 'delete' then
  redis.call('DEL', KEYS[1])
  redis.call('SREM', KEYS[2], ARGV[3])
else
  redis.call('SET', KEYS[1], ARGV[4])
end
return 1
`

export async function mutateProtectedSuperAdmin(accountId, nextAccount) {
  const ids = await kv.smembers('teacher_accounts:index') || []
  const accountKeys = [...new Set(ids.map(id => `teacher_account:${id}`))]
  const targetKey = `teacher_account:${accountId}`
  if (!accountKeys.includes(targetKey)) accountKeys.push(targetKey)
  const operation = nextAccount ? 'update' : 'delete'
  const result = await kv.eval(
    LAST_SUPER_ADMIN_SCRIPT,
    [targetKey, 'teacher_accounts:index', ...accountKeys],
    ['teacher-superadmin-guard-v1', operation, accountId, JSON.stringify(nextAccount || null)]
  )
  if (Number(result) === -1) throw studentStoreError(409, 'Den sista superadminen kan inte tas bort eller nedgraderas.')
  if (Number(result) !== 1) throw studentStoreError(409, 'Kontot ändrades samtidigt. Försök igen.')
  return nextAccount
}
