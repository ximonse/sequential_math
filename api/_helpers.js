export function withCors(res, options = {}) {
  const methods = String(options?.methods || 'GET,POST,OPTIONS')
  const headers = String(options?.headers || 'Content-Type')
  const origin = String(options?.origin || '*')
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', methods)
  res.setHeader('Access-Control-Allow-Headers', headers)
}

export function getConfiguredTeacherApiPassword() {
  const explicit = process.env.TEACHER_API_PASSWORD
  if (typeof explicit === 'string' && explicit.trim() !== '') return explicit.trim()
  return ''
}

export function isProdLikeServer() {
  const env = String(process.env.VERCEL_ENV || process.env.NODE_ENV || '').toLowerCase()
  return env === 'production' || env === 'preview'
}

export function isTeacherApiAuthorized(req) {
  const configured = getConfiguredTeacherApiPassword()
  if (!configured) return !isProdLikeServer()
  const provided = String(req.headers['x-teacher-password'] || '')
  return provided === configured
}
