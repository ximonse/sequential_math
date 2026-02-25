export function formatSyncTimestamp(value) {
  const ts = Number(value)
  if (!Number.isFinite(ts) || ts <= 0) return '-'
  return new Date(ts).toLocaleString('sv-SE')
}

export function getCloudSyncSourceLabel(source) {
  switch (String(source || '').trim()) {
    case 'cloud_disabled':
      return 'Cloud-sync avstängd'
    case 'cloud_merged':
      return 'Cloud + lokal sammanslagning'
    case 'cloud_unauthorized':
      return 'Lokal fallback (obehörig mot server)'
    case 'cloud_http_error':
      return 'Lokal fallback (serverfel)'
    case 'cloud_fetch_error':
      return 'Lokal fallback (nätverksfel)'
    case 'never':
      return 'Ingen cloud-hämtning gjord än'
    default:
      return 'Lokal data'
  }
}

export function buildCloudSyncStatusMessage(status) {
  if (!status || typeof status !== 'object') return 'Serverhämtning klar.'
  const sourceLabel = getCloudSyncSourceLabel(status.lastSource)
  const mergedCount = Number(status.mergedCount) || 0
  if (status.lastError) {
    return `Serverhämtning: ${sourceLabel}. Visar ${mergedCount} elever. Fel: ${status.lastError}`
  }
  return `Serverhämtning: ${sourceLabel}. Visar ${mergedCount} elever.`
}

export function shouldTeacherAutoRefreshNow(now = Date.now(), startHour = 8, endHour = 15) {
  if (typeof document === 'undefined') return false
  if (document.visibilityState !== 'visible') return false
  if (typeof document.hasFocus === 'function' && !document.hasFocus()) return false
  const hour = new Date(now).getHours()
  return hour >= startHour && hour < endHour
}

export function buildClassFilterOptions(classes, students) {
  const byId = new Map()

  const upsert = (rawId, rawName, priority) => {
    const id = String(rawId || '').trim()
    if (!id) return

    const nameCandidate = String(rawName || '').trim()
    const nextName = nameCandidate || id
    const existing = byId.get(id)
    if (!existing) {
      byId.set(id, { id, name: nextName, priority })
      return
    }

    if ((!existing.name || existing.name === existing.id) && nameCandidate) {
      existing.name = nameCandidate
    }
    if (priority < existing.priority) {
      existing.priority = priority
    }
  }

  for (const classRecord of Array.isArray(classes) ? classes : []) {
    upsert(classRecord?.id, classRecord?.name, 0)
  }

  for (const student of Array.isArray(students) ? students : []) {
    const classIds = getRecordClassIds(student)
    for (const classId of classIds) {
      const isPrimary = String(student?.classId || '').trim() === classId
      const inferredName = isPrimary ? String(student?.className || '').trim() : ''
      upsert(classId, inferredName, 1)
    }
  }

  return Array.from(byId.values())
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority
      const nameCompare = String(a.name || '').localeCompare(String(b.name || ''), 'sv')
      if (nameCompare !== 0) return nameCompare
      return String(a.id || '').localeCompare(String(b.id || ''), 'sv')
    })
    .map(item => ({ id: item.id, name: item.name }))
}

export function getRecordClassIds(record) {
  if (!record || typeof record !== 'object') return []
  const seen = new Set()
  const ids = []
  const add = (value) => {
    const id = String(value || '').trim()
    if (!id || seen.has(id)) return
    seen.add(id)
    ids.push(id)
  }

  add(record.classId)
  if (Array.isArray(record.classIds)) {
    for (const value of record.classIds) {
      add(value)
    }
  }

  return ids
}

export function resolveClassNames(classIds, classNameById = new Map(), fallbackClassName = '') {
  const names = []
  const seen = new Set()

  for (const classId of classIds || []) {
    const fromMap = String(classNameById.get(classId) || '').trim()
    if (fromMap && !seen.has(fromMap)) {
      seen.add(fromMap)
      names.push(fromMap)
    }
  }

  const fallback = String(fallbackClassName || '').trim()
  if (fallback && !seen.has(fallback)) {
    names.push(fallback)
  }

  return names
}

export function getRecordClassLabel(record, classNameById = new Map()) {
  const classIds = getRecordClassIds(record)
  const names = resolveClassNames(classIds, classNameById, record?.className || '')
  if (names.length === 0) return ''
  return names.join(', ')
}

export function recordMatchesClassFilter(record, selectedClassIds) {
  const selected = Array.isArray(selectedClassIds) ? selectedClassIds.filter(Boolean) : []
  if (selected.length === 0) return true
  const ids = getRecordClassIds(record)
  if (ids.length === 0) return false
  const selectedSet = new Set(selected)
  return ids.some(id => selectedSet.has(id))
}

export function getPresetConfig(presetKey) {
  if (presetKey === 'addition') {
    return {
      title: 'Addition nivå 1-8',
      problemTypes: ['addition'],
      minLevel: 1,
      maxLevel: 8,
      targetCount: 20
    }
  }

  if (presetKey === 'multiplication') {
    return {
      title: 'Multiplikation nivå 3-10',
      problemTypes: ['multiplication'],
      minLevel: 3,
      maxLevel: 10,
      targetCount: 20
    }
  }

  if (presetKey === 'subtraction') {
    return {
      title: 'Subtraktion nivå 1-8',
      problemTypes: ['subtraction'],
      minLevel: 1,
      maxLevel: 8,
      targetCount: 20
    }
  }

  if (presetKey === 'division') {
    return {
      title: 'Division nivå 3-10',
      problemTypes: ['division'],
      minLevel: 3,
      maxLevel: 10,
      targetCount: 18
    }
  }

  return {
    title: 'Kombination nivå 2-10',
    problemTypes: ['addition', 'subtraction', 'multiplication', 'division'],
    minLevel: 2,
    maxLevel: 10,
    targetCount: 25
  }
}

export function getStartOfDayTimestamp() {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return now.getTime()
}

export function getInactiveDays(lastActive) {
  if (!lastActive) return Infinity
  return (Date.now() - lastActive) / (24 * 60 * 60 * 1000)
}

export function getProblemLevel(problem) {
  const fromTarget = Number(problem?.targetLevel)
  if (Number.isFinite(fromTarget)) return fromTarget

  const fromDifficulty = Number(problem?.difficulty?.conceptual_level)
  if (Number.isFinite(fromDifficulty)) return fromDifficulty

  return null
}
