import { getTeacherApiToken } from '../../../lib/teacherAuth'
import { listDomains } from '../../../domains/registry'

function authHeaders() {
  return { 'Content-Type': 'application/json', 'x-teacher-token': getTeacherApiToken() }
}

export async function apiFetch(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { ...authHeaders(), ...(options.headers || {}) } })
  const data = await response.json().catch(() => ({}))
  return { ok: response.ok, status: response.status, data }
}

export function getTogglableExtras() {
  return listDomains().filter(domain => domain.id !== 'arithmetic').flatMap(domain => (
    Array.isArray(domain.skills)
      ? domain.skills.map(skill => ({ id: skill.id, label: skill.label, domainLabel: domain.label }))
      : [{ id: domain.id, label: domain.label, domainLabel: domain.label }]
  ))
}
