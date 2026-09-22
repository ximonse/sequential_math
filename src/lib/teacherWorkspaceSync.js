import { getTeacherApiToken } from './teacherAuth'

export async function loadTeacherWorkspace() {
  const token = getTeacherApiToken()
  if (!token) return null
  try {
    const response = await fetch('/api/teacher-workspace', {
      headers: { 'x-teacher-token': token },
      cache: 'no-store'
    })
    if (!response.ok) return null
    return (await response.json()).workspace || null
  } catch {
    return null
  }
}

export async function saveTeacherWorkspacePatch(patch) {
  const token = getTeacherApiToken()
  if (!token) return false
  try {
    const response = await fetch('/api/teacher-workspace', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-teacher-token': token },
      body: JSON.stringify(patch)
    })
    return response.ok
  } catch {
    return false
  }
}

export function mergeWorkspaceItems(localItems, remoteItems) {
  const byId = new Map()
  for (const item of [...(remoteItems || []), ...(localItems || [])]) {
    if (!item?.id) continue
    const previous = byId.get(item.id)
    const itemTime = Number(item.updatedAt || item.createdAt || 0)
    const previousTime = Number(previous?.updatedAt || previous?.createdAt || 0)
    if (!previous || itemTime >= previousTime) byId.set(item.id, item)
  }
  return [...byId.values()].sort((a, b) =>
    Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0)
  )
}
