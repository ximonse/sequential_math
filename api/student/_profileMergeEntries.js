const MAX_TABLE_COMPLETIONS = 1000
const MAX_TELEMETRY_EVENTS = 1200
const MAX_TELEMETRY_DAYS = 120
const MAX_TICKET_RESPONSES = 500
export function normalizeTimestamp(value) {
  const ts = Number(value)
  if (!Number.isFinite(ts) || ts <= 0) return 0
  return ts
}

export function getMaxTimestampFromEntries(entries, field = 'timestamp') {
  if (!Array.isArray(entries) || entries.length === 0) return 0
  let maxTs = 0
  for (const item of entries) {
    const ts = normalizeTimestamp(item?.[field])
    if (ts > maxTs) maxTs = ts
  }
  return maxTs
}

function stableSerialize(value) {
  if (value === null) return 'null'
  const type = typeof value
  if (type === 'number' || type === 'boolean' || type === 'string') {
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return `[${value.map(item => stableSerialize(item)).join(',')}]`
  }
  if (type === 'object') {
    const keys = Object.keys(value).sort()
    const parts = keys.map(key => `${JSON.stringify(key)}:${stableSerialize(value[key])}`)
    return `{${parts.join(',')}}`
  }
  return JSON.stringify(String(value))
}

function buildProblemEntryKey(entry) {
  const id = String(entry?.problemId || '').trim()
  if (id) return `id:${id}`

  const type = String(entry?.problemType || '').trim()
  const ts = normalizeTimestamp(entry?.timestamp)
  const studentAnswer = String(entry?.studentAnswer ?? '')
  const correctAnswer = String(entry?.correctAnswer ?? '')
  const values = stableSerialize(entry?.values || {})
  return `raw:${type}|${ts}|${studentAnswer}|${correctAnswer}|${values}`
}

export function mergeProblemEntries(existingEntries, incomingEntries, limit) {
  const mergedByKey = new Map()

  const upsert = (entry, sourceRank) => {
    if (!entry || typeof entry !== 'object') return
    const key = buildProblemEntryKey(entry)
    const ts = normalizeTimestamp(entry?.timestamp)
    const previous = mergedByKey.get(key)
    if (!previous) {
      mergedByKey.set(key, { entry, ts, sourceRank })
      return
    }
    if (ts > previous.ts || (ts === previous.ts && sourceRank >= previous.sourceRank)) {
      mergedByKey.set(key, { entry, ts, sourceRank })
    }
  }

  for (const entry of (Array.isArray(existingEntries) ? existingEntries : [])) {
    upsert(entry, 0)
  }
  for (const entry of (Array.isArray(incomingEntries) ? incomingEntries : [])) {
    upsert(entry, 1)
  }

  const merged = Array.from(mergedByKey.values())
    .map(item => item.entry)
    .sort((a, b) => normalizeTimestamp(a?.timestamp) - normalizeTimestamp(b?.timestamp))

  if (Number.isFinite(Number(limit)) && limit > 0 && merged.length > limit) {
    return merged.slice(-limit)
  }
  return merged
}

export function mergeTableDrill(existingTableDrill, incomingTableDrill) {
  const existing = existingTableDrill && typeof existingTableDrill === 'object' ? existingTableDrill : {}
  const incoming = incomingTableDrill && typeof incomingTableDrill === 'object' ? incomingTableDrill : {}
  const mergedByKey = new Map()

  const addCompletion = (completion) => {
    const table = Number(completion?.table)
    const ts = normalizeTimestamp(completion?.timestamp)
    if (!Number.isFinite(table) || table <= 0 || ts <= 0) return
    const key = `${table}|${ts}`
    if (!mergedByKey.has(key)) {
      mergedByKey.set(key, { table, timestamp: ts })
    }
  }

  for (const completion of (Array.isArray(existing.completions) ? existing.completions : [])) {
    addCompletion(completion)
  }
  for (const completion of (Array.isArray(incoming.completions) ? incoming.completions : [])) {
    addCompletion(completion)
  }

  const completions = Array.from(mergedByKey.values())
    .sort((a, b) => a.timestamp - b.timestamp)

  const trimmedCompletions = completions.length > MAX_TABLE_COMPLETIONS
    ? completions.slice(-MAX_TABLE_COMPLETIONS)
    : completions

  const existingBossDate = String(existing.dailyBossShownDate || '').trim()
  const incomingBossDate = String(incoming.dailyBossShownDate || '').trim()
  const dailyBossShownDate = [existingBossDate, incomingBossDate]
    .filter(Boolean)
    .sort()
    .slice(-1)[0] || null

  return {
    ...existing,
    ...incoming,
    completions: trimmedCompletions,
    dailyBossShownDate
  }
}

export function mergeTelemetry(existingTelemetry, incomingTelemetry) {
  const existing = existingTelemetry && typeof existingTelemetry === 'object' ? existingTelemetry : {}
  const incoming = incomingTelemetry && typeof incomingTelemetry === 'object' ? incomingTelemetry : {}
  const mergedEventsByKey = new Map()

  const addEvent = (event, sourceRank) => {
    if (!event || typeof event !== 'object') return
    const ts = normalizeTimestamp(event?.ts)
    const type = String(event?.type || '').trim()
    if (ts <= 0 || !type) return
    const payload = event?.payload && typeof event.payload === 'object' ? event.payload : {}
    const key = `${ts}|${type}|${stableSerialize(payload)}`
    const previous = mergedEventsByKey.get(key)
    if (!previous || sourceRank >= previous.sourceRank) {
      mergedEventsByKey.set(key, {
        event: { ts, type, payload },
        sourceRank
      })
    }
  }

  for (const event of (Array.isArray(existing.events) ? existing.events : [])) {
    addEvent(event, 0)
  }
  for (const event of (Array.isArray(incoming.events) ? incoming.events : [])) {
    addEvent(event, 1)
  }

  const events = Array.from(mergedEventsByKey.values())
    .map(item => item.event)
    .sort((a, b) => a.ts - b.ts)
  const trimmedEvents = events.length > MAX_TELEMETRY_EVENTS
    ? events.slice(-MAX_TELEMETRY_EVENTS)
    : events

  const existingDaily = existing.daily && typeof existing.daily === 'object' ? existing.daily : {}
  const incomingDaily = incoming.daily && typeof incoming.daily === 'object' ? incoming.daily : {}
  const dayKeys = Array.from(new Set([
    ...Object.keys(existingDaily),
    ...Object.keys(incomingDaily)
  ])).sort()
  const trimmedDayKeys = dayKeys.length > MAX_TELEMETRY_DAYS
    ? dayKeys.slice(-MAX_TELEMETRY_DAYS)
    : dayKeys

  const mergedDaily = {}
  for (const dayKey of trimmedDayKeys) {
    const existingBucket = existingDaily[dayKey] && typeof existingDaily[dayKey] === 'object'
      ? existingDaily[dayKey]
      : {}
    const incomingBucket = incomingDaily[dayKey] && typeof incomingDaily[dayKey] === 'object'
      ? incomingDaily[dayKey]
      : {}
    const metricKeys = new Set([...Object.keys(existingBucket), ...Object.keys(incomingBucket)])
    const mergedBucket = {}
    for (const metricKey of metricKeys) {
      const existingValue = Number(existingBucket[metricKey])
      const incomingValue = Number(incomingBucket[metricKey])
      if (Number.isFinite(existingValue) && Number.isFinite(incomingValue)) {
        mergedBucket[metricKey] = Math.max(existingValue, incomingValue)
      } else if (Number.isFinite(existingValue)) {
        mergedBucket[metricKey] = existingValue
      } else if (Number.isFinite(incomingValue)) {
        mergedBucket[metricKey] = incomingValue
      }
    }
    if (Object.keys(mergedBucket).length > 0) {
      mergedDaily[dayKey] = mergedBucket
    }
  }

  return {
    ...existing,
    ...incoming,
    events: trimmedEvents,
    daily: mergedDaily
  }
}

export function mergeTicketResponses(existingResponses, incomingResponses) {
  const mergedByKey = new Map()

  const upsert = (response, sourceRank) => {
    if (!response || typeof response !== 'object') return
    const dispatchId = String(response.dispatchId || '').trim()
    const key = dispatchId || stableSerialize(response)
    const answeredAt = normalizeTimestamp(response?.answeredAt)
    const previous = mergedByKey.get(key)
    if (!previous || answeredAt > previous.answeredAt || (answeredAt === previous.answeredAt && sourceRank >= previous.sourceRank)) {
      mergedByKey.set(key, { response, answeredAt, sourceRank })
    }
  }

  for (const response of (Array.isArray(existingResponses) ? existingResponses : [])) {
    upsert(response, 0)
  }
  for (const response of (Array.isArray(incomingResponses) ? incomingResponses : [])) {
    upsert(response, 1)
  }

  const merged = Array.from(mergedByKey.values())
    .map(item => item.response)
    .sort((a, b) => normalizeTimestamp(b?.answeredAt) - normalizeTimestamp(a?.answeredAt))

  return merged.length > MAX_TICKET_RESPONSES
    ? merged.slice(0, MAX_TICKET_RESPONSES)
    : merged
}

export function mergeTicketRevealAll(existingRevealMap, incomingRevealMap) {
  const existing = existingRevealMap && typeof existingRevealMap === 'object' ? existingRevealMap : {}
  const incoming = incomingRevealMap && typeof incomingRevealMap === 'object' ? incomingRevealMap : {}
  const merged = {}
  const keys = new Set([...Object.keys(existing), ...Object.keys(incoming)])
  for (const key of keys) {
    const left = normalizeTimestamp(existing[key])
    const right = normalizeTimestamp(incoming[key])
    const chosen = Math.max(left, right)
    if (chosen > 0) merged[key] = chosen
  }
  return merged
}

function getTicketInboxTimestamp(inbox) {
  if (!inbox || typeof inbox !== 'object') return 0
  return Math.max(
    normalizeTimestamp(inbox.updatedAt),
    normalizeTimestamp(inbox.publishedAt),
    normalizeTimestamp(inbox.clearedAt)
  )
}

export function mergeTicketInbox(existingInbox, incomingInbox) {
  const existing = existingInbox && typeof existingInbox === 'object' ? existingInbox : null
  const incoming = incomingInbox && typeof incomingInbox === 'object' ? incomingInbox : null
  if (!existing && !incoming) return null
  if (!existing) return incoming
  if (!incoming) return existing

  const existingTs = getTicketInboxTimestamp(existing)
  const incomingTs = getTicketInboxTimestamp(incoming)
  if (incomingTs > existingTs) return { ...existing, ...incoming }
  if (existingTs > incomingTs) return { ...incoming, ...existing }
  return { ...existing, ...incoming }
}

export function mergeActivity(existingActivity, incomingActivity) {
  const existing = existingActivity && typeof existingActivity === 'object' ? existingActivity : {}
  const incoming = incomingActivity && typeof incomingActivity === 'object' ? incomingActivity : {}
  const existingPresenceTs = normalizeTimestamp(existing.lastPresenceAt)
  const incomingPresenceTs = normalizeTimestamp(incoming.lastPresenceAt)
  const preferIncoming = incomingPresenceTs >= existingPresenceTs
  const fresher = preferIncoming ? incoming : existing
  const older = preferIncoming ? existing : incoming

  const createdAtCandidates = [normalizeTimestamp(existing.createdAt), normalizeTimestamp(incoming.createdAt)].filter(Boolean)
  const createdAt = createdAtCandidates.length > 0 ? Math.min(...createdAtCandidates) : Date.now()

  return {
    ...older,
    ...fresher,
    page: String(fresher.page || older.page || 'unknown'),
    inFocus: Boolean(fresher.inFocus),
    lastPresenceAt: Math.max(existingPresenceTs, incomingPresenceTs),
    lastInteractionAt: Math.max(
      normalizeTimestamp(existing.lastInteractionAt),
      normalizeTimestamp(incoming.lastInteractionAt)
    ),
    visibilityState: String(fresher.visibilityState || older.visibilityState || 'hidden'),
    createdAt
  }
}