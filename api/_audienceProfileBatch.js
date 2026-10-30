import { kv } from '@vercel/kv'

export const CLASS_AUDIENCE_PROFILES = `
local rows = {}
for i, key in ipairs(KEYS) do
  rows[i] = false
  local raw = redis.call('GET', key)
  if raw then
    local ok, profile = pcall(cjson.decode, raw)
    if ok and type(profile) == 'table' then
      local member = profile.classId == ARGV[1]
      if type(profile.classIds) == 'table' then
        for _, id in pairs(profile.classIds) do if id == ARGV[1] then member = true end end
      end
      if member then
        local memberships = profile.classIds
        if type(memberships) == 'table' and next(memberships) == nil then memberships = nil end
        rows[i] = cjson.encode({studentId = profile.studentId, displayAlias = profile.displayAlias,
          classId = profile.classId, classIds = memberships})
      end
    end
  end
end
return rows
`

// Keep exact key order. A storage error must never become a partial roster.
export async function readAudienceProfiles(keys, classId) {
  let profiles
  try {
    profiles = classId ? await kv.eval(CLASS_AUDIENCE_PROFILES, keys, [classId]) : await kv.mget(...keys)
    if (!Array.isArray(profiles) || profiles.length !== keys.length) throw Error('Incomplete audience profile batch')
    if (classId) profiles = profiles.map(profile => profile === false || profile === null ? null
      : typeof profile === 'string' ? JSON.parse(profile) : profile)
  } catch (error) {
    const oversized = /max.*(?:size|length)|(?:size|length).*exceed|too (?:large|big)/iu.test(String(error?.message || ''))
    const executionLimit = /execution timed out|script.*(?:time limit|timeout)/iu.test(String(error?.message || ''))
    console.warn('audience_profile_batch_fallback', oversized ? 'size_limit' : executionLimit ? 'execution_limit' : 'command_failed')
    if ((oversized || executionLimit) && keys.length > 1) {
      const middle = Math.ceil(keys.length / 2)
      // The parent contains at most 100 keys, so recursive reads remain bounded.
      const halves = await Promise.all([readAudienceProfiles(keys.slice(0, middle), classId), readAudienceProfiles(keys.slice(middle), classId)])
      return halves.flat()
    }
    profiles = await Promise.all(keys.map(key => kv.get(key)))
  }
  return profiles
}
