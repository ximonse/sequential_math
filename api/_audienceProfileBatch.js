import { kv } from '@vercel/kv'

// Keep exact key order. A storage error must never become a partial roster.
export async function readAudienceProfiles(keys) {
  let profiles
  try {
    profiles = await kv.mget(...keys)
  } catch (error) {
    const oversized = /max.*(?:size|length)|(?:size|length).*exceed|too (?:large|big)/iu.test(String(error?.message || ''))
    console.warn('audience_profile_batch_fallback', oversized ? 'size_limit' : 'command_failed')
    if (oversized && keys.length > 1) {
      const middle = Math.ceil(keys.length / 2)
      // Sequential halves bound response size and outstanding work.
      return [...await readAudienceProfiles(keys.slice(0, middle)), ...await readAudienceProfiles(keys.slice(middle))]
    }
    profiles = await Promise.all(keys.map(key => kv.get(key)))
  }
  if (!Array.isArray(profiles) || profiles.length !== keys.length) throw Error('Incomplete audience profile batch')
  return profiles
}
