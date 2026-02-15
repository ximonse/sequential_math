const MAX_TELEMETRY_EVENTS = 1200
const MAX_TELEMETRY_DAYS = 120
const DAY_MS = 24 * 60 * 60 * 1000

export function ensureTelemetry(profile) {
  if (!profile || typeof profile !== 'object') return null

  if (!profile.telemetry || typeof profile.telemetry !== 'object') {
    profile.telemetry = {
      events: [],
      daily: {}
    }
  }

  if (!Array.isArray(profile.telemetry.events)) {
    profile.telemetry.events = []
  }

  if (!profile.telemetry.daily || typeof profile.telemetry.daily !== 'object') {
    profile.telemetry.daily = {}
  }

  return profile.telemetry
}

export function recordTelemetryEvent(profile, type, payload = {}, timestamp = Date.now()) {
  const telemetry = ensureTelemetry(profile)
  if (!telemetry) return null

  const normalizedType = String(type || '').trim()
  if (!normalizedType) return null

  const ts = Number.isFinite(Number(timestamp)) ? Number(timestamp) : Date.now()
  const event = {
    ts,
    type: normalizedType,
    payload: sanitizePayload(payload)
  }

  telemetry.events.push(event)
  if (telemetry.events.length > MAX_TELEMETRY_EVENTS) {
    telemetry.events.splice(0, telemetry.events.length - MAX_TELEMETRY_EVENTS)
  }

  return event
}

export function incrementTelemetryDailyMetric(profile, metricKey, amount = 1, timestamp = Date.now()) {
  return adjustTelemetryDailyMetric(profile, metricKey, amount, timestamp)
}

export function addTelemetryDurationMs(profile, metricKey, millis = 0, timestamp = Date.now()) {
  return adjustTelemetryDailyMetric(profile, metricKey, millis, timestamp)
}

export function summarizeTelemetryWindow(profile, options = {}) {
  const telemetry = ensureTelemetry(profile)
  if (!telemetry) return createEmptySummary()

  const now = Number.isFinite(Number(options.now)) ? Number(options.now) : Date.now()
  const todayKey = getDayKey(now)
  const weekStart = startOfDayTs(now - (6 * DAY_MS))
  const monthStart = startOfDayTs(now - (29 * DAY_MS))

  let week = createEmptySummary()
  let month = createEmptySummary()

  for (const [dayKey, values] of Object.entries(telemetry.daily)) {
    const dayTs = dayKeyToTs(dayKey)
    if (!Number.isFinite(dayTs)) continue
    const bucket = normalizeDailyBucket(values)

    if (dayKey === todayKey) {
      week = mergeSummary(week, bucket)
      month = mergeSummary(month, bucket)
      continue
    }

    if (dayTs >= weekStart && dayTs <= now) {
      week = mergeSummary(week, bucket)
    }
    if (dayTs >= monthStart && dayTs <= now) {
      month = mergeSummary(month, bucket)
    }
  }

  return {
    today: normalizeDailyBucket(telemetry.daily[todayKey]),
    week,
    month
  }
}

function adjustTelemetryDailyMetric(profile, metricKey, delta, timestamp) {
  const telemetry = ensureTelemetry(profile)
  if (!telemetry) return null

  const key = String(metricKey || '').trim()
  if (!key) return null

  const numericDelta = Number(delta)
  if (!Number.isFinite(numericDelta) || numericDelta === 0) return null

  const ts = Number.isFinite(Number(timestamp)) ? Number(timestamp) : Date.now()
  const dayKey = getDayKey(ts)
  const bucket = normalizeDailyBucket(telemetry.daily[dayKey])
  bucket[key] = Number(bucket[key] || 0) + numericDelta
  telemetry.daily[dayKey] = bucket
  trimDailyBuckets(telemetry.daily, ts)
  return bucket[key]
}

function trimDailyBuckets(daily, nowTs) {
  const threshold = startOfDayTs(nowTs - (MAX_TELEMETRY_DAYS * DAY_MS))
  for (const key of Object.keys(daily)) {
    const ts = dayKeyToTs(key)
    if (!Number.isFinite(ts) || ts < threshold) {
      delete daily[key]
    }
  }
}

function sanitizePayload(payload) {
  if (!payload || typeof payload !== 'object') return {}
  const out = {}
  for (const [key, value] of Object.entries(payload)) {
    const normalizedKey = String(key || '').trim()
    if (!normalizedKey) continue
    if (value === null) {
      out[normalizedKey] = null
      continue
    }
    const valueType = typeof value
    if (valueType === 'string' || valueType === 'number' || valueType === 'boolean') {
      out[normalizedKey] = value
      continue
    }
    if (Array.isArray(value)) {
      out[normalizedKey] = value
        .map(item => (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean'
          ? item
          : null))
        .filter(item => item !== null)
      continue
    }
    if (valueType === 'object') {
      out[normalizedKey] = sanitizePayload(value)
    }
  }
  return out
}

function normalizeDailyBucket(value) {
  const out = {}
  if (!value || typeof value !== 'object') return out
  for (const [key, entry] of Object.entries(value)) {
    const n = Number(entry)
    if (!Number.isFinite(n)) continue
    out[key] = n
  }
  return out
}

function createEmptySummary() {
  return {}
}

function mergeSummary(base, patch) {
  const next = { ...base }
  for (const [key, value] of Object.entries(patch || {})) {
    const n = Number(value)
    if (!Number.isFinite(n)) continue
    next[key] = Number(next[key] || 0) + n
  }
  return next
}

function getDayKey(timestamp) {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function dayKeyToTs(dayKey) {
  if (typeof dayKey !== 'string') return NaN
  const ts = Date.parse(`${dayKey}T00:00:00`)
  return Number.isFinite(ts) ? ts : NaN
}

function startOfDayTs(timestamp) {
  const d = new Date(timestamp)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}
