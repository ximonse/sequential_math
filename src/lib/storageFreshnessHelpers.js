const DEFAULT_FUTURE_TOLERANCE_MS = 5 * 60 * 1000

function normalizeFreshnessTimestamp(value, now = Date.now(), futureToleranceMs = DEFAULT_FUTURE_TOLERANCE_MS) {
  const ts = Number(value)
  if (!Number.isFinite(ts) || ts <= 0) return 0
  if (ts > (now + futureToleranceMs)) return 0
  return Math.min(ts, now)
}

function getMaxTimestampFromEntries(entries, now = Date.now(), futureToleranceMs = DEFAULT_FUTURE_TOLERANCE_MS) {
  if (!Array.isArray(entries) || entries.length === 0) return 0
  let maxTs = 0
  for (const entry of entries) {
    const ts = normalizeFreshnessTimestamp(entry?.timestamp, now, futureToleranceMs)
    if (ts > maxTs) maxTs = ts
  }
  return maxTs
}

function getLastProblemTimestamp(profile, now = Date.now(), futureToleranceMs = DEFAULT_FUTURE_TOLERANCE_MS) {
  const fromRecent = getMaxTimestampFromEntries(profile?.recentProblems, now, futureToleranceMs)
  const fromProblemLog = getMaxTimestampFromEntries(profile?.problemLog, now, futureToleranceMs)
  return Math.max(fromRecent, fromProblemLog)
}

function getLastTableCompletionTimestamp(profile, now = Date.now(), futureToleranceMs = DEFAULT_FUTURE_TOLERANCE_MS) {
  const completions = profile?.tableDrill?.completions
  if (!Array.isArray(completions) || completions.length === 0) return 0
  let maxTs = 0
  for (const item of completions) {
    const ts = normalizeFreshnessTimestamp(item?.timestamp, now, futureToleranceMs)
    if (ts > maxTs) maxTs = ts
  }
  return maxTs
}

function getLastPresenceSignalTimestamp(profile, now = Date.now(), futureToleranceMs = DEFAULT_FUTURE_TOLERANCE_MS) {
  const activity = profile?.activity && typeof profile.activity === 'object'
    ? profile.activity
    : {}
  return Math.max(
    normalizeFreshnessTimestamp(activity.lastPresenceAt, now, futureToleranceMs),
    normalizeFreshnessTimestamp(activity.lastInteractionAt, now, futureToleranceMs)
  )
}

function getLastLoginSignalTimestamp(profile, now = Date.now(), futureToleranceMs = DEFAULT_FUTURE_TOLERANCE_MS) {
  return normalizeFreshnessTimestamp(profile?.auth?.lastLoginAt, now, futureToleranceMs)
}

function getProblemCountSignal(profile) {
  const recentCount = Array.isArray(profile?.recentProblems) ? profile.recentProblems.length : 0
  const logCount = Array.isArray(profile?.problemLog) ? profile.problemLog.length : 0
  const lifetimeCount = Number(profile?.stats?.lifetimeProblems ?? profile?.stats?.totalProblems ?? 0)
  const normalizedLifetime = Number.isFinite(lifetimeCount) ? Math.max(0, lifetimeCount) : 0
  return Math.max(recentCount, logCount, normalizedLifetime)
}

function getTableCompletionCountSignal(profile) {
  const completions = profile?.tableDrill?.completions
  if (!Array.isArray(completions)) return 0
  return completions.length
}

function getLastTicketSignalTimestamp(profile, now = Date.now(), futureToleranceMs = DEFAULT_FUTURE_TOLERANCE_MS) {
  const inbox = profile?.ticketInbox && typeof profile.ticketInbox === 'object'
    ? profile.ticketInbox
    : null
  const inboxTs = Math.max(
    normalizeFreshnessTimestamp(inbox?.updatedAt, now, futureToleranceMs),
    normalizeFreshnessTimestamp(inbox?.publishedAt, now, futureToleranceMs),
    normalizeFreshnessTimestamp(inbox?.clearedAt, now, futureToleranceMs)
  )

  const responses = Array.isArray(profile?.ticketResponses) ? profile.ticketResponses : []
  let responseTs = 0
  for (const item of responses) {
    const ts = normalizeFreshnessTimestamp(item?.answeredAt, now, futureToleranceMs)
    if (ts > responseTs) responseTs = ts
  }

  return Math.max(inboxTs, responseTs)
}

function getProfileFreshnessTimestamp(profile, now = Date.now(), futureToleranceMs = DEFAULT_FUTURE_TOLERANCE_MS) {
  return Math.max(
    getLastTicketSignalTimestamp(profile, now, futureToleranceMs),
    getLastProblemTimestamp(profile, now, futureToleranceMs),
    getLastTableCompletionTimestamp(profile, now, futureToleranceMs),
    getLastPresenceSignalTimestamp(profile, now, futureToleranceMs),
    getLastLoginSignalTimestamp(profile, now, futureToleranceMs)
  )
}

export function chooseFreshestProfile(localProfile, cloudProfile, options = {}) {
  const futureToleranceMs = Number.isFinite(Number(options.futureToleranceMs))
    ? Math.max(0, Number(options.futureToleranceMs))
    : DEFAULT_FUTURE_TOLERANCE_MS
  const getProfileClassIds = typeof options.getProfileClassIds === 'function'
    ? options.getProfileClassIds
    : () => []

  const now = Date.now()
  const localFreshness = getProfileFreshnessTimestamp(localProfile, now, futureToleranceMs)
  const cloudFreshness = getProfileFreshnessTimestamp(cloudProfile, now, futureToleranceMs)
  if (cloudFreshness > localFreshness) return cloudProfile
  if (cloudFreshness < localFreshness) return localProfile

  const localProblemCount = getProblemCountSignal(localProfile)
  const cloudProblemCount = getProblemCountSignal(cloudProfile)
  if (cloudProblemCount > localProblemCount) return cloudProfile
  if (cloudProblemCount < localProblemCount) return localProfile

  const localTableCompletions = getTableCompletionCountSignal(localProfile)
  const cloudTableCompletions = getTableCompletionCountSignal(cloudProfile)
  if (cloudTableCompletions > localTableCompletions) return cloudProfile
  if (cloudTableCompletions < localTableCompletions) return localProfile

  const localPwdTs = Number(localProfile?.auth?.passwordUpdatedAt || 0)
  const cloudPwdTs = Number(cloudProfile?.auth?.passwordUpdatedAt || 0)
  if (cloudPwdTs > localPwdTs) return cloudProfile
  if (cloudPwdTs < localPwdTs) return localProfile

  const localClassCount = getProfileClassIds(localProfile).length
  const cloudClassCount = getProfileClassIds(cloudProfile).length
  if (cloudClassCount > localClassCount) return cloudProfile
  if (cloudClassCount < localClassCount) return localProfile

  if (!localProfile?.classId && cloudProfile?.classId) return cloudProfile
  if (!localProfile?.className && cloudProfile?.className) return cloudProfile
  return localProfile
}
