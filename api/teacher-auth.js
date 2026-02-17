import {
  getConfiguredTeacherApiPassword,
  isProdLikeServer,
  withCors
} from './_helpers'

export default async function handler(req, res) {
  withCors(res, {
    methods: 'GET,POST,OPTIONS',
    headers: 'Content-Type'
  })
  if (req.method === 'OPTIONS') return res.status(200).end()

  const configuredPassword = getConfiguredTeacherApiPassword()
  const configured = configuredPassword !== ''

  if (req.method === 'GET') {
    return res.status(200).json({ configured })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!configured) {
    if (isProdLikeServer()) {
      return res.status(503).json({ error: 'Teacher password not configured', code: 'MISSING_CONFIG' })
    }
    return res.status(200).json({ ok: true, devFallback: true })
  }

  const providedPassword = String(req.body?.password || '')
  if (providedPassword !== configuredPassword) {
    return res.status(401).json({ error: 'Unauthorized', code: 'INVALID_PASSWORD' })
  }

  return res.status(200).json({ ok: true })
}
