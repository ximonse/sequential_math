const profileCache = new Map()
let classCache = []

export function getCachedProfile(studentId) {
  return profileCache.get(String(studentId || '').trim().toUpperCase()) || null
}

export function putCachedProfile(profile) {
  const id = String(profile?.studentId || '').trim().toUpperCase()
  if (!id) return null
  const normalized = { ...profile, studentId: id }
  profileCache.set(id, normalized)
  return normalized
}

export function removeCachedProfile(studentId) {
  profileCache.delete(String(studentId || '').trim().toUpperCase())
}

export function getCachedProfiles() {
  return [...profileCache.values()]
}

export function replaceCachedProfiles(profiles) {
  profileCache.clear()
  for (const profile of Array.isArray(profiles) ? profiles : []) putCachedProfile(profile)
  return getCachedProfiles()
}

export function getCachedClasses() {
  return classCache.map(record => ({ ...record }))
}

export function replaceCachedClasses(classes) {
  classCache = (Array.isArray(classes) ? classes : []).filter(record => record?.id).map(record => ({ ...record }))
  return getCachedClasses()
}

export function upsertCachedClass(classRecord) {
  if (!classRecord?.id) return getCachedClasses()
  const index = classCache.findIndex(record => record.id === classRecord.id)
  if (index >= 0) classCache[index] = { ...classCache[index], ...classRecord }
  else classCache = [{ ...classRecord }, ...classCache]
  return getCachedClasses()
}

export function removeCachedClass(classId) {
  classCache = classCache.filter(record => record.id !== String(classId || '').trim())
  return getCachedClasses()
}
