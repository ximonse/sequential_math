import { kv } from '@vercel/kv'

function withCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-teacher-password')
}

function getConfiguredTeacherApiPassword() {
  const explicit = process.env.TEACHER_API_PASSWORD
  if (typeof explicit === 'string' && explicit.trim() !== '') return explicit.trim()
  return ''
}

function isTeacherApiAuthorized(req) {
  const configured = getConfiguredTeacherApiPassword()
  if (!configured) return true
  const provided = String(req.headers['x-teacher-password'] || '')
  return provided === configured
}

function sanitizeProfileForList(profile) {
  if (!profile || typeof profile !== 'object') return null

  const safe = {
    ...profile
  }

  if (safe.auth && typeof safe.auth === 'object') {
    const {
      password,
      passwordHash,
      passwordSalt,
      passwordScheme,
      ...authRest
    } = safe.auth
    safe.auth = authRest
  } else {
    safe.auth = {}
  }

  return safe
}

export default async function handler(req, res) {
  withCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  if (!isTeacherApiAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const ids = await kv.smembers('students:index')
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(200).json({ profiles: [] })
    }

    const profiles = await Promise.all(
      ids.map(async (id) => kv.get(`student:${String(id).toUpperCase()}`))
    )

    const sanitized = profiles
      .filter(Boolean)
      .map(sanitizeProfileForList)
      .filter(Boolean)

    return res.status(200).json({ profiles: sanitized })
  } catch (error) {
    return res.status(500).json({
      error: 'Storage backend unavailable',
      details: error?.message || 'unknown'
    })
  }
}
