function withCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

function getConfiguredTeacherPassword() {
  const configured = process.env.TEACHER_API_PASSWORD
  if (typeof configured === 'string' && configured.trim() !== '') {
    return configured.trim()
  }
  return ''
}

function isProdLikeServer() {
  const env = String(process.env.VERCEL_ENV || process.env.NODE_ENV || '').toLowerCase()
  return env === 'production' || env === 'preview'
}

export default async function handler(req, res) {
  withCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  const configuredPassword = getConfiguredTeacherPassword()
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

