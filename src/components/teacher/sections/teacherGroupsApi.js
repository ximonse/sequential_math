import { getTeacherApiToken } from '../../../lib/teacherAuth'

async function requestTeacherGroups(method = 'GET', body) {
  const response = await fetch('/api/teacher-groups', {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-teacher-token': getTeacherApiToken()
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Kunde inte hantera gruppen.')
  return data
}

export const loadTeacherGroups = () => requestTeacherGroups()
export const createTeacherGroup = body => requestTeacherGroups('POST', body)
export const updateTeacherGroup = body => requestTeacherGroups('PUT', body)
export const deleteTeacherGroup = id => requestTeacherGroups('DELETE', { id })
