// Presence uses the existing activity/telemetry snapshots, but must not move
// the mathematics checkpoint clock. Each field also keeps its own ordering.
export const PRESENCE_CHECKPOINT_FIELDS = ['activity', 'telemetry']

export function validPresenceCheckpoint(payload) {
  const record = value => value && typeof value === 'object' && !Array.isArray(value)
  return Boolean(record(payload) && Number.isFinite(payload.capturedAt) && payload.capturedAt > 0
    && Object.keys(payload).every(key => key === 'capturedAt' || PRESENCE_CHECKPOINT_FIELDS.includes(key))
    && PRESENCE_CHECKPOINT_FIELDS.some(field => payload[field] !== undefined)
    && PRESENCE_CHECKPOINT_FIELDS.every(field => payload[field] === undefined || record(payload[field])))
}

export function applyPresenceCheckpoint(profile, payload) {
  const clocks = Object.fromEntries(PRESENCE_CHECKPOINT_FIELDS.map(field =>
    [field, Number(profile.pilotPresenceFieldsAt?.[field] ?? profile.pilotCheckpointAt ?? 0)]))
  let changed = false
  for (const field of PRESENCE_CHECKPOINT_FIELDS) {
    if (payload[field] === undefined) continue
    // Legacy profiles have only the full-checkpoint clock. Retain its ordering
    // until a presence-capable writer records an explicit field clock.
    const previous = clocks[field]
    if (payload.capturedAt <= previous) continue
    profile[field] = structuredClone(payload[field])
    clocks[field] = payload.capturedAt
    changed = true
  }
  // Seed omitted fields before a full checkpoint advances its global clock.
  profile.pilotPresenceFieldsAt = clocks
  return changed
}
