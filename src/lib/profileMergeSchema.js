/**
 * Explicit merge-schema för elevprofiler.
 * Varje fält i profilen MÅSTE ha en definierad merge-strategi.
 * Om ett fält saknas i schemat → test failure → tvingar oss att tänka igenom merge.
 */

export const MERGE_SCHEMA = {
  enrollmentKey: { strategy: 'server_owned', description: 'Stable enrollment identity for safe retries' },
  serverRevision: { strategy: 'server_owned', description: 'CAS revision assigned only by the server' },
  serverUpdatedAt: { strategy: 'server_owned', description: 'Last acknowledged server write' },
  // Identitet
  profileSchemaVersion: { strategy: 'keep_existing', description: 'Current persisted profile contract version' },
  studentId:         { strategy: 'keep_existing', description: 'Normaliserat ID, ändras aldrig' },
  name:              { strategy: 'server_owned', description: 'Enrollment identity; training snapshots cannot rename pupils' },
  grade:             { strategy: 'server_owned', description: 'Enrollment grade; training snapshots cannot change it' },
  created_at:        { strategy: 'min', description: 'Äldsta tidsstämpel behålls' },

  // Svårighetsgrad
  currentDifficulty: { strategy: 'max_clamped', description: 'Max av alla, minimum 1' },
  highestDifficulty: { strategy: 'max', description: 'Max av alla candidates' },

  // Adaptiv motor
  adaptive:          { strategy: 'custom', handler: 'mergeAdaptive', description: 'operationAbilities tar max, skillStates tar version med flest försök' },

  // Aktivitetsspårning
  activity:          { strategy: 'custom', handler: 'mergeActivity', description: 'Senaste presence/interaction vinner' },

  // Mastery (append-only)
  masteryFacts:      { strategy: 'union_append', handler: 'mergeMasteryFacts', description: 'Union av facts, dedup per op+level, union av revokedIds' },

  // Problemlogg
  problemLog:        { strategy: 'dedup_union', limit: 5000, description: 'Dedup + union, trimmas till 5000' },
  recentProblems:    { strategy: 'dedup_union', limit: 250, description: 'Dedup + union, trimmas till 250' },

  // Statistik
  stats:             { strategy: 'derive_from_log', handler: 'mergeStats', description: 'Beräknas från mergade loggar' },

  // Derived data
  teacherSummary:    { strategy: 'derive_from_log', handler: 'deriveTeacherSummary', description: 'Computed from the merged full problem log' },
  effectiveLevels:   { strategy: 'removed', description: 'Borttagen dubblett av teacherSummary.effectiveLevels' },

  // Tabellträning
  tableDrill:        { strategy: 'custom', handler: 'mergeTableDrill', description: 'Union av completions' },

  // Telemetri
  telemetry:         { strategy: 'custom', handler: 'mergeTelemetry', description: 'Max av räknare, senaste timestamp' },

  // Biljetter (gamification)
  ticketResponses:   { strategy: 'custom', handler: 'mergeTicketResponses', description: 'Union av biljett-svar' },
  ticketRevealAll:   { strategy: 'server_owned', description: 'Changed only by version-checked teacher PATCH' },
  ticketInbox:       { strategy: 'server_owned', description: 'Changed only by version-checked teacher PATCH' },

  // Auth
  auth:              { strategy: 'custom', handler: 'mergeAuth', description: 'Hashed lösenord, föredra nyare' },

  // Klassmedlemskap
  classId:           { strategy: 'server_owned', description: 'Primary class; enrollment and deletion own changes' },
  classIds:          { strategy: 'server_owned', description: 'Membership; never restored from training snapshots' },
  className:         { strategy: 'server_owned', description: 'Primary class label' },

  // Spel-highscores
  pongHighScore:     { strategy: 'max', description: 'Högsta pong-poäng' },
  recentSelections:  { strategy: 'prefer_fresher', description: 'Senaste val i adaptiva motorn' },
}

/**
 * Hämta alla definierade profilfält.
 */
export function getSchemaFields() {
  return Object.keys(MERGE_SCHEMA)
}

/**
 * Kolla om ett fält har definierad merge-strategi.
 */
export function hasFieldStrategy(fieldName) {
  return fieldName in MERGE_SCHEMA
}

/**
 * Hitta fält som saknar merge-strategi.
 */
export function findUndefinedFields(profileKeys) {
  return profileKeys.filter(key => !hasFieldStrategy(key))
}
