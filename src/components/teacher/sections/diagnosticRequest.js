import { getTeacherApiToken } from '../../../lib/teacherAuth'

export async function diagnosticRequest(url, options = {}) {
  const token = getTeacherApiToken()
  const response = await fetch(url, { credentials: 'include', ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { 'x-teacher-token': token } : {}) } })
  const data = await response.json().catch(() => ({}))
  return { status: response.status, ok: response.ok, data }
}

