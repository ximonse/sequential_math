import { normalizeStudentId } from './storageStudentId'

export function ensureProfileClassMembership(profile) {
  if (!profile || typeof profile !== 'object') return profile

  const seen = new Set()
  const classIds = []
  const pushClassId = (value) => {
    const id = String(value || '').trim()
    if (!id || seen.has(id)) return
    seen.add(id)
    classIds.push(id)
  }

  pushClassId(profile.classId)
  if (Array.isArray(profile.classIds)) {
    for (const value of profile.classIds) {
      pushClassId(value)
    }
  }

  profile.classIds = classIds
  profile.classId = classIds[0] || null
  if (!profile.classId) {
    profile.className = null
  } else if (typeof profile.className === 'string') {
    const trimmed = profile.className.trim()
    profile.className = trimmed === '' ? null : trimmed
  }

  return profile
}

export function getProfileClassIds(profile) {
  if (!profile || typeof profile !== 'object') return []
  const normalized = ensureProfileClassMembership(profile)
  return Array.isArray(normalized.classIds) ? normalized.classIds : []
}

export function profileHasClass(profile, classId) {
  const target = String(classId || '').trim()
  if (!target) return false
  return getProfileClassIds(profile).includes(target)
}

export function addProfileToClassMembership(profile, classRecord) {
  if (!profile || typeof profile !== 'object') return false
  const classId = String(classRecord?.id || '').trim()
  if (!classId) return false

  ensureProfileClassMembership(profile)
  if (!Array.isArray(profile.classIds)) profile.classIds = []

  if (!profile.classIds.includes(classId)) {
    profile.classIds.push(classId)
  }

  const className = String(classRecord?.name || '').trim()
  if (!profile.classId) {
    profile.classId = classId
    profile.className = className || null
  } else if (profile.classId === classId && className) {
    profile.className = className
  }

  ensureProfileClassMembership(profile)
  return true
}

export function removeProfileFromClassMembership(profile, classId, classNameById = new Map()) {
  if (!profile || typeof profile !== 'object') return false
  const target = String(classId || '').trim()
  if (!target) return false

  ensureProfileClassMembership(profile)
  if (!Array.isArray(profile.classIds) || profile.classIds.length === 0) {
    profile.classId = null
    profile.className = null
    return false
  }

  const before = profile.classIds.length
  profile.classIds = profile.classIds.filter(id => id !== target)
  const changed = profile.classIds.length !== before
  if (!changed) return false

  if (profile.classIds.length === 0) {
    profile.classId = null
    profile.className = null
    return true
  }

  if (profile.classId === target || !profile.classIds.includes(profile.classId)) {
    const nextPrimary = profile.classIds[0]
    profile.classId = nextPrimary
    profile.className = classNameById.get(nextPrimary) || null
  }

  ensureProfileClassMembership(profile)
  return true
}

export function normalizeClassRecords(classes) {
  if (!Array.isArray(classes)) return []
  const normalized = []
  const seen = new Set()

  for (const record of classes) {
    if (!record || typeof record !== 'object') continue
    const classId = String(record.id || '').trim()
    if (!classId || seen.has(classId)) continue
    seen.add(classId)

    const className = String(record.name || '').trim() || classId
    const studentIds = Array.isArray(record.studentIds)
      ? Array.from(new Set(
        record.studentIds
          .map(studentId => normalizeStudentId(studentId))
          .filter(Boolean)
      ))
      : []

    normalized.push({
      ...record,
      id: classId,
      name: className,
      studentIds
    })
  }

  return normalized
}

export function areClassRecordListsEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false
  if (a.length !== b.length) return false

  for (let index = 0; index < a.length; index += 1) {
    const left = a[index]
    const right = b[index]
    if (!left || !right) return false
    if (String(left.id || '').trim() !== String(right.id || '').trim()) return false
    if (String(left.name || '').trim() !== String(right.name || '').trim()) return false

    const leftStudentIds = Array.isArray(left.studentIds) ? left.studentIds : []
    const rightStudentIds = Array.isArray(right.studentIds) ? right.studentIds : []
    if (leftStudentIds.length !== rightStudentIds.length) return false
    for (let i = 0; i < leftStudentIds.length; i += 1) {
      if (String(leftStudentIds[i] || '').trim() !== String(rightStudentIds[i] || '').trim()) {
        return false
      }
    }
  }

  return true
}

export function parseRosterLines(rawList) {
  return String(rawList || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
}

export function createUniqueStudentId(baseId, existingIds) {
  if (!existingIds.has(baseId)) {
    existingIds.add(baseId)
    return baseId
  }

  let counter = 2
  while (counter < 10000) {
    const candidate = `${baseId}_${counter}`
    if (!existingIds.has(candidate)) {
      existingIds.add(candidate)
      return candidate
    }
    counter += 1
  }

  throw new Error('Could not generate unique student id')
}
