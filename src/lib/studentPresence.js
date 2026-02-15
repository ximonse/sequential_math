export const PRESENCE_ENGAGED_WINDOW_MS = 2 * 60 * 1000
export const PRESENCE_IDLE_FOCUS_WINDOW_MS = 4 * 60 * 1000
export const PRESENCE_FOCUS_STALE_MS = 90 * 1000
export const PRESENCE_HEARTBEAT_MS = 30 * 1000
export const PRESENCE_SAVE_THROTTLE_MS = 12 * 1000

export function ensureStudentActivity(profile, now = Date.now()) {
  if (!profile || typeof profile !== 'object') return null
  if (!profile.activity || typeof profile.activity !== 'object') {
    profile.activity = {
      page: 'unknown',
      inFocus: false,
      lastPresenceAt: 0,
      lastInteractionAt: 0,
      visibilityState: 'hidden',
      createdAt: now
    }
  }
  return profile.activity
}

export function markStudentPresence(profile, options = {}) {
  if (!profile || typeof profile !== 'object') return null

  const now = Number.isFinite(Number(options.now)) ? Number(options.now) : Date.now()
  const activity = ensureStudentActivity(profile, now)
  if (!activity) return null

  const inFocus = typeof options.inFocus === 'boolean'
    ? options.inFocus
    : detectInFocus()

  activity.page = typeof options.page === 'string' && options.page.trim() !== ''
    ? options.page
    : (activity.page || 'unknown')
  activity.inFocus = inFocus
  activity.lastPresenceAt = now
  if (options.interaction === true) {
    activity.lastInteractionAt = now
  } else if (!Number.isFinite(Number(activity.lastInteractionAt))) {
    activity.lastInteractionAt = 0
  }
  activity.visibilityState = detectVisibilityState(inFocus)

  return activity
}

export function getStudentPresenceStatus(student, options = {}) {
  const now = Number.isFinite(Number(options.now)) ? Number(options.now) : Date.now()
  const startToday = Number.isFinite(Number(options.startToday))
    ? Number(options.startToday)
    : getStartOfDayTimestamp()
  const engagedWindowMs = Number.isFinite(Number(options.engagedWindowMs))
    ? Number(options.engagedWindowMs)
    : PRESENCE_ENGAGED_WINDOW_MS
  const idleFocusWindowMs = Number.isFinite(Number(options.idleFocusWindowMs))
    ? Number(options.idleFocusWindowMs)
    : PRESENCE_IDLE_FOCUS_WINDOW_MS
  const focusStaleMs = Number.isFinite(Number(options.focusStaleMs))
    ? Number(options.focusStaleMs)
    : PRESENCE_FOCUS_STALE_MS

  const activity = student?.activity && typeof student.activity === 'object'
    ? student.activity
    : {}

  const lastLoginAt = Number(student?.auth?.lastLoginAt || 0)
  const lastPresenceAt = Number(activity.lastPresenceAt || 0)
  const lastInteractionAt = Number(activity.lastInteractionAt || 0)
  const inFocus = Boolean(activity.inFocus)
  const page = String(activity.page || '')

  const seenToday = lastLoginAt >= startToday || lastPresenceAt >= startToday
  if (!seenToday) {
    return createPresenceStatus('red', {
      page,
      inFocus,
      lastPresenceAt,
      lastInteractionAt
    })
  }

  const focusSignalFresh = inFocus && lastPresenceAt > 0 && (now - lastPresenceAt) <= focusStaleMs
  const sinceInteractionMs = lastInteractionAt > 0 ? Math.max(0, now - lastInteractionAt) : Infinity

  if (focusSignalFresh) {
    if (sinceInteractionMs <= engagedWindowMs) {
      return createPresenceStatus('green', {
        page,
        inFocus,
        lastPresenceAt,
        lastInteractionAt
      })
    }
    if (sinceInteractionMs <= idleFocusWindowMs) {
      return createPresenceStatus('orange', {
        page,
        inFocus,
        lastPresenceAt,
        lastInteractionAt
      })
    }
  }

  return createPresenceStatus('black', {
    page,
    inFocus,
    lastPresenceAt,
    lastInteractionAt
  })
}

function createPresenceStatus(code, extras = {}) {
  const label = code === 'green'
    ? 'Grön'
    : code === 'orange'
      ? 'Orange'
      : code === 'black'
        ? 'Svart'
        : 'Röd'

  return {
    code,
    label,
    ...extras
  }
}

function detectInFocus() {
  if (typeof document === 'undefined') return false
  const visible = document.visibilityState === 'visible'
  const focused = typeof document.hasFocus === 'function' ? document.hasFocus() : true
  return visible && focused
}

function detectVisibilityState(inFocus) {
  if (typeof document === 'undefined') return inFocus ? 'visible' : 'hidden'
  return document.visibilityState || (inFocus ? 'visible' : 'hidden')
}

function getStartOfDayTimestamp() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today.getTime()
}
